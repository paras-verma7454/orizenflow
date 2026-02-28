import { integer, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { organization } from "./auth";

export const jobs = pgTable(
  "jobs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    shortId: text("short_id").notNull().unique(),
    title: text("title").notNull(),
    slug: text("slug").notNull(),
    description: text("description").notNull(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    status: text("status").notNull().default("draft"), // draft, open, closed, filled
    jobType: text("job_type").notNull().default("on-site"), // remote, hybrid, on-site
    location: text("location"),
    salaryRange: text("salary_range"),
    questionsJson: text("questions_json"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [uniqueIndex("jobs_organization_slug_uidx").on(table.organizationId, table.slug)],
);

export const jobApplications = pgTable(
  "job_applications",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    shortId: text("short_id").notNull().unique(),
    jobId: uuid("job_id")
      .notNull()
      .references(() => jobs.id, { onDelete: "cascade" }),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    email: text("email").notNull(),
    resumeUrl: text("resume_url").notNull(),
    linkedinUrl: text("linkedin_url"),
    githubUrl: text("github_url"),
    portfolioUrl: text("portfolio_url"),
    coverLetter: text("cover_letter"),
    questionAnswersJson: text("question_answers_json"),
    sourceUrl: text("source_url"),
    ip: text("ip"),
    userAgent: text("user_agent"),
    status: text("status").notNull().default("applied"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("job_applications_job_email_uidx").on(table.jobId, table.email),
  ],
);

export const candidateEvaluations = pgTable(
  "candidate_evaluations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    applicationId: uuid("application_id")
      .notNull()
      .references(() => jobApplications.id, { onDelete: "cascade" }),
    jobId: uuid("job_id")
      .notNull()
      .references(() => jobs.id, { onDelete: "cascade" }),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    model: text("model").notNull().default("sarvam"),
    score: integer("score"),
    skillsJson: text("skills_json"),
    resumeTextExcerpt: text("resume_text_excerpt"),
    summary: text("summary"),
    strengthsJson: text("strengths_json"),
    weaknessesJson: text("weaknesses_json"),
    recommendation: text("recommendation"),
    evidenceJson: text("evidence_json"),
    aiResponseJson: text("ai_response_json"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("candidate_evaluations_application_uidx").on(table.applicationId),
    uniqueIndex("candidate_evaluations_job_application_uidx").on(table.jobId, table.applicationId),
  ],
);
