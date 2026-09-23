DO $$ BEGIN
  CREATE TYPE "application_link_status" AS ENUM(
    'unchecked',
    'current_and_open',
    'current_but_not_open',
    'closed',
    'old_edition',
    'generic_homepage',
    'results_page',
    'login_only',
    'broken',
    'redirected',
    'blocked',
    'unknown'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  CREATE TYPE "brazil_eligibility_status" AS ENUM(
    'eligible',
    'likely_eligible',
    'ineligible',
    'unknown',
    'conflicting'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  CREATE TYPE "deadline_precision" AS ENUM(
    'date_only',
    'local_time',
    'instant',
    'rolling',
    'unknown'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  CREATE TYPE "editorial_state" AS ENUM(
    'draft',
    'needs_review',
    'approved',
    'published',
    'update_pending',
    'rejected',
    'archived',
    'unpublished'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  CREATE TYPE "lifecycle_state" AS ENUM(
    'expected',
    'announced',
    'applications_not_open',
    'open',
    'closing_soon',
    'extended',
    'closed',
    'cancelled',
    'completed',
    'archived',
    'unknown'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  CREATE TYPE "publication_gate_outcome" AS ENUM(
    'auto_ready',
    'manual_review',
    'reject',
    'expired_archive'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  CREATE TYPE "review_severity" AS ENUM('low', 'medium', 'high', 'critical');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  CREATE TYPE "review_task_status" AS ENUM('open', 'resolved', 'dismissed');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "organizations" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "canonical_name" text NOT NULL,
  "aliases" text[] DEFAULT '{}'::text[] NOT NULL,
  "organization_type" text,
  "country_code" text,
  "official_domains" text[] DEFAULT '{}'::text[] NOT NULL,
  "verified" boolean DEFAULT false NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "sources" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "organization_id" uuid REFERENCES "organizations"("id"),
  "name" text NOT NULL,
  "base_url" text NOT NULL,
  "source_type" text NOT NULL,
  "authority_tier" smallint NOT NULL,
  "language" text DEFAULT 'pt-BR' NOT NULL,
  "allowed_paths" text[] DEFAULT '{}'::text[] NOT NULL,
  "blocked_paths" text[] DEFAULT '{}'::text[] NOT NULL,
  "discovery_methods" text[] DEFAULT '{}'::text[] NOT NULL,
  "crawl_interval_hours" integer NOT NULL,
  "rate_limit_per_minute" integer NOT NULL,
  "concurrency_limit" integer NOT NULL,
  "rendering_policy" text NOT NULL,
  "adapter_name" text,
  "adapter_version" text,
  "expected_cycles" text[] DEFAULT '{}'::text[] NOT NULL,
  "expected_page_roles" text[] DEFAULT '{}'::text[] NOT NULL,
  "review_owner" text,
  "health_state" text DEFAULT 'unknown' NOT NULL,
  "enabled" boolean DEFAULT true NOT NULL,
  "last_success_at" timestamp with time zone,
  "last_change_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "source_documents" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "source_id" uuid NOT NULL REFERENCES "sources"("id"),
  "url" text NOT NULL,
  "canonical_url" text NOT NULL,
  "document_role" text DEFAULT 'unknown' NOT NULL,
  "content_type" text,
  "first_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
  "last_seen_at" timestamp with time zone,
  "last_changed_at" timestamp with time zone,
  "operational_state" text DEFAULT 'discovered' NOT NULL,
  "program_hint" text,
  "edition_hint" text
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "snapshots" (
  "id" uuid PRIMARY KEY,
  "source_document_id" uuid NOT NULL REFERENCES "source_documents"("id"),
  "fetched_at" timestamp with time zone NOT NULL,
  "final_url" text NOT NULL,
  "status_code" smallint NOT NULL,
  "headers" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "fetch_mode" text NOT NULL,
  "content_hash" text NOT NULL,
  "semantic_hash" text,
  "storage_key" text NOT NULL,
  "raw_content" text,
  "redirect_chain" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "extractor_version" text,
  "elapsed_ms" integer,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "extraction_runs" (
  "id" uuid PRIMARY KEY,
  "snapshot_id" uuid NOT NULL REFERENCES "snapshots"("id"),
  "pipeline_version" text NOT NULL,
  "started_at" timestamp with time zone NOT NULL,
  "completed_at" timestamp with time zone,
  "page_role" text NOT NULL,
  "status" text NOT NULL,
  "error_type" text,
  "duration_ms" integer,
  "assertion_count" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "programs" (
  "id" uuid PRIMARY KEY,
  "canonical_name" text NOT NULL,
  "aliases" text[] DEFAULT '{}'::text[] NOT NULL,
  "organizer_id" uuid REFERENCES "organizations"("id"),
  "opportunity_types" text[] DEFAULT '{}'::text[] NOT NULL,
  "subject_areas" text[] DEFAULT '{}'::text[] NOT NULL,
  "typical_cycle" text,
  "official_homepage" text,
  "active" boolean DEFAULT true NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "editions" (
  "id" uuid PRIMARY KEY,
  "program_id" uuid NOT NULL REFERENCES "programs"("id"),
  "identity_key" text NOT NULL,
  "edition_label" text NOT NULL,
  "edition_year" integer,
  "cycle" text,
  "start_date" date,
  "end_date" date,
  "status" "lifecycle_state" DEFAULT 'unknown' NOT NULL,
  "first_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
  "last_verified_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "application_rounds" (
  "id" uuid PRIMARY KEY,
  "edition_id" uuid NOT NULL REFERENCES "editions"("id"),
  "round_key" text NOT NULL,
  "round_name" text NOT NULL,
  "opens_at" timestamp with time zone,
  "deadline_date" date,
  "deadline_time" time,
  "deadline_timezone" text,
  "deadline_precision" "deadline_precision" DEFAULT 'unknown' NOT NULL,
  "deadline_type" text NOT NULL,
  "application_url" text,
  "status" "lifecycle_state" DEFAULT 'unknown' NOT NULL,
  "region" text,
  "audience" text[] DEFAULT '{}'::text[] NOT NULL,
  "supersedes_round_id" uuid REFERENCES "application_rounds"("id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "field_assertions" (
  "id" uuid PRIMARY KEY,
  "extraction_run_id" uuid NOT NULL REFERENCES "extraction_runs"("id"),
  "snapshot_id" uuid NOT NULL REFERENCES "snapshots"("id"),
  "source_document_id" uuid NOT NULL REFERENCES "source_documents"("id"),
  "field_name" text NOT NULL,
  "normalized_value" jsonb,
  "raw_value" text NOT NULL,
  "evidence_text" text,
  "evidence_locator" text,
  "extractor" text NOT NULL,
  "source_authority" smallint NOT NULL,
  "document_role" text NOT NULL,
  "asserted_at" timestamp with time zone NOT NULL,
  "valid_from" timestamp with time zone,
  "valid_until" timestamp with time zone,
  "edition_signal" text,
  "validation_status" text NOT NULL,
  "critical" boolean DEFAULT false NOT NULL,
  "supersedes_assertion_id" uuid REFERENCES "field_assertions"("id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "resolved_fields" (
  "entity_type" text NOT NULL,
  "entity_id" uuid NOT NULL,
  "field_name" text NOT NULL,
  "resolved_value" jsonb,
  "selected_assertion_ids" uuid[] DEFAULT '{}'::uuid[] NOT NULL,
  "alternative_assertion_ids" uuid[] DEFAULT '{}'::uuid[] NOT NULL,
  "conflict" boolean DEFAULT false NOT NULL,
  "resolution_reason" text NOT NULL,
  "selected_authority" smallint,
  "resolved_at" timestamp with time zone DEFAULT now() NOT NULL,
  PRIMARY KEY("entity_type", "entity_id", "field_name")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "eligibility_profiles" (
  "edition_id" uuid PRIMARY KEY REFERENCES "editions"("id"),
  "brazil_status" "brazil_eligibility_status" NOT NULL,
  "citizenship_scope" text NOT NULL,
  "residence_scope" text NOT NULL,
  "included_nationalities" text[] DEFAULT '{}'::text[] NOT NULL,
  "excluded_nationalities" text[] DEFAULT '{}'::text[] NOT NULL,
  "eligible_regions" text[] DEFAULT '{}'::text[] NOT NULL,
  "residence_regions" text[] DEFAULT '{}'::text[] NOT NULL,
  "school_location_requirements" text[] DEFAULT '{}'::text[] NOT NULL,
  "education_levels" text[] DEFAULT '{}'::text[] NOT NULL,
  "grade_requirements" text[] DEFAULT '{}'::text[] NOT NULL,
  "institutional_restrictions" text[] DEFAULT '{}'::text[] NOT NULL,
  "language_requirements" text[] DEFAULT '{}'::text[] NOT NULL,
  "other_requirements" text[] DEFAULT '{}'::text[] NOT NULL,
  "source_assertion_ids" uuid[] DEFAULT '{}'::uuid[] NOT NULL,
  "conflicting_assertion_ids" uuid[] DEFAULT '{}'::uuid[] NOT NULL,
  "unknowns" text[] DEFAULT '{}'::text[] NOT NULL,
  "interpreted_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "eligibility_age_rules" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "edition_id" uuid NOT NULL REFERENCES "editions"("id"),
  "identity_key" text NOT NULL,
  "minimum_age" smallint,
  "maximum_age" smallint,
  "minimum_inclusive" boolean DEFAULT true NOT NULL,
  "maximum_inclusive" boolean DEFAULT true NOT NULL,
  "exact_age" smallint,
  "birthdate_start" date,
  "birthdate_end" date,
  "birthdate_start_inclusive" boolean DEFAULT true NOT NULL,
  "birthdate_end_inclusive" boolean DEFAULT true NOT NULL,
  "reference_type" text NOT NULL,
  "reference_date" date,
  "source_text" text NOT NULL,
  "source_assertion_ids" uuid[] DEFAULT '{}'::uuid[] NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "application_link_assessments" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "application_round_id" uuid NOT NULL REFERENCES "application_rounds"("id"),
  "status" "application_link_status" NOT NULL,
  "original_url" text,
  "final_url" text,
  "http_status" smallint,
  "document_role" text,
  "edition_year" integer,
  "accepts_submissions" boolean,
  "redirect_chain" text[] DEFAULT '{}'::text[] NOT NULL,
  "checked_at" timestamp with time zone,
  "reasons" text[] DEFAULT '{}'::text[] NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "product_fit_assessments" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "edition_id" uuid NOT NULL REFERENCES "editions"("id"),
  "decision" text NOT NULL,
  "reasons" text[] DEFAULT '{}'::text[] NOT NULL,
  "explanations" text[] DEFAULT '{}'::text[] NOT NULL,
  "evidence_assertion_ids" uuid[] DEFAULT '{}'::uuid[] NOT NULL,
  "site_collection" text NOT NULL,
  "mapped_opportunity_types" text[] DEFAULT '{}'::text[] NOT NULL,
  "mapped_education_levels" text[] DEFAULT '{}'::text[] NOT NULL,
  "unmapped_values" text[] DEFAULT '{}'::text[] NOT NULL,
  "site_contract_compatible" boolean DEFAULT false NOT NULL,
  "measured_cohort_eligible" boolean DEFAULT false NOT NULL,
  "assessed_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "review_tasks" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "entity_type" text NOT NULL,
  "entity_id" uuid NOT NULL,
  "field_name" text NOT NULL,
  "reason" text NOT NULL,
  "severity" "review_severity" NOT NULL,
  "candidate_assertion_ids" uuid[] DEFAULT '{}'::uuid[] NOT NULL,
  "suggested_value" jsonb,
  "previous_value" jsonb,
  "explanation" text NOT NULL,
  "status" "review_task_status" DEFAULT 'open' NOT NULL,
  "reviewer_id" uuid REFERENCES "users"("id"),
  "resolution" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "resolved_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "reviewer_corrections" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "review_task_id" uuid REFERENCES "review_tasks"("id"),
  "edition_id" uuid NOT NULL REFERENCES "editions"("id"),
  "field_name" text NOT NULL,
  "assertion_id" uuid NOT NULL REFERENCES "field_assertions"("id"),
  "previous_value" jsonb,
  "corrected_value" jsonb,
  "correction_reason" text NOT NULL,
  "reviewer_id" uuid NOT NULL REFERENCES "users"("id"),
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "publication_versions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "edition_id" uuid NOT NULL REFERENCES "editions"("id"),
  "version" integer NOT NULL,
  "editorial_state" "editorial_state" DEFAULT 'draft' NOT NULL,
  "payload" jsonb NOT NULL,
  "compatibility_payload" jsonb NOT NULL,
  "supporting_assertion_ids" uuid[] DEFAULT '{}'::uuid[] NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "created_by" text NOT NULL,
  "approved_by" uuid REFERENCES "users"("id"),
  "approved_at" timestamp with time zone,
  "supersedes_version_id" uuid REFERENCES "publication_versions"("id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "publication_gate_decisions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "edition_id" uuid NOT NULL REFERENCES "editions"("id"),
  "publication_version_id" uuid NOT NULL REFERENCES "publication_versions"("id"),
  "product_fit_assessment_id" uuid REFERENCES "product_fit_assessments"("id"),
  "outcome" "publication_gate_outcome" NOT NULL,
  "reasons" text[] DEFAULT '{}'::text[] NOT NULL,
  "blocking_fields" text[] DEFAULT '{}'::text[] NOT NULL,
  "explanations" text[] DEFAULT '{}'::text[] NOT NULL,
  "source_cohort" text,
  "source_cohort_measured" boolean DEFAULT false NOT NULL,
  "decided_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "outbox_events" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "aggregate_type" text NOT NULL,
  "aggregate_id" uuid NOT NULL,
  "event_type" text NOT NULL,
  "payload" jsonb NOT NULL,
  "deduplication_key" text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "available_at" timestamp with time zone DEFAULT now() NOT NULL,
  "published_at" timestamp with time zone,
  "attempts" integer DEFAULT 0 NOT NULL,
  "last_error" text,
  "locked_at" timestamp with time zone,
  "locked_by" text,
  "dead_lettered_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "idempotency_requests" (
  "scope" text NOT NULL,
  "key" text NOT NULL,
  "request_hash" text NOT NULL,
  "response_status" smallint,
  "response_body" jsonb,
  "state" text DEFAULT 'processing' NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "completed_at" timestamp with time zone,
  "expires_at" timestamp with time zone NOT NULL,
  PRIMARY KEY("scope", "key")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "application_fees" (
  "edition_id" uuid PRIMARY KEY REFERENCES "editions"("id"),
  "is_free" boolean,
  "application_fee_amount" numeric(14,2),
  "program_fee_amount" numeric(14,2),
  "currency" text,
  "mandatory_extra_costs" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "funding" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "benefits" text[] DEFAULT '{}'::text[] NOT NULL,
  "source_assertion_ids" uuid[] DEFAULT '{}'::uuid[] NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "organizations_canonical_name_key"
  ON "organizations" ("canonical_name");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "sources_base_url_key"
  ON "sources" ("base_url");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "source_documents_source_canonical_key"
  ON "source_documents" ("source_id", "canonical_url");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "source_documents_due_idx"
  ON "source_documents" ("operational_state", "last_seen_at");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "snapshots_document_content_key"
  ON "snapshots" ("source_document_id", "content_hash");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "snapshots_document_fetched_idx"
  ON "snapshots" ("source_document_id", "fetched_at");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "extraction_runs_snapshot_idx"
  ON "extraction_runs" ("snapshot_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "programs_canonical_name_idx"
  ON "programs" ("canonical_name");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "programs_organizer_idx"
  ON "programs" ("organizer_id");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "editions_program_identity_key"
  ON "editions" ("program_id", "identity_key");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "editions_status_idx"
  ON "editions" ("status", "last_verified_at");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "application_rounds_edition_key"
  ON "application_rounds" ("edition_id", "round_key");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "application_rounds_deadline_idx"
  ON "application_rounds" ("status", "deadline_date");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "field_assertions_field_idx"
  ON "field_assertions" ("field_name", "asserted_at");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "field_assertions_document_idx"
  ON "field_assertions" ("source_document_id", "field_name");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "eligibility_age_rules_identity_key"
  ON "eligibility_age_rules" ("edition_id", "identity_key");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "application_link_assessments_round_idx"
  ON "application_link_assessments" ("application_round_id", "created_at");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "product_fit_assessments_edition_idx"
  ON "product_fit_assessments" ("edition_id", "assessed_at");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "review_tasks_open_idx"
  ON "review_tasks" ("status", "severity", "created_at");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "reviewer_corrections_edition_idx"
  ON "reviewer_corrections" ("edition_id", "created_at");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "publication_versions_edition_version_key"
  ON "publication_versions" ("edition_id", "version");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "publication_gate_decisions_edition_idx"
  ON "publication_gate_decisions" ("edition_id", "decided_at");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "outbox_events_deduplication_key"
  ON "outbox_events" ("deduplication_key");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "outbox_events_pending_idx"
  ON "outbox_events" ("published_at", "available_at");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idempotency_requests_expiry_idx"
  ON "idempotency_requests" ("expires_at");
--> statement-breakpoint
ALTER TABLE "opportunities"
  ADD COLUMN IF NOT EXISTS "official_information_url" text,
  ADD COLUMN IF NOT EXISTS "application_url" text,
  ADD COLUMN IF NOT EXISTS "publication_version_id" uuid,
  ADD COLUMN IF NOT EXISTS "lifecycle_status" "lifecycle_state",
  ADD COLUMN IF NOT EXISTS "last_verified_at" timestamp with time zone;
--> statement-breakpoint
ALTER TABLE "national_opportunities"
  ADD COLUMN IF NOT EXISTS "official_information_url" text,
  ADD COLUMN IF NOT EXISTS "application_url" text,
  ADD COLUMN IF NOT EXISTS "publication_version_id" uuid,
  ADD COLUMN IF NOT EXISTS "lifecycle_status" "lifecycle_state",
  ADD COLUMN IF NOT EXISTS "last_verified_at" timestamp with time zone;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "opportunities"
    ADD CONSTRAINT "opportunities_publication_version_id_fkey"
    FOREIGN KEY ("publication_version_id") REFERENCES "publication_versions"("id");
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "national_opportunities"
    ADD CONSTRAINT "national_opportunities_publication_version_id_fkey"
    FOREIGN KEY ("publication_version_id") REFERENCES "publication_versions"("id");
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
