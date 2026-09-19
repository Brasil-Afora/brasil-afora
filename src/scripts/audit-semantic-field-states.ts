import { createHash } from "node:crypto";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { schema } from "../db/schema";
import { auditEvents, reviewTasks } from "../db/schema/ingestion";

type Severity = "critical" | "high" | "low" | "medium";

interface SemanticRow {
  applicability: string | null;
  authoritative_sources_checked: number | null;
  checked_source_roles: string[] | null;
  conflicting_assertion_ids: string[];
  coverage_state: string | null;
  criticality: string;
  edition_id: string;
  failure_codes: string[] | null;
  field_name: string;
  gate_impact: string;
  publication_version_id: string;
  reason_code: string;
  semantic_state: string;
  supporting_assertion_ids: string[];
  unchecked_source_roles: string[] | null;
  unprocessed_official_documents: boolean | null;
  value: unknown;
}

interface CurrentVersion {
  edition_id: string;
  payload: Record<string, unknown>;
  publication_version_id: string;
  version: number;
}

interface Finding {
  category:
    | "conflicting_evidence"
    | "extraction_failure"
    | "generic_placeholder"
    | "incorrect_not_applicable"
    | "incorrect_unrestricted"
    | "insufficient_source_coverage"
    | "missing_semantic_state"
    | "null_value"
    | "requires_review"
    | "safe";
  edition_id: string;
  evidence_assertion_ids: string[];
  field: string;
  message: string;
  publication_version_id: string;
  severity: Severity;
  state: string | null;
  value: unknown;
}

const APPLY_CHANGES = process.argv.includes("--apply");
const databaseUrl = process.env.DATABASE_URL?.trim();
if (!databaseUrl) {
  throw new Error("Missing required environment variable: DATABASE_URL");
}
const pgPool = new Pool({ connectionString: databaseUrl });
const db = drizzle({ casing: "snake_case", client: pgPool, schema });
const GENERIC_PLACEHOLDERS = new Set([
  "-",
  "n/a",
  "n/d",
  "nao informado",
  "não informado",
  "null",
  "undefined",
]);
const CANONICAL_FIELDS = [
  "accommodation_coverage",
  "age",
  "application_deadline",
  "application_fee",
  "application_opening",
  "application_round",
  "application_url",
  "benefits",
  "birthdate",
  "brazilian_eligibility",
  "citizenship",
  "city",
  "country",
  "current_edition",
  "deadline_type",
  "description",
  "duration",
  "education_level",
  "full_funding",
  "grade",
  "image",
  "institution_restriction",
  "is_free",
  "language",
  "lifecycle_status",
  "mandatory_additional_costs",
  "meals",
  "modality",
  "nomination_requirement",
  "official_information_url",
  "organizer",
  "partial_funding",
  "participation_format",
  "passport_requirement",
  "prior_experience",
  "program_cost",
  "program_end",
  "program_start",
  "required_documents",
  "residence",
  "results_date",
  "scholarship",
  "school_location",
  "source_authority",
  "state",
  "stipend",
  "team_size",
  "title",
  "travel_coverage",
  "travel_requirement",
  "visa_requirement",
] as const;

const deterministicUuid = (value: string): string => {
  const hash = createHash("sha256").update(value).digest("hex").slice(0, 32);
  return `${hash.slice(0, 8)}-${hash.slice(8, 12)}-5${hash.slice(13, 16)}-a${hash.slice(17, 20)}-${hash.slice(20)}`;
};

const normalizedPlaceholder = (value: string): string =>
  value.trim().toLocaleLowerCase("pt-BR");

const placeholderPaths = (
  value: unknown,
  path = "payload"
): Array<{ path: string; value: string }> => {
  if (typeof value === "string") {
    return GENERIC_PLACEHOLDERS.has(normalizedPlaceholder(value))
      ? [{ path, value }]
      : [];
  }
  if (Array.isArray(value)) {
    return value.flatMap((item, index) =>
      placeholderPaths(item, `${path}[${index}]`)
    );
  }
  if (typeof value !== "object" || value === null) {
    return [];
  }
  return Object.entries(value).flatMap(([key, item]) =>
    placeholderPaths(item, `${path}.${key}`)
  );
};

const severityFor = (criticality: string): Severity => {
  if (criticality === "critical") {
    return "critical";
  }
  return criticality === "conditional" ? "high" : "medium";
};

