CREATE TABLE "candidate_evaluations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"application_id" uuid NOT NULL,
	"job_id" uuid NOT NULL,
	"organization_id" text NOT NULL,
	"model" text DEFAULT 'sarvam' NOT NULL,
	"score" integer,
	"summary" text,
	"strengths_json" text,
	"weaknesses_json" text,
	"recommendation" text,
	"evidence_json" text,
	"ai_response_json" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "candidate_evaluations" ADD CONSTRAINT "candidate_evaluations_application_id_job_applications_id_fk" FOREIGN KEY ("application_id") REFERENCES "public"."job_applications"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "candidate_evaluations" ADD CONSTRAINT "candidate_evaluations_job_id_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "candidate_evaluations" ADD CONSTRAINT "candidate_evaluations_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE UNIQUE INDEX "candidate_evaluations_application_uidx" ON "candidate_evaluations" USING btree ("application_id");
--> statement-breakpoint
CREATE UNIQUE INDEX "candidate_evaluations_job_application_uidx" ON "candidate_evaluations" USING btree ("job_id","application_id");
