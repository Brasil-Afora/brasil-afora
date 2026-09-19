CREATE TABLE "edition_source_documents" (
	"edition_id" uuid,
	"source_document_id" uuid,
	"relationship_role" text,
	"authoritative" boolean DEFAULT false NOT NULL,
	"first_linked_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "edition_source_documents_pkey" PRIMARY KEY("edition_id","source_document_id","relationship_role")
);
--> statement-breakpoint
CREATE TABLE "material_change_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"edition_id" uuid NOT NULL,
	"publication_version_id" uuid,
	"snapshot_id" uuid NOT NULL,
	"field_name" text NOT NULL,
	"previous_value" jsonb,
	"current_value" jsonb,
	"previous_assertion_ids" uuid[] DEFAULT '{}'::uuid[] NOT NULL,
	"current_assertion_ids" uuid[] DEFAULT '{}'::uuid[] NOT NULL,
	"severity" "review_severity" NOT NULL,
	"review_task_id" uuid,
	"detected_at" timestamp with time zone DEFAULT now() NOT NULL,
	"acknowledged_at" timestamp with time zone,
	"acknowledged_by" uuid
);
--> statement-breakpoint
CREATE TABLE "recrawl_jobs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"job_kind" text NOT NULL,
	"source_id" uuid,
	"source_document_id" uuid,
	"application_round_id" uuid,
	"edition_id" uuid,
	"reason" text NOT NULL,
	"priority" smallint NOT NULL,
	"status" text DEFAULT 'queued' NOT NULL,
	"deduplication_key" text NOT NULL,
	"scheduled_for" timestamp with time zone DEFAULT now() NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"max_attempts" integer DEFAULT 5 NOT NULL,
	"locked_at" timestamp with time zone,
	"locked_by" text,
	"started_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"last_error" text,
	"payload" jsonb DEFAULT '{}' NOT NULL,
	"requested_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "edition_source_documents_document_idx" ON "edition_source_documents" ("source_document_id");--> statement-breakpoint
CREATE INDEX "material_change_events_edition_idx" ON "material_change_events" ("edition_id","detected_at");--> statement-breakpoint
CREATE UNIQUE INDEX "recrawl_jobs_deduplication_key" ON "recrawl_jobs" ("deduplication_key");--> statement-breakpoint
CREATE INDEX "recrawl_jobs_due_idx" ON "recrawl_jobs" ("status","scheduled_for","priority");--> statement-breakpoint
CREATE INDEX "recrawl_jobs_edition_idx" ON "recrawl_jobs" ("edition_id","created_at");--> statement-breakpoint
ALTER TABLE "edition_source_documents" ADD CONSTRAINT "edition_source_documents_edition_id_editions_id_fkey" FOREIGN KEY ("edition_id") REFERENCES "editions"("id");--> statement-breakpoint
ALTER TABLE "edition_source_documents" ADD CONSTRAINT "edition_source_documents_HAylaYc6wgjQ_fkey" FOREIGN KEY ("source_document_id") REFERENCES "source_documents"("id");--> statement-breakpoint
ALTER TABLE "material_change_events" ADD CONSTRAINT "material_change_events_edition_id_editions_id_fkey" FOREIGN KEY ("edition_id") REFERENCES "editions"("id");--> statement-breakpoint
ALTER TABLE "material_change_events" ADD CONSTRAINT "material_change_events_lHUk8UOl8kTX_fkey" FOREIGN KEY ("publication_version_id") REFERENCES "publication_versions"("id");--> statement-breakpoint
ALTER TABLE "material_change_events" ADD CONSTRAINT "material_change_events_snapshot_id_snapshots_id_fkey" FOREIGN KEY ("snapshot_id") REFERENCES "snapshots"("id");--> statement-breakpoint
ALTER TABLE "material_change_events" ADD CONSTRAINT "material_change_events_review_task_id_review_tasks_id_fkey" FOREIGN KEY ("review_task_id") REFERENCES "review_tasks"("id");--> statement-breakpoint
ALTER TABLE "material_change_events" ADD CONSTRAINT "material_change_events_acknowledged_by_users_id_fkey" FOREIGN KEY ("acknowledged_by") REFERENCES "users"("id");--> statement-breakpoint
ALTER TABLE "recrawl_jobs" ADD CONSTRAINT "recrawl_jobs_source_id_sources_id_fkey" FOREIGN KEY ("source_id") REFERENCES "sources"("id");--> statement-breakpoint
ALTER TABLE "recrawl_jobs" ADD CONSTRAINT "recrawl_jobs_source_document_id_source_documents_id_fkey" FOREIGN KEY ("source_document_id") REFERENCES "source_documents"("id");--> statement-breakpoint
ALTER TABLE "recrawl_jobs" ADD CONSTRAINT "recrawl_jobs_application_round_id_application_rounds_id_fkey" FOREIGN KEY ("application_round_id") REFERENCES "application_rounds"("id");--> statement-breakpoint
ALTER TABLE "recrawl_jobs" ADD CONSTRAINT "recrawl_jobs_edition_id_editions_id_fkey" FOREIGN KEY ("edition_id") REFERENCES "editions"("id");