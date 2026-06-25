ALTER TABLE "candidate_evaluations" ADD COLUMN "status" text DEFAULT 'pending' NOT NULL;--> statement-breakpoint
ALTER TABLE "candidate_evaluations" ADD COLUMN "evaluation_method" text;