const finding = (
  row: SemanticRow,
  category: Finding["category"],
  message: string,
  severity = severityFor(row.criticality)
): Finding => ({
  category,
  edition_id: row.edition_id,
  evidence_assertion_ids: [
    ...row.supporting_assertion_ids,
    ...row.conflicting_assertion_ids,
  ],
  field: row.field_name,
  message,
  publication_version_id: row.publication_version_id,
  severity,
  state: row.semantic_state,
  value: row.value,
});

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Every semantic integrity rule remains explicit so the audit cannot silently collapse distinct data-quality failures.
const auditSemanticRow = (row: SemanticRow): Finding[] => {
  const findings: Finding[] = [];
  const coverageSufficient = ["complete", "sufficient"].includes(
    row.coverage_state ?? ""
  );
  const hasEvidence = row.supporting_assertion_ids.length > 0;

  if (
    row.semantic_state === "explicit_value" &&
    (row.value === null || row.value === "" || row.value === undefined)
  ) {
    findings.push(
      finding(row, "null_value", "An explicit_value state has no usable value.")
    );
  }
  if (row.semantic_state === "not_stated" && !coverageSufficient) {
    findings.push(
      finding(
        row,
        "insufficient_source_coverage",
        "not_stated was assigned without complete or sufficient authoritative-source coverage."
      )
    );
  }
  if (row.semantic_state === "explicitly_unrestricted" && !hasEvidence) {
    findings.push(
      finding(
        row,
        "incorrect_unrestricted",
        "An unrestricted claim has no supporting source assertion."
      )
    );
  }
  if (
    (row.semantic_state === "not_applicable") !==
    (row.applicability === "not_applicable")
  ) {
    findings.push(
      finding(
        row,
        "incorrect_not_applicable",
        "Semantic state and applicability assessment disagree."
      )
    );
  }
  const partialCoverageStillMatters =
    row.coverage_state === "partial" &&
    (row.semantic_state !== "explicit_value" ||
      (row.unchecked_source_roles?.length ?? 0) > 0);
  if (
    ["blocked", "incomplete", "unknown"].includes(
      row.coverage_state ?? "unknown"
    ) ||
    partialCoverageStillMatters ||
    row.unprocessed_official_documents
  ) {
    findings.push(
      finding(
        row,
        "insufficient_source_coverage",
        `Coverage is ${row.coverage_state ?? "unknown"}; unchecked roles: ${(row.unchecked_source_roles ?? []).join(", ") || "not recorded"}.`
      )
    );
  }
  if (
    row.semantic_state === "extraction_failed" ||
    (row.failure_codes?.length ?? 0) > 0
  ) {
    findings.push(
      finding(
        row,
        "extraction_failure",
        `Extraction/source failures: ${(row.failure_codes ?? []).join(", ") || row.reason_code}.`
      )
    );
  }
  if (
    row.semantic_state === "conflicting" ||
    row.conflicting_assertion_ids.length > 0
  ) {
    findings.push(
      finding(
        row,
        "conflicting_evidence",
        "Credible source assertions disagree and require an evidence-backed review."
      )
    );
  }
  if (
    ["pending_verification", "unresolved"].includes(row.semantic_state) ||
    row.gate_impact === "block" ||
    row.gate_impact === "review"
  ) {
    findings.push(
      finding(
        row,
        "requires_review",
        `State ${row.semantic_state} has gate impact ${row.gate_impact}.`
      )
    );
  }
  if (findings.length === 0) {
    findings.push(
      finding(
        row,
        "safe",
        "State, evidence, applicability, and source coverage are internally consistent.",
        "low"
      )
    );
  }
  return findings;
};

const audit = async (): Promise<Finding[]> => {
  const [versionsResult, semanticResult] = await Promise.all([
    pgPool.query<CurrentVersion>(`
      SELECT
        publication_version.id AS publication_version_id,
        publication_version.edition_id,
        publication_version.version,
        publication_version.payload
      FROM publication_versions AS publication_version
      JOIN (
        SELECT edition_id, max(version) AS version
        FROM publication_versions
        GROUP BY edition_id
      ) AS latest
        ON latest.edition_id = publication_version.edition_id
       AND latest.version = publication_version.version
      ORDER BY publication_version.edition_id
    `),
    pgPool.query<SemanticRow>(`
      SELECT
        semantic_state.publication_version_id,
        semantic_state.edition_id,
        semantic_state.field_name,
        semantic_state.semantic_state,
        semantic_state.value,
        semantic_state.criticality,
        semantic_state.reason_code,
        semantic_state.supporting_assertion_ids,
        semantic_state.conflicting_assertion_ids,
        semantic_state.gate_impact,
        applicability.applicability,
        coverage.coverage_state,
        coverage.checked_source_roles,
        coverage.unchecked_source_roles,
        coverage.failure_codes,
        coverage.authoritative_sources_checked,
        coverage.unprocessed_official_documents
      FROM field_semantic_states AS semantic_state
      JOIN (
        SELECT edition_id, max(version) AS version
        FROM publication_versions
        GROUP BY edition_id
      ) AS latest ON latest.edition_id = semantic_state.edition_id
      JOIN publication_versions AS publication_version
        ON publication_version.id = semantic_state.publication_version_id
       AND publication_version.version = latest.version
      LEFT JOIN field_applicability_assessments AS applicability
        ON applicability.semantic_state_id = semantic_state.id
      LEFT JOIN field_source_coverage AS coverage
        ON coverage.semantic_state_id = semantic_state.id
      ORDER BY semantic_state.edition_id, semantic_state.field_name
    `),
  ]);

  const findings = semanticResult.rows.flatMap(auditSemanticRow);
  const statesByVersion = new Map<string, Set<string>>();
  for (const row of semanticResult.rows) {
    const fields =
      statesByVersion.get(row.publication_version_id) ?? new Set<string>();
    fields.add(row.field_name);
    statesByVersion.set(row.publication_version_id, fields);
  }

  for (const version of versionsResult.rows) {
    const fields =
      statesByVersion.get(version.publication_version_id) ?? new Set<string>();
    for (const fieldName of CANONICAL_FIELDS) {
      if (fields.has(fieldName)) {
        continue;
      }
      findings.push({
        category: "missing_semantic_state",
        edition_id: version.edition_id,
        evidence_assertion_ids: [],
        field: fieldName,
        message:
          "The latest publication version has no canonical semantic state.",
        publication_version_id: version.publication_version_id,
        severity: [
          "application_deadline",
          "application_url",
          "brazilian_eligibility",
          "current_edition",
          "description",
          "source_authority",
          "title",
        ].includes(fieldName)
          ? "critical"
          : "high",
        state: null,
        value: null,
      });
    }
    for (const placeholder of placeholderPaths(version.payload)) {
      findings.push({
        category: "generic_placeholder",
        edition_id: version.edition_id,
        evidence_assertion_ids: [],
        field: placeholder.path,
        message:
          "The public publication payload contains a generic placeholder instead of a field-specific semantic projection.",
        publication_version_id: version.publication_version_id,
        severity: "high",
        state: null,
        value: placeholder.value,
      });
    }
  }
  return findings;
};

