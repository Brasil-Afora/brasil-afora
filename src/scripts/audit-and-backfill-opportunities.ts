import { createHash } from "node:crypto";
import { db, pgPool } from "../db/client";
import { auditEvents, editions, reviewTasks } from "../db/schema/ingestion";
import { nationalOpportunities } from "../db/schema/national-opportunities";
import { opportunities } from "../db/schema/opportunities";

type Severity = "critical" | "high" | "low" | "medium";

interface Finding {
  collection: "international" | "national";
  edition_id: string | null;
  field: string;
  flag: string;
  record_id: string;
  severity: Severity;
  value: unknown;
}

const PLACEHOLDER_IMAGE_PATTERN =
  /favicon|logo(?:[-_.]|$)|placeholder|dummyimage|avatar|tracking|pixel/i;
const KNOWN_MODALITIES = new Set([
  "Híbrido",
  "Não informado",
  "Online",
  "Presencial",
]);
const APPLY_CHANGES = process.argv.includes("--apply");
const today = new Date().toISOString().slice(0, 10);

const deterministicUuid = (value: string): string => {
  const hash = createHash("sha256").update(value).digest("hex").slice(0, 32);
  return `${hash.slice(0, 8)}-${hash.slice(8, 12)}-5${hash.slice(13, 16)}-a${hash.slice(17, 20)}-${hash.slice(20)}`;
};

const normalizedIdentity = (name: string, deadline: string): string =>
  `${name
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()}:${deadline.slice(0, 4)}`;

const isGenericUrl = (value: string | null): boolean => {
  if (!value) {
    return true;
  }
  try {
    const url = new URL(value);
    return url.pathname === "/" && !url.search;
  } catch {
    return true;
  }
};

const finding = (
  recordId: string,
  collection: Finding["collection"],
  editionId: string | null,
  flag: string,
  field: string,
  severity: Severity,
  value: unknown
): Finding => ({
  collection,
  edition_id: editionId,
  field,
  flag,
  record_id: recordId,
  severity,
  value,
});

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Keeping every legacy-data rule explicit makes the dry-run report auditable and prevents generic rules from silently coercing unlike schemas.
const audit = async (): Promise<Finding[]> => {
  const [internationalRows, nationalRows, editionRows] = await Promise.all([
    db.select().from(opportunities),
    db.select().from(nationalOpportunities),
    db.select({ id: editions.id }).from(editions),
  ]);
  const editionIds = new Set(editionRows.map((row) => row.id));
  const findings: Finding[] = [];
  const duplicateGroups = new Map<string, string[]>();

  for (const record of internationalRows) {
    const editionId = editionIds.has(record.id) ? record.id : null;
    const identity = normalizedIdentity(
      record.name,
      record.applicationDeadline ?? "unknown"
    );
    duplicateGroups.set(identity, [
      ...(duplicateGroups.get(identity) ?? []),
      record.id,
    ]);
    if (!record.publicationVersionId) {
      findings.push(
        finding(
          record.id,
          "international",
          editionId,
          "missing_publication_version",
          "publication_version_id",
          "critical",
          null
        )
      );
    }
    if (
      record.applicationDeadline !== null &&
      record.applicationDeadline < today &&
      (!record.lifecycleStatus ||
        ["open", "closing_soon", "extended"].includes(record.lifecycleStatus))
    ) {
      findings.push(
        finding(
          record.id,
          "international",
          editionId,
          "passed_deadline_still_active",
          "application_deadline",
          "critical",
          record.applicationDeadline
        )
      );
    }
    if (isGenericUrl(record.applicationUrl)) {
      findings.push(
        finding(
          record.id,
          "international",
          editionId,
          "missing_or_generic_application_url",
          "application_url",
          "high",
          record.applicationUrl
        )
      );
    }
    if (
      record.applicationUrl &&
      record.officialInformationUrl === record.applicationUrl
    ) {
      findings.push(
        finding(
          record.id,
          "international",
          editionId,
          "official_and_application_urls_conflated",
          "application_url",
          "high",
          record.applicationUrl
        )
      );
    }
    if (PLACEHOLDER_IMAGE_PATTERN.test(record.image)) {
      findings.push(
        finding(
          record.id,
          "international",
          editionId,
          "placeholder_or_nonrepresentative_image",
          "image",
          "medium",
          record.image
        )
      );
    }
    if (!record.specificRequirements.trim()) {
      findings.push(
        finding(
          record.id,
          "international",
          editionId,
          "missing_eligibility",
          "specific_requirements",
          "critical",
          record.specificRequirements
        )
      );
    }
    if (!record.ageRange.trim()) {
      findings.push(
        finding(
          record.id,
          "international",
          editionId,
          "missing_age_reference",
          "age_range",
          "high",
          record.ageRange
        )
      );
    }
  }

  for (const record of nationalRows) {
    const editionId = editionIds.has(record.id) ? record.id : null;
    const identity = normalizedIdentity(
      record.name,
      record.applicationDeadline ?? "unknown"
    );
    duplicateGroups.set(identity, [
      ...(duplicateGroups.get(identity) ?? []),
      record.id,
    ]);
    if (!record.publicationVersionId) {
      findings.push(
        finding(
          record.id,
          "national",
          editionId,
          "missing_publication_version",
          "publication_version_id",
          "critical",
          null
        )
      );
    }
    if (
      record.applicationDeadline !== null &&
      record.applicationDeadline < today &&
      (!record.lifecycleStatus ||
        ["open", "closing_soon", "extended"].includes(record.lifecycleStatus))
    ) {
      findings.push(
        finding(
          record.id,
          "national",
          editionId,
          "passed_deadline_still_active",
          "application_deadline",
          "critical",
          record.applicationDeadline
        )
      );
    }
    if (isGenericUrl(record.applicationUrl)) {
      findings.push(
        finding(
          record.id,
          "national",
          editionId,
          "missing_or_generic_application_url",
          "application_url",
          "high",
          record.applicationUrl
        )
      );
    }
    if (PLACEHOLDER_IMAGE_PATTERN.test(record.image)) {
      findings.push(
        finding(
          record.id,
          "national",
          editionId,
          "placeholder_or_nonrepresentative_image",
          "image",
          "medium",
          record.image
        )
      );
    }
    if (!KNOWN_MODALITIES.has(record.modality)) {
      findings.push(
        finding(
          record.id,
          "national",
          editionId,
          "unsupported_or_inferred_modality",
          "modality",
          "high",
          record.modality
        )
      );
    }
    if (!record.requirements.trim()) {
      findings.push(
        finding(
          record.id,
          "national",
          editionId,
          "missing_eligibility",
          "requirements",
          "critical",
          record.requirements
        )
      );
    }
  }

  for (const [identity, recordIds] of duplicateGroups) {
    if (recordIds.length < 2) {
      continue;
    }
    for (const recordId of recordIds) {
      findings.push(
        finding(
          recordId,
          internationalRows.some((row) => row.id === recordId)
            ? "international"
            : "national",
          editionIds.has(recordId) ? recordId : null,
          "possible_same_edition_duplicate",
          "identity",
          "critical",
          { identity, record_ids: recordIds }
        )
      );
    }
  }
  return findings;
};

