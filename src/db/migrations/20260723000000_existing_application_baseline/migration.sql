CREATE TABLE IF NOT EXISTS "users" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "name" text NOT NULL,
  "email" text NOT NULL UNIQUE,
  "email_verified" boolean DEFAULT false NOT NULL,
  "image" text,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL,
  "role" text,
  "banned" boolean DEFAULT false,
  "ban_reason" text,
  "ban_expires" timestamp
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "accounts" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "account_id" text NOT NULL,
  "provider_id" text NOT NULL,
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "access_token" text,
  "refresh_token" text,
  "id_token" text,
  "access_token_expires_at" timestamp,
  "refresh_token_expires_at" timestamp,
  "scope" text,
  "password" text,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "sessions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "expires_at" timestamp NOT NULL,
  "token" text NOT NULL UNIQUE,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL,
  "ip_address" text,
  "user_agent" text,
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "impersonated_by" text
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "verifications" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "identifier" text NOT NULL,
  "value" text NOT NULL,
  "expires_at" timestamp NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "opportunities" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "name" text NOT NULL,
  "image" text NOT NULL,
  "country" text NOT NULL,
  "city" text NOT NULL,
  "responsible_institution" text NOT NULL,
  "type" text NOT NULL,
  "description" text NOT NULL,
  "education_level" text NOT NULL,
  "age_range" text NOT NULL,
  "language_requirements" text NOT NULL,
  "specific_requirements" text NOT NULL,
  "application_fee" text NOT NULL,
  "scholarship_type" text NOT NULL,
  "scholarship_coverage" text NOT NULL,
  "extra_costs" text NOT NULL,
  "duration" text NOT NULL,
  "application_deadline" date NOT NULL,
  "selection_steps" text NOT NULL,
  "application_process" text NOT NULL,
  "official_link" text NOT NULL,
  "contact" text NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "national_opportunities" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "name" text NOT NULL,
  "image" text NOT NULL,
  "country" text NOT NULL,
  "type" text NOT NULL,
  "education_level" text NOT NULL,
  "modality" text NOT NULL,
  "application_deadline" date NOT NULL,
  "about" text NOT NULL,
  "short_description" text NOT NULL,
  "duration" text NOT NULL,
  "city_state" text NOT NULL,
  "age_range" text NOT NULL,
  "requirements" text NOT NULL,
  "specific_requirements" text NOT NULL,
  "responsible_institution" text NOT NULL,
  "application_fee" text NOT NULL,
  "benefits" text NOT NULL,
  "costs" text NOT NULL,
  "extra_costs" text NOT NULL,
  "selection_steps" text NOT NULL,
  "official_link" text NOT NULL,
  "contact" text NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "favorite_opportunities" (
  "user_id" uuid NOT NULL REFERENCES "users"("id"),
  "opportunity_id" uuid NOT NULL REFERENCES "opportunities"("id"),
  "created_at" timestamp DEFAULT now() NOT NULL,
  PRIMARY KEY ("user_id", "opportunity_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "favorite_national_opportunities" (
  "user_id" uuid NOT NULL REFERENCES "users"("id"),
  "national_opportunity_id" uuid NOT NULL REFERENCES "national_opportunities"("id"),
  "created_at" timestamp DEFAULT now() NOT NULL,
  PRIMARY KEY ("user_id", "national_opportunity_id")
);
