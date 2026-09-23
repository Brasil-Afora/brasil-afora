-- BF-10: one row per supervised source run. Answers "was the run itself healthy
-- enough to trust, and may missing-record reconciliation use it?" Delivery
-- outcomes are derived from recrawl_jobs linked through payload->>'source_run_id'.
-- sources.last_success_at is NOT a run-health signal (every ingestion writes it);
-- the last healthy completion is max(finished_at) WHERE status = 'healthy'.
CREATE TABLE IF NOT EXISTS "source_runs" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "source_id" uuid NOT NULL REFERENCES "sources"("id"),
  "trigger" text NOT NULL,
  "requested_by" text NOT NULL,
  "adapter_version" text,
  "status" text NOT NULL DEFAULT 'running'
    CONSTRAINT "source_runs_status_check"
    CHECK ("status" IN ('running', 'healthy', 'degraded', 'failed')),
  "started_at" timestamp with time zone NOT NULL DEFAULT now(),
  "finished_at" timestamp with time zone,
  "discovery_completed" boolean NOT NULL DEFAULT false,
  "pages_expected" integer NOT NULL DEFAULT 0,
  "pages_attempted" integer NOT NULL DEFAULT 0,
  "pages_succeeded" integer NOT NULL DEFAULT 0,
  "pages_failed" integer NOT NULL DEFAULT 0,
  "candidates_discovered" integer NOT NULL DEFAULT 0,
  "candidates_valid" integer NOT NULL DEFAULT 0,
  "candidates_rejected" integer NOT NULL DEFAULT 0,
  "ingestion_successes" integer NOT NULL DEFAULT 0,
  "ingestion_failures" integer NOT NULL DEFAULT 0,
  "reconciliation_eligible" boolean NOT NULL DEFAULT false,
  "error_categories" text[] NOT NULL DEFAULT '{}',
  "error_summary" text,
  "report" jsonb NOT NULL DEFAULT '{}'::jsonb,
  CONSTRAINT "source_runs_eligible_only_when_healthy_check"
    CHECK (NOT "reconciliation_eligible" OR "status" = 'healthy'),
  CONSTRAINT "source_runs_finished_when_terminal_check"
    CHECK (("status" = 'running') = ("finished_at" IS NULL))
);

CREATE INDEX IF NOT EXISTS "source_runs_source_started_idx"
  ON "source_runs" ("source_id", "started_at");

CREATE UNIQUE INDEX IF NOT EXISTS "source_runs_one_running_per_source"
  ON "source_runs" ("source_id") WHERE "status" = 'running';

-- Completion derives delivery outcomes from the jobs a run enqueued.
CREATE INDEX IF NOT EXISTS "recrawl_jobs_source_run_idx"
  ON "recrawl_jobs" (("payload"->>'source_run_id'))
  WHERE "payload" ? 'source_run_id';
