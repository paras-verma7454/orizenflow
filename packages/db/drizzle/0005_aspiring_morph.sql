CREATE TABLE "job_applications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"job_id" uuid NOT NULL,
	"organization_id" text NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"resume_url" text NOT NULL,
	"linkedin_url" text,
	"github_url" text,
	"portfolio_url" text,
	"cover_letter" text,
	"source_url" text,
	"ip" text,
	"user_agent" text,
	"status" text DEFAULT 'applied' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "jobs" ADD COLUMN "slug" text;--> statement-breakpoint
UPDATE "jobs"
SET "slug" = CONCAT(
	REGEXP_REPLACE(LOWER("title"), '[^a-z0-9]+', '-', 'g'),
	'-',
	LEFT(REPLACE("id"::text, '-', ''), 6)
)
WHERE "slug" IS NULL;--> statement-breakpoint
ALTER TABLE "jobs" ALTER COLUMN "slug" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "job_applications" ADD CONSTRAINT "job_applications_job_id_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "job_applications" ADD CONSTRAINT "job_applications_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "job_applications_job_email_uidx" ON "job_applications" USING btree ("job_id","email");--> statement-breakpoint
CREATE UNIQUE INDEX "jobs_organization_slug_uidx" ON "jobs" USING btree ("organization_id","slug");