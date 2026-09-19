ALTER TABLE "recrawl_jobs" ADD COLUMN IF NOT EXISTS "lease_token" uuid;