const persistFindings = async (findings: Finding[]): Promise<number> => {
  const canonicalFindings = findings.filter(
    (item): item is Finding & { edition_id: string } => item.edition_id !== null
  );
  if (canonicalFindings.length === 0) {
    return 0;
  }
  let inserted = 0;
  for (const item of canonicalFindings) {
    const taskId = deterministicUuid(
      `legacy-audit:${item.collection}:${item.record_id}:${item.flag}`
    );
    const insertedRows = await db
      .insert(reviewTasks)
      .values({
        candidateAssertionIds: [],
        entityId: item.edition_id,
        entityType: "edition",
        explanation: `Legacy-data audit flagged "${item.flag}". Do not correct it without recapturing source evidence.`,
        fieldName: item.field,
        id: taskId,
        previousValue: item.value,
        reason: "legacy_data_quality",
        severity: item.severity,
      })
      .onConflictDoNothing()
      .returning({ id: reviewTasks.id });
    if (insertedRows.length === 0) {
      continue;
    }
    await db
      .insert(auditEvents)
      .values({
        action: "legacy_data_quality.flagged",
        actorId: "data-audit",
        actorKind: "service",
        entityId: item.edition_id,
        entityType: "edition",
        id: deterministicUuid(`audit:${taskId}`),
        metadata: { ...item, review_task_id: taskId },
      })
      .onConflictDoNothing();
    inserted += 1;
  }
  return inserted;
};

try {
  const findings = await audit();
  const inserted_review_tasks = APPLY_CHANGES
    ? await persistFindings(findings)
    : 0;
  process.stdout.write(
    `${JSON.stringify(
      {
        applied: APPLY_CHANGES,
        finding_count: findings.length,
        findings,
        generated_at: new Date().toISOString(),
        inserted_review_tasks,
      },
      null,
      2
    )}\n`
  );
} finally {
  await pgPool.end();
}
