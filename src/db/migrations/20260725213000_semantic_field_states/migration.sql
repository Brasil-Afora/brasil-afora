DO $$ BEGIN
  CREATE TYPE "semantic_field_state" AS ENUM (
    'explicit_value',
    'explicitly_unrestricted',
    'not_applicable',
    'not_stated',
    'unresolved',
    'conflicting',
    'extraction_failed',
    'pending_verification',
    'suppressed'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  CREATE TYPE "field_applicability" AS ENUM (
    'required',
    'conditionally_required',
    'optional',
    'not_applicable',
    'unknown_applicability'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  CREATE TYPE "source_coverage_state" AS ENUM (
    'complete',
    'sufficient',
    'partial',
    'incomplete',
    'blocked',
    'unknown'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "field_semantic_states" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "edition_id" uuid NOT NULL REFERENCES "editions"("id"),
  "publication_version_id" uuid NOT NULL REFERENCES "publication_versions"("id"),
  "extraction_run_id" uuid REFERENCES "extraction_runs"("id"),
  "field_name" text NOT NULL,
  "semantic_state" "semantic_field_state" NOT NULL,
  "value" jsonb,
  "criticality" text NOT NULL,
  "reason_code" text NOT NULL,
  "public_explanation" text NOT NULL,
  "supporting_assertion_ids" uuid[] DEFAULT '{}'::uuid[] NOT NULL,
  "alternative_assertion_ids" uuid[] DEFAULT '{}'::uuid[] NOT NULL,
  "conflicting_assertion_ids" uuid[] DEFAULT '{}'::uuid[] NOT NULL,
  "gate_impact" text DEFAULT 'none' NOT NULL,
  "resolved_at" timestamp with time zone DEFAULT now() NOT NULL,
  "last_verified_at" timestamp with time zone
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "field_semantic_states_version_field_key"
  ON "field_semantic_states" ("publication_version_id", "field_name");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "field_semantic_states_edition_field_idx"
  ON "field_semantic_states" ("edition_id", "field_name", "resolved_at");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "field_semantic_states_state_gate_idx"
  ON "field_semantic_states" ("semantic_state", "gate_impact");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "field_applicability_assessments" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "semantic_state_id" uuid NOT NULL REFERENCES "field_semantic_states"("id"),
  "edition_id" uuid NOT NULL REFERENCES "editions"("id"),
  "field_name" text NOT NULL,
  "applicability" "field_applicability" NOT NULL,
  "reason_code" text NOT NULL,
  "evidence_assertion_ids" uuid[] DEFAULT '{}'::uuid[] NOT NULL,
  "assessed_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "field_applicability_semantic_key"
  ON "field_applicability_assessments" ("semantic_state_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "field_applicability_edition_field_idx"
  ON "field_applicability_assessments" ("edition_id", "field_name");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "field_source_coverage" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "semantic_state_id" uuid NOT NULL REFERENCES "field_semantic_states"("id"),
  "edition_id" uuid NOT NULL REFERENCES "editions"("id"),
  "field_name" text NOT NULL,
  "coverage_state" "source_coverage_state" NOT NULL,
  "checked_source_roles" text[] DEFAULT '{}'::text[] NOT NULL,
  "unchecked_source_roles" text[] DEFAULT '{}'::text[] NOT NULL,
  "failure_codes" text[] DEFAULT '{}'::text[] NOT NULL,
  "authoritative_sources_checked" integer DEFAULT 0 NOT NULL,
  "unprocessed_official_documents" boolean DEFAULT false NOT NULL,
  "assessed_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "field_source_coverage_semantic_key"
  ON "field_source_coverage" ("semantic_state_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "field_source_coverage_edition_field_idx"
  ON "field_source_coverage" ("edition_id", "field_name", "coverage_state");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "field_display_projections" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "semantic_state_id" uuid NOT NULL REFERENCES "field_semantic_states"("id"),
  "edition_id" uuid NOT NULL REFERENCES "editions"("id"),
  "field_name" text NOT NULL,
  "locale" text DEFAULT 'pt-BR' NOT NULL,
  "display_key" text NOT NULL,
  "display_parameters" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "display_text" text NOT NULL,
  "public_visible" boolean DEFAULT true NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "field_display_semantic_locale_key"
  ON "field_display_projections" ("semantic_state_id", "locale");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "field_display_edition_field_idx"
  ON "field_display_projections" ("edition_id", "field_name");
--> statement-breakpoint
WITH historical_fields(field_name, criticality, applicability) AS (
  VALUES
    ('current_edition', 'critical', 'required'),
    ('lifecycle_status', 'critical', 'required'),
    ('application_round', 'critical', 'required'),
    ('application_opening', 'conditional', 'conditionally_required'),
    ('application_deadline', 'critical', 'required'),
    ('deadline_type', 'critical', 'required'),
    ('program_start', 'conditional', 'conditionally_required'),
    ('program_end', 'conditional', 'conditionally_required'),
    ('results_date', 'noncritical', 'optional'),
    ('application_url', 'critical', 'required'),
    ('official_information_url', 'critical', 'required'),
    ('source_authority', 'critical', 'required'),
    ('title', 'critical', 'required'),
    ('description', 'critical', 'required'),
    ('benefits', 'noncritical', 'optional'),
    ('required_documents', 'conditional', 'conditionally_required'),
    ('brazilian_eligibility', 'critical', 'required'),
    ('age', 'conditional', 'conditionally_required'),
    ('birthdate', 'conditional', 'conditionally_required'),
    ('citizenship', 'conditional', 'conditionally_required'),
    ('residence', 'conditional', 'conditionally_required'),
    ('school_location', 'conditional', 'conditionally_required'),
    ('education_level', 'conditional', 'conditionally_required'),
    ('grade', 'conditional', 'conditionally_required'),
    ('institution_restriction', 'conditional', 'conditionally_required'),
    ('nomination_requirement', 'conditional', 'conditionally_required'),
    ('participation_format', 'conditional', 'conditionally_required'),
    ('team_size', 'conditional', 'conditionally_required'),
    ('language', 'conditional', 'conditionally_required'),
    ('prior_experience', 'conditional', 'conditionally_required'),
    ('application_fee', 'conditional', 'conditionally_required'),
    ('program_cost', 'conditional', 'conditionally_required'),
    ('mandatory_additional_costs', 'conditional', 'conditionally_required'),
    ('is_free', 'conditional', 'conditionally_required'),
    ('scholarship', 'noncritical', 'optional'),
    ('full_funding', 'noncritical', 'optional'),
    ('partial_funding', 'noncritical', 'optional'),
    ('travel_coverage', 'noncritical', 'optional'),
    ('accommodation_coverage', 'noncritical', 'optional'),
    ('meals', 'noncritical', 'optional'),
    ('stipend', 'noncritical', 'optional'),
    ('modality', 'conditional', 'conditionally_required'),
    ('country', 'conditional', 'conditionally_required'),
    ('state', 'conditional', 'conditionally_required'),
    ('city', 'conditional', 'conditionally_required'),
    ('duration', 'noncritical', 'optional'),
    ('travel_requirement', 'conditional', 'conditionally_required'),
    ('visa_requirement', 'conditional', 'conditionally_required'),
    ('passport_requirement', 'conditional', 'conditionally_required'),
    ('organizer', 'conditional', 'conditionally_required'),
    ('image', 'noncritical', 'optional')
)
INSERT INTO "field_semantic_states" (
  "edition_id",
  "publication_version_id",
  "field_name",
  "semantic_state",
  "value",
  "criticality",
  "reason_code",
  "public_explanation",
  "gate_impact",
  "resolved_at",
  "last_verified_at"
)
SELECT
  publication_version."edition_id",
  publication_version."id",
  historical_fields.field_name,
  'pending_verification'::"semantic_field_state",
  NULL,
  historical_fields.criticality,
  'historical_value_requires_source_verification',
  historical_fields.field_name || ': o registro histórico ainda precisa ser confrontado com a fonte oficial.',
  CASE
    WHEN historical_fields.criticality = 'critical' THEN 'block'
    WHEN historical_fields.criticality = 'conditional' THEN 'review'
    ELSE 'none'
  END,
  publication_version."created_at",
  edition."last_verified_at"
FROM "publication_versions" AS publication_version
JOIN "editions" AS edition ON edition."id" = publication_version."edition_id"
CROSS JOIN historical_fields
ON CONFLICT ("publication_version_id", "field_name") DO NOTHING;
--> statement-breakpoint
INSERT INTO "field_applicability_assessments" (
  "semantic_state_id",
  "edition_id",
  "field_name",
  "applicability",
  "reason_code",
  "evidence_assertion_ids"
)
SELECT
  semantic_state."id",
  semantic_state."edition_id",
  semantic_state."field_name",
  CASE
    WHEN semantic_state."criticality" = 'critical'
      THEN 'required'::"field_applicability"
    WHEN semantic_state."criticality" = 'conditional'
      THEN 'conditionally_required'::"field_applicability"
    ELSE 'optional'::"field_applicability"
  END,
  'historical_applicability_unverified',
  '{}'::uuid[]
FROM "field_semantic_states" AS semantic_state
ON CONFLICT ("semantic_state_id") DO NOTHING;
--> statement-breakpoint
INSERT INTO "field_source_coverage" (
  "semantic_state_id",
  "edition_id",
  "field_name",
  "coverage_state",
  "unchecked_source_roles",
  "unprocessed_official_documents"
)
SELECT
  semantic_state."id",
  semantic_state."edition_id",
  semantic_state."field_name",
  'unknown'::"source_coverage_state",
  ARRAY['official_program_page', 'official_application_portal', 'official_edital'],
  true
FROM "field_semantic_states" AS semantic_state
ON CONFLICT ("semantic_state_id") DO NOTHING;
--> statement-breakpoint
INSERT INTO "field_display_projections" (
  "semantic_state_id",
  "edition_id",
  "field_name",
  "display_key",
  "display_text"
)
SELECT
  semantic_state."id",
  semantic_state."edition_id",
  semantic_state."field_name",
  semantic_state."field_name" || '.pending_verification',
  CASE semantic_state."field_name"
    WHEN 'age' THEN 'Regra de idade em verificação'
    WHEN 'application_deadline' THEN 'Prazo em verificação'
    WHEN 'application_fee' THEN 'Taxa de inscrição em verificação'
    WHEN 'application_url' THEN 'Link de inscrição em verificação'
    WHEN 'brazilian_eligibility' THEN 'Elegibilidade de brasileiros em verificação'
    WHEN 'citizenship' THEN 'Elegibilidade nacional em verificação'
    WHEN 'modality' THEN 'Modalidade em verificação'
    WHEN 'program_cost' THEN 'Informações de custo em verificação'
    ELSE replace(initcap(replace(semantic_state."field_name", '_', ' ')), 'Url', 'URL') || ' em verificação'
  END
FROM "field_semantic_states" AS semantic_state
ON CONFLICT ("semantic_state_id", "locale") DO NOTHING;
--> statement-breakpoint
WITH latest_versions AS (
  SELECT DISTINCT ON ("edition_id") "edition_id", "id"
  FROM "publication_versions"
  ORDER BY "edition_id", "version" DESC
)
INSERT INTO "review_tasks" (
  "entity_type",
  "entity_id",
  "field_name",
  "reason",
  "severity",
  "candidate_assertion_ids",
  "explanation",
  "status"
)
SELECT
  'edition',
  semantic_state."edition_id",
  semantic_state."field_name",
  'historical_semantic_state_pending',
  'critical'::"review_severity",
  '{}'::uuid[],
  'O estado histórico deste campo é ambíguo. Recapture a fonte oficial; não converta silêncio em ausência de restrição.',
  'open'::"review_task_status"
FROM "field_semantic_states" AS semantic_state
JOIN latest_versions
  ON latest_versions."id" = semantic_state."publication_version_id"
WHERE semantic_state."gate_impact" = 'block'
  AND NOT EXISTS (
    SELECT 1
    FROM "review_tasks" AS existing_task
    WHERE existing_task."entity_id" = semantic_state."edition_id"
      AND existing_task."field_name" = semantic_state."field_name"
      AND existing_task."reason" = 'historical_semantic_state_pending'
      AND existing_task."status" = 'open'
  );
