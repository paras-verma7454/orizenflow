ALTER TABLE "jobs" DROP COLUMN IF EXISTS "is_remote";--> statement-breakpoint
ALTER TABLE "jobs" ADD COLUMN "job_type" text DEFAULT 'on-site' NOT NULL;
