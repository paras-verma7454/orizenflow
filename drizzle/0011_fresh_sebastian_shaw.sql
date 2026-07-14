ALTER TABLE "job_applications" ALTER COLUMN "resume_url" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "job_applications" ADD COLUMN "resume_text" text;