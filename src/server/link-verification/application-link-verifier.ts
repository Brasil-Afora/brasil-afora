import "server-only";

import { and, desc, eq } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import type { schema } from "@/db/schema";
import {
  applicationLinkAssessments,
  applicationRounds,
  auditEvents,
  editions,
  organizations,
  programs,
  reviewTasks,
} from "@/db/schema/ingestion";
import { checkRobotsAllowed } from "./robots-policy";
import {
  createSafeHttpClient,
  type SafeHttpClient,
  SafeHttpError,
  type SafeHttpResponse,
} from "./safe-http";

type Database = NodePgDatabase<typeof schema>;
type LinkAssessment = typeof applicationLinkAssessments.$inferInsert;
type LinkStatus = NonNullable<LinkAssessment["status"]>;

const OPEN_LANGUAGE = [
  "applications are open",
  "apply now",
  "candidaturas abertas",
  "inscricoes abertas",
  "inscreva-se",
  "inscrever-se",
];
const CLOSED_LANGUAGE = [
  "application period has ended",
  "applications are closed",
  "applications closed",
  "candidaturas encerradas",
  "formulario encerrado",
  "inscricoes encerradas",
  "prazo encerrado",
];
const UPCOMING_LANGUAGE = [
  "applications open on",
  "candidaturas abrem",
  "coming soon",
  "em breve",
  "inscricoes ainda nao abertas",
  "inscricoes abrem",
];
const RESULTS_LANGUAGE = [
  "final result",
  "lista de aprovados",
  "lista de selecionados",
  "resultado final",
  "resultados",
  "selected candidates",
];
const LOGIN_LANGUAGE = [
  "acesse sua conta",
  "entrar na conta",
  "faca login",
  "login",
  "sign in",
];
const FORM_PATTERN = /<form\b/i;
const FORM_INPUT_PATTERN = /<(?:input|select|textarea)\b/i;
// Every tag-scanning pattern below stops at the next "<" as well as at ">".
// Pages are untrusted and up to 512 KB; with "[^>]*", a page of unclosed tags
// makes each tag start rescan to the end of the document — quadratic, minutes
// of uninterruptible CPU inside the web process. "[^<>]*" bounds every scan by
// the distance to the next tag start, which keeps the total linear.
const BUTTON_SUBMIT_PATTERN = /<button\b[^<>]*type\s*=\s*["']?submit/i;
const INPUT_SUBMIT_PATTERN = /<input\b[^<>]*type\s*=\s*["']?submit/i;
const PASSWORD_INPUT_PATTERN = /<input\b[^<>]*type\s*=\s*["']?password\b/i;
const TAG_PATTERN = /<[^<>]*>/g;
const SCRIPT_OPEN_PATTERN = /<script\b/gi;
const SCRIPT_CLOSE_PATTERN = /<\/script\s*>/gi;
const STYLE_OPEN_PATTERN = /<style\b/gi;
const STYLE_CLOSE_PATTERN = /<\/style\s*>/gi;
const WWW_PREFIX_PATTERN = /^www\./;
const APPLICATION_PATH_PATTERN =
  /apply|application|candidat|inscri|formulario|register/;

/**
 * Remove every `<tag …>…</tag>` element in one forward pass.
 *
 * A lazy "[\s\S]*?" regex rescans to the end of the document from every
 * unclosed opening tag, which is quadratic on a hostile page. This scans
 * forward only: an unclosed element swallows the rest of the document, as a
 * browser would treat it.
 */
const stripElements = (html: string, open: RegExp, close: RegExp): string => {
  let result = "";
  let cursor = 0;
  for (;;) {
    open.lastIndex = cursor;
    const start = open.exec(html);
    if (!start) {
      return result + html.slice(cursor);
    }
    result += `${html.slice(cursor, start.index)} `;
    close.lastIndex = start.index;
    const end = close.exec(html);
    if (!end) {
      return result;
    }
    cursor = end.index + end[0].length;
  }
};

const normalizedText = (html: string): string =>
  stripElements(
    stripElements(html, SCRIPT_OPEN_PATTERN, SCRIPT_CLOSE_PATTERN),
    STYLE_OPEN_PATTERN,
    STYLE_CLOSE_PATTERN
  )
    .replace(TAG_PATTERN, " ")
    .replace(/&nbsp;|&#160;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/\s+/g, " ")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();

const containsAny = (text: string, candidates: string[]): boolean =>
  candidates.some((candidate) => text.includes(candidate));

const hasApplicationForm = (html: string): boolean => {
  const normalized = html.toLowerCase();
  const hasForm = FORM_PATTERN.test(normalized);
  const hasInput = FORM_INPUT_PATTERN.test(normalized);
  const hasSubmit =
    BUTTON_SUBMIT_PATTERN.test(normalized) ||
    INPUT_SUBMIT_PATTERN.test(normalized);
  return hasForm && hasInput && hasSubmit;
};

const hasPasswordInput = (html: string): boolean =>
  PASSWORD_INPUT_PATTERN.test(html);

const yearsIn = (value: string): number[] =>
  [...value.matchAll(/\b20\d{2}\b/g)].map((match) => Number(match[0]));

export interface ApplicationPageClassification {
  acceptsSubmissions: boolean | null;
  documentRole: string;
  editionYear: number | null;
  reasons: string[];
  status: LinkStatus;
}

// biome-ignore-start lint/complexity/noExcessiveCognitiveComplexity: Ordered semantic checks intentionally preserve the evidence hierarchy for exclusive link states.
export const classifyApplicationPage = ({
  expectedEditionYear,
  officialDomains,
  originalUrl,
  response,
}: {
  expectedEditionYear: number | null;
  officialDomains: string[];
  originalUrl: string;
  response: SafeHttpResponse;
}): ApplicationPageClassification => {
  const reasons: string[] = [`HTTP ${response.status}`];
  if (response.status === 401) {
    return {
      acceptsSubmissions: false,
      documentRole: "login_wall",
      editionYear: null,
      reasons: [
        ...reasons,
        "Authentication is required before page inspection",
      ],
      status: "login_only",
    };
  }
  if (response.status === 403 || response.status === 429) {
    return {
      acceptsSubmissions: null,
      documentRole: "error_page",
      editionYear: null,
      reasons: [...reasons, "The server blocked or rate-limited inspection"],
      status: "blocked",
    };
  }
  if (response.status < 200 || response.status >= 400) {
    return {
      acceptsSubmissions: false,
      documentRole: "error_page",
      editionYear: null,
      reasons: [...reasons, "The target did not return a usable page"],
      status: "broken",
    };
  }

  const contentType = response.headers["content-type"]?.toLowerCase() ?? "";
  if (
    contentType &&
    !contentType.includes("html") &&
    !contentType.includes("text/plain")
  ) {
    return {
      acceptsSubmissions: null,
      documentRole: "unknown",
      editionYear: null,
      reasons: [
        ...reasons,
        `Unsupported response content type: ${contentType}`,
      ],
      status: "unknown",
    };
  }

  const finalUrl = new URL(response.finalUrl);
  const finalHost = finalUrl.hostname.toLowerCase();
  const normalizedOfficialDomains = officialDomains.map((domain) =>
    domain.toLowerCase().replace(WWW_PREFIX_PATTERN, "")
  );
  const hostWithoutWww = finalHost.replace(WWW_PREFIX_PATTERN, "");
  if (
    normalizedOfficialDomains.length > 0 &&
    !normalizedOfficialDomains.some(
      (domain) =>
        hostWithoutWww === domain || hostWithoutWww.endsWith(`.${domain}`)
    )
  ) {
    reasons.push(
      `Final host "${finalHost}" is outside the registered official domains`
    );
  }
  if (response.redirectChain.length > 0) {
    reasons.push(
      `The link redirected ${response.redirectChain.length} time(s) to ${response.finalUrl}`
    );
  }

  const text = normalizedText(response.body);
  const html = response.body;
  const password = hasPasswordInput(html);
  // A form with a password field is a sign-in flow. Login portals routinely
  // carry a "Inscreva-se" sign-up link, so treating their form as an
  // application form would read a login wall as current_and_open and restore
  // Apply with no reviewer involved. Unattended automation must fail toward
  // suppressing Apply, so such a page is a login wall.
  const form = hasApplicationForm(html) && !password;
  const detectedYears = [
    ...new Set([...yearsIn(text), ...yearsIn(response.finalUrl)]),
  ].sort((left, right) => right - left);
  const detectedEditionYear =
    expectedEditionYear && detectedYears.includes(expectedEditionYear)
      ? expectedEditionYear
      : (detectedYears[0] ?? null);

  if (
    expectedEditionYear &&
    detectedYears.length > 0 &&
    !detectedYears.includes(expectedEditionYear)
  ) {
    return {
      acceptsSubmissions: false,
      documentRole: "application_form",
      editionYear: detectedEditionYear,
      reasons: [
        ...reasons,
        `Expected edition ${expectedEditionYear}, but found ${detectedYears.join(", ")}`,
      ],
      status: "old_edition",
    };
  }
  if (containsAny(text, RESULTS_LANGUAGE) && !form) {
    return {
      acceptsSubmissions: false,
      documentRole: "results_announcement",
      editionYear: detectedEditionYear,
      reasons: [...reasons, "The page contains results-announcement signals"],
      status: "results_page",
    };
  }
  if ((password || containsAny(text, LOGIN_LANGUAGE)) && !form) {
    return {
      acceptsSubmissions: false,
      documentRole: "login_wall",
      editionYear: detectedEditionYear,
      reasons: [...reasons, "Only a login flow was visible"],
      status: "login_only",
    };
  }
  if (containsAny(text, CLOSED_LANGUAGE)) {
    return {
      acceptsSubmissions: false,
      documentRole: form ? "application_form" : "application_portal",
      editionYear: detectedEditionYear,
      reasons: [...reasons, "The page explicitly says applications are closed"],
      status: "closed",
    };
  }
  if (containsAny(text, UPCOMING_LANGUAGE)) {
    return {
      acceptsSubmissions: false,
      documentRole: form ? "application_form" : "application_portal",
      editionYear: detectedEditionYear,
      reasons: [...reasons, "The page says applications are not open yet"],
      status: "current_but_not_open",
    };
  }
  if (form && containsAny(text, OPEN_LANGUAGE)) {
    return {
      acceptsSubmissions: true,
      documentRole: "application_form",
      editionYear: detectedEditionYear,
      reasons: [
        ...reasons,
        "A visible form and explicit open-application language were found",
      ],
      status: "current_and_open",
    };
  }
  if (form) {
    return {
      acceptsSubmissions: true,
      documentRole: "application_form",
      editionYear: detectedEditionYear,
      reasons: [
        ...reasons,
        "A visible submission form was found, but open status was not explicit",
      ],
      status: "current_but_not_open",
    };
  }

  const original = new URL(originalUrl);
  const applicationPathSignal = APPLICATION_PATH_PATTERN.test(
    `${finalUrl.pathname} ${text.slice(0, 2000)}`
  );
  if (
    finalUrl.pathname === "/" ||
    (original.pathname === "/" && !applicationPathSignal)
  ) {
    return {
      acceptsSubmissions: false,
      documentRole: "generic_organization_page",
      editionYear: detectedEditionYear,
      reasons: [...reasons, "No application-specific page or form was found"],
      status: "generic_homepage",
    };
  }
  if (response.redirectChain.length > 0) {
    return {
      acceptsSubmissions: null,
      documentRole: "unknown",
      editionYear: detectedEditionYear,
      reasons: [...reasons, "Redirect target could not be classified safely"],
      status: "redirected",
    };
  }
  return {
    acceptsSubmissions: null,
    documentRole: "unknown",
    editionYear: detectedEditionYear,
    reasons: [
      ...reasons,
      "HTTP success did not provide enough evidence that applications are open",
    ],
    status: "unknown",
  };
};
// biome-ignore-end lint/complexity/noExcessiveCognitiveComplexity: End ordered semantic checks.

/**
 * Ceiling on how long one verification waits for its network work (robots.txt,
 * every redirect hop, the page itself) before recording VERIFICATION_TIMEOUT.
 * It keeps the verification — and every database write, which only happens
 * after it — far inside the 15-minute queue lease and the link-check route's
 * 60-second limit. It does not cancel the requests in flight: those stop on
 * their own per-request limits (20 s total each) and write nothing.
 */
export const VERIFICATION_DEADLINE_MS = 45_000;

export interface VerifyApplicationLinkDependencies {
  client?: SafeHttpClient;
  deadlineMs?: number;
  now?: Date;
  robotsChecker?: typeof checkRobotsAllowed;
}

const withDeadline = <T>(work: Promise<T>, deadlineMs: number): Promise<T> => {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const deadline = new Promise<never>((_, reject) => {
    timer = setTimeout(
      () =>
        reject(
          new SafeHttpError(
            "VERIFICATION_TIMEOUT",
            `Verification exceeded the ${deadlineMs}ms deadline.`
          )
        ),
      deadlineMs
    );
  });
  return Promise.race([work, deadline]).finally(() => clearTimeout(timer));
};

export class ApplicationLinkVerificationError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = "ApplicationLinkVerificationError";
    this.code = code;
  }
}

const safeFailureStatus = (error: SafeHttpError): LinkStatus => {
  if (
    [
      "PRIVATE_ADDRESS_BLOCKED",
      "PRIVATE_HOST_BLOCKED",
      "UNSAFE_PORT",
      "UNSAFE_PROTOCOL",
      "URL_CREDENTIALS_BLOCKED",
    ].includes(error.code)
  ) {
    return "blocked";
  }
  // This runtime could not verify the certificate, but a visitor's browser may
  // well trust it (Brazilian public institutions often use chains Node does
  // not ship). That is not evidence the link is dead, so it is recorded as
  // indeterminate rather than as a decisive `broken` that suppresses Apply.
  if (error.code === "TLS_VERIFICATION_FAILED") {
    return "unknown";
  }
  return "broken";
};

const persistLifecycleEffects = async ({
  database,
  editionId,
  now,
  previousStatus,
  result,
}: {
  database: Database;
  editionId: string;
  now: Date;
  previousStatus: LinkStatus | null;
  result: typeof applicationLinkAssessments.$inferSelect;
}): Promise<void> => {
  await database
    .update(editions)
    .set({ lastVerifiedAt: now })
    .where(eq(editions.id, editionId));

  const degraded = ["broken", "closed", "old_edition", "results_page"].includes(
    result.status
  );
  if (!degraded) {
    return;
  }
  const openTasks = await database
    .select({ id: reviewTasks.id })
    .from(reviewTasks)
    .where(
      and(
        eq(reviewTasks.entityId, editionId),
        eq(reviewTasks.fieldName, "application_link_status"),
        eq(reviewTasks.reason, "application_link_degraded"),
        eq(reviewTasks.status, "open")
      )
    )
    .limit(1);
  if (openTasks.length > 0) {
    return;
  }
  await database.insert(reviewTasks).values({
    candidateAssertionIds: [],
    entityId: editionId,
    entityType: "edition",
    explanation: `The scheduled application-link check changed to "${result.status}": ${result.reasons.join("; ")}`,
    fieldName: "application_link_status",
    previousValue: previousStatus,
    reason: "application_link_degraded",
    severity: result.status === "broken" ? "high" : "critical",
    suggestedValue: result.status,
  });
};

export interface ApplicationLinkVerification {
  assessment: typeof applicationLinkAssessments.$inferSelect;
  materialChange: boolean;
  previousStatus: LinkStatus | null;
}

/**
 * Verify one application round and report whether the operational status
 * changed.
 *
 * The network work runs under VERIFICATION_DEADLINE_MS. Every write — the
 * assessment, the edition's last-verified time, a degraded-link review task,
 * and the audit event — commits in one transaction, so a failure part-way can
 * never leave an assessment without its audit trail, and a retry never
 * duplicates a half-applied verification.
 */
export const verifyApplicationLinkWithChange = async (
  database: Database,
  applicationRoundId: string,
  actorId: string,
  dependencies: VerifyApplicationLinkDependencies = {}
): Promise<ApplicationLinkVerification> => {
  const contextRows = await database
    .select({
      applicationUrl: applicationRounds.applicationUrl,
      editionId: editions.id,
      editionYear: editions.editionYear,
      officialDomains: organizations.officialDomains,
      officialHomepage: programs.officialHomepage,
    })
    .from(applicationRounds)
    .innerJoin(editions, eq(editions.id, applicationRounds.editionId))
    .innerJoin(programs, eq(programs.id, editions.programId))
    .leftJoin(organizations, eq(organizations.id, programs.organizerId))
    .where(eq(applicationRounds.id, applicationRoundId))
    .limit(1);
  const context = contextRows[0];
  if (!context) {
    throw new ApplicationLinkVerificationError(
      "APPLICATION_ROUND_NOT_FOUND",
      "The application round does not exist."
    );
  }
  if (!context.applicationUrl) {
    throw new ApplicationLinkVerificationError(
      "APPLICATION_URL_MISSING",
      "The application round has no application URL."
    );
  }
  const applicationUrl = context.applicationUrl;
  const previousAssessmentRows = await database
    .select()
    .from(applicationLinkAssessments)
    .where(
      eq(applicationLinkAssessments.applicationRoundId, applicationRoundId)
    )
    .orderBy(desc(applicationLinkAssessments.createdAt))
    .limit(1);
  const previousAssessment = previousAssessmentRows[0];

  const now = dependencies.now ?? new Date();
  const client = dependencies.client ?? createSafeHttpClient();
  const robotsChecker = dependencies.robotsChecker ?? checkRobotsAllowed;
  const deadlineMs = dependencies.deadlineMs ?? VERIFICATION_DEADLINE_MS;
  let assessment: ApplicationPageClassification;
  let finalUrl: string | null = null;
  let httpStatus: number | null = null;
  let redirectChain: string[] = [];
  try {
    const target = new URL(applicationUrl);
    const observed = await withDeadline(
      (async () => {
        const robots = await robotsChecker(client, target, now);
        if (!robots.allowed) {
          return { response: null, robots };
        }
        return { response: await client.get(target.toString()), robots };
      })(),
      deadlineMs
    );
    if (observed.response) {
      const response = observed.response;
      finalUrl = response.finalUrl;
      httpStatus = response.status;
      redirectChain = response.redirectChain;
      const officialDomains = [
        ...(context.officialDomains ?? []),
        ...(context.officialHomepage
          ? [new URL(context.officialHomepage).hostname]
          : []),
      ];
      assessment = classifyApplicationPage({
        expectedEditionYear: context.editionYear,
        officialDomains,
        originalUrl: applicationUrl,
        response,
      });
      assessment.reasons.unshift(observed.robots.reason);
    } else {
      assessment = {
        acceptsSubmissions: null,
        documentRole: "unknown",
        editionYear: context.editionYear,
        reasons: [observed.robots.reason],
        status: "blocked",
      };
    }
  } catch (error) {
    if (!(error instanceof SafeHttpError || error instanceof TypeError)) {
      throw error;
    }
    const safeError =
      error instanceof SafeHttpError
        ? error
        : new SafeHttpError(
            "NETWORK_ERROR",
            error.message || "The application URL could not be fetched."
          );
    assessment = {
      acceptsSubmissions: false,
      documentRole: "error_page",
      editionYear: context.editionYear,
      reasons: [`${safeError.code}: ${safeError.message}`],
      status: safeFailureStatus(safeError),
    };
  }

  const result = await database.transaction(async (transaction) => {
    const rows = await transaction
      .insert(applicationLinkAssessments)
      .values({
        acceptsSubmissions: assessment.acceptsSubmissions,
        applicationRoundId,
        checkedAt: now,
        documentRole: assessment.documentRole,
        editionYear: assessment.editionYear,
        finalUrl,
        httpStatus,
        originalUrl: applicationUrl,
        reasons: assessment.reasons,
        redirectChain,
        status: assessment.status,
      })
      .returning();
    const inserted = rows[0];
    if (!inserted) {
      throw new ApplicationLinkVerificationError(
        "ASSESSMENT_WRITE_FAILED",
        "The link assessment could not be persisted."
      );
    }
    await persistLifecycleEffects({
      database: transaction as unknown as Database,
      editionId: context.editionId,
      now,
      previousStatus: previousAssessment?.status ?? null,
      result: inserted,
    });
    await transaction.insert(auditEvents).values({
      action: "application_link.verified",
      actorId,
      actorKind: "service",
      entityId: inserted.id,
      entityType: "application_link_assessment",
      metadata: {
        application_round_id: applicationRoundId,
        status: inserted.status,
      },
    });
    return inserted;
  });
  const previousStatus = previousAssessment?.status ?? null;
  return {
    assessment: result,
    materialChange: previousStatus !== result.status,
    previousStatus,
  };
};

export const verifyApplicationLink = async (
  database: Database,
  applicationRoundId: string,
  actorId: string,
  dependencies: VerifyApplicationLinkDependencies = {}
) =>
  (
    await verifyApplicationLinkWithChange(
      database,
      applicationRoundId,
      actorId,
      dependencies
    )
  ).assessment;
