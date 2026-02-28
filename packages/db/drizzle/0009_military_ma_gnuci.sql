-- Add short_id columns as nullable first
ALTER TABLE "job_applications" ADD COLUMN "short_id" text;--> statement-breakpoint
ALTER TABLE "jobs" ADD COLUMN "short_id" text;--> statement-breakpoint

-- Backfill short_id from existing UUIDs (first 8 chars uppercase, no hyphens)
UPDATE "job_applications" SET "short_id" = UPPER(REPLACE(SUBSTRING(id::text, 1, 13), '-', '')) WHERE "short_id" IS NULL;--> statement-breakpoint
UPDATE "jobs" SET "short_id" = UPPER(REPLACE(SUBSTRING(id::text, 1, 13), '-', '')) WHERE "short_id" IS NULL;--> statement-breakpoint

-- Make columns NOT NULL
ALTER TABLE "job_applications" ALTER COLUMN "short_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "jobs" ALTER COLUMN "short_id" SET NOT NULL;--> statement-breakpoint

-- Add unique constraints
ALTER TABLE "job_applications" ADD CONSTRAINT "job_applications_short_id_unique" UNIQUE("short_id");--> statement-breakpoint
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_short_id_unique" UNIQUE("short_id");