const persistFindings = async (findings: Finding[]): Promise<number> => {
  const actionable = findings.filter((item) => item.category !== "safe");
  const grouped = new Map<string, Finding[]>();
  for (const item of actionable) {
    const key = `${item.publication_version_id}:${item.edition_id}`;
    grouped.set(key, [...(grouped.get(key) ?? []), item]);
  }
  let inserted = 0;
  for (const group of grouped.values()) {
    const item = group[0];
    if (!item) {
      continue;
    }
    const severityOrder: Record<Severity, number> = {
      critical: 4,
      high: 3,
      medium: 2,
      low: 1,
    };
    const severity = group.reduce(
      (current, candidate) =>
        severityOrder[candidate.severity] > severityOrder[current]
          ? candidate.severity
          : current,
      "low" as Severity
    );
    const affectedFields = Array.from(
      new Set(group.map((findingItem) => findingItem.field))
    ).sort();
    const categories = Array.from(
      new Set(group.map((findingItem) => findingItem.category))
    ).sort();
    const evidenceIds = Array.from(
      new Set(
        group.flatMap((findingItem) => findingItem.evidence_assertion_ids)
      )
    );
    const taskId = deterministicUuid(
      `semantic-audit:${item.publication_version_id}`
    );
    const insertedRows = await db
      .insert(reviewTasks)
      .values({
        candidateAssertionIds: evidenceIds,
        entityId: item.edition_id,
        entityType: "edition",
        explanation: `A auditoria semântica encontrou ${group.length} achados em ${affectedFields.length} campos (${categories.join(", ")}). Revise os estados e as evidências no painel; não converta ausências em valores presumidos.`,
        fieldName: "semantic_fields",
        id: taskId,
        previousValue: {
          affected_fields: affectedFields,
          categories,
          finding_count: group.length,
          publication_version_id: item.publication_version_id,
        },
        reason: "semantic_state_audit",
        severity,
      })
      .onConflictDoNothing()
      .returning({ id: reviewTasks.id });
    if (insertedRows.length === 0) {
      continue;
    }
    await db
      .insert(auditEvents)
      .values({
        action: "semantic_state_audit.flagged",
        actorId: "semantic-state-audit",
        actorKind: "service",
        entityId: item.edition_id,
        entityType: "edition",
        id: deterministicUuid(`audit:${taskId}`),
        metadata: {
          affected_fields: affectedFields,
          categories,
          finding_count: group.length,
          publication_version_id: item.publication_version_id,
          review_task_id: taskId,
        },
      })
      .onConflictDoNothing();
    inserted += 1;
  }
  return inserted;
};

const main = async (): Promise<void> => {
  const findings = await audit();
  const insertedReviewTasks = APPLY_CHANGES
    ? await persistFindings(findings)
    : 0;
  const categories = Object.fromEntries(
    Array.from(
      findings.reduce((counts, item) => {
        counts.set(item.category, (counts.get(item.category) ?? 0) + 1);
        return counts;
      }, new Map<string, number>())
    ).sort(([left], [right]) => left.localeCompare(right))
  );
  process.stdout.write(
    `${JSON.stringify(
      {
        applied: APPLY_CHANGES,
        categories,
        finding_count: findings.length,
        findings,
        generated_at: new Date().toISOString(),
        inserted_review_tasks: insertedReviewTasks,
        latest_publication_versions: new Set(
          findings.map((item) => item.publication_version_id)
        ).size,
      },
      null,
      2
    )}\n`
  );
};

main()
  .catch((error: unknown) => {
    process.stderr.write(
      `${error instanceof Error ? error.stack : String(error)}\n`
    );
    process.exitCode = 1;
  })
  .finally(async () => {
    await pgPool.end();
  });
