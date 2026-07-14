"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { isValidUrl } from "../../_shared/apply-utils";
import type { ApplyPayload, JobQuestion } from "../../_shared/apply-utils";

const MAX_RESUME_SIZE = 2 * 1024 * 1024;

export function ApplyForm({
  orgSlug,
  jobSlug,
  questions,
  source = "public_link",
}: {
  orgSlug: string;
  jobSlug: string;
  questions: JobQuestion[];
  source?: "public_link" | "embedded_iframe";
}) {
  const [form, setForm] = useState<ApplyPayload>({
    name: "",
    email: "",
    linkedinUrl: "",
    githubUrl: "",
    portfolioUrl: "",
    coverLetter: "",
    source,
    honeypot: "",
  });
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [questionAnswers, setQuestionAnswers] = useState<
    Record<string, string>
  >({});
  const resumeInputRef = useRef<HTMLInputElement | null>(null);

  const onChange = (field: keyof ApplyPayload, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!form.name.trim()) {
      setError("Name is required");
      toast.error("Name is required");
      return;
    }
    if (!form.email.trim()) {
      setError("Email is required");
      toast.error("Email is required");
      return;
    }

    if (!resumeFile) {
      setError("Resume is required");
      toast.error("Resume is required");
      return;
    }

    if (resumeFile.type !== "application/pdf") {
      setError("Resume must be a PDF file");
      toast.error("Resume must be a PDF file");
      return;
    }

    if (resumeFile.size > MAX_RESUME_SIZE) {
      setError("Resume must be under 2MB");
      toast.error("Resume must be under 2MB");
      return;
    }

    const optionalUrls = [
      { value: form.linkedinUrl, label: "LinkedIn URL" },
      { value: form.githubUrl, label: "GitHub URL" },
      { value: form.portfolioUrl, label: "Portfolio URL" },
    ];

    const invalidOptional = optionalUrls.find(
      (item) => item.value && !isValidUrl(item.value),
    );
    if (invalidOptional) {
      setError(`${invalidOptional.label} must be a valid http(s) URL`);
      toast.error(`${invalidOptional.label} must be a valid http(s) URL`);
      return;
    }

    for (const question of questions) {
      if (question.required && !questionAnswers[question.id]?.trim()) {
        setError(`Answer is required for: ${question.prompt}`);
        toast.error(`Answer is required for: ${question.prompt}`);
        return;
      }
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const questionAnswersJson =
        questions.length > 0
          ? JSON.stringify(
              questions
                .map((question) => ({
                  questionId: question.id,
                  answer: questionAnswers[question.id]?.trim() ?? "",
                }))
                .filter((item) => item.answer.length > 0),
            )
          : null;

      const fd = new FormData();
      fd.append("resume", resumeFile);
      fd.append("name", form.name);
      fd.append("email", form.email);
      if (form.linkedinUrl) fd.append("linkedinUrl", form.linkedinUrl);
      if (form.githubUrl) fd.append("githubUrl", form.githubUrl);
      if (form.portfolioUrl) fd.append("portfolioUrl", form.portfolioUrl);
      if (form.coverLetter) fd.append("coverLetter", form.coverLetter);
      if (source) fd.append("source", source);
      if (questionAnswersJson) fd.append("questionAnswers", questionAnswersJson);

      const res = await fetch(
        `/api/public/${encodeURIComponent(orgSlug)}/job/${encodeURIComponent(jobSlug)}/apply`,
        {
          method: "POST",
          body: fd,
        },
      );

      if (!res.ok) {
        const json = (await res.json().catch(() => null)) as {
          error?: { message?: string };
        } | null;
        const message = json?.error?.message || "Failed to submit application";
        setError(message);
        toast.error(message);
        return;
      }

      setSubmitted(true);
      toast.success("Application submitted successfully");
    } catch {
      setError("Failed to submit application");
      toast.error("Failed to submit application");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="rounded-xl border-2 border-emerald-300/60 bg-emerald-50/50 p-8 text-center dark:border-emerald-700/60 dark:bg-emerald-950/20">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/50">
          <svg
            className="h-6 w-6 text-emerald-600 dark:text-emerald-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 13l4 4L19 7"
            />
          </svg>
        </div>
        <h2 className="text-xl font-semibold text-emerald-900 dark:text-emerald-100">
          Application submitted successfully
        </h2>
        <p className="mt-3 text-sm text-emerald-800/80 dark:text-emerald-200/70">
          Thanks for applying! The hiring team will review your profile and
          reach out if there's a good match.
        </p>
      </div>
    );
  }

  return (
    <form
      className={`space-y-8 rounded-xl p-6 sm:p-8 bg-transparent`}
      onSubmit={onSubmit}
    >
      {/* Basic Information Section */}
      <div className="space-y-6">
        <div>
          <h3 className="text-base font-semibold text-foreground">
            Basic Information
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Required fields to get started
          </p>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Full name *</Label>
            <Input
              id="name"
              value={form.name}
              onChange={(e) => onChange("name", e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email *</Label>
            <Input
              id="email"
              type="email"
              value={form.email}
              onChange={(e) => onChange("email", e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="resume">Resume (PDF) *</Label>
            <input
              ref={resumeInputRef}
              id="resume"
              type="file"
              accept=".pdf,application/pdf"
              required
              className="file:text-foreground block w-full rounded-lg border-2 border-slate-300/80 bg-white p-2 text-sm text-muted-foreground file:mr-3 file:cursor-pointer file:rounded-md file:border-0 file:bg-accent file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-accent-foreground hover:file:bg-accent/90 dark:border-slate-700/80 dark:bg-transparent"
              onChange={(e) => {
                const file = e.target.files?.[0] ?? null;
                setResumeFile(file);
              }}
            />
            <p className="text-xs text-muted-foreground">
              PDF only, max 2MB. Your resume text will be extracted and
              analyzed.
            </p>
          </div>
        </div>
      </div>

      {/* Divider */}
      <div className="border-t-2 border-slate-200 dark:border-slate-700" />

      {/* Additional Links Section */}
      <div className="space-y-6">
        <div>
          <h3 className="text-base font-semibold text-foreground">
            Additional Links
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Optional - Help us learn more about your work
          </p>
        </div>

        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="linkedinUrl">LinkedIn</Label>
              <Input
                id="linkedinUrl"
                placeholder="https://linkedin.com/in/..."
                value={form.linkedinUrl || ""}
                onChange={(e) => onChange("linkedinUrl", e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="githubUrl">GitHub</Label>
              <Input
                id="githubUrl"
                placeholder="https://github.com/..."
                value={form.githubUrl || ""}
                onChange={(e) => onChange("githubUrl", e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="portfolioUrl">Portfolio / Website</Label>
            <Input
              id="portfolioUrl"
              placeholder="https://your-portfolio.com"
              value={form.portfolioUrl || ""}
              onChange={(e) => onChange("portfolioUrl", e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Screening Questions Section */}
      {questions.length > 0 ? (
        <>
          <div className="border-t-2 border-slate-200 dark:border-slate-700" />
          <div className="space-y-6">
            <div>
              <h3 className="text-base font-semibold text-foreground">
                Screening Questions
              </h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Help us understand your qualifications
              </p>
            </div>

            <div className="space-y-5">
              {questions.map((question) => (
                <div key={question.id} className="space-y-2">
                  <Label htmlFor={question.id}>
                    {question.prompt}
                    {question.required ? " *" : ""}
                  </Label>
                  <Textarea
                    id={question.id}
                    rows={3}
                    value={questionAnswers[question.id] ?? ""}
                    onChange={(event) =>
                      setQuestionAnswers((prev) => ({
                        ...prev,
                        [question.id]: event.target.value,
                      }))
                    }
                    placeholder="Type your answer"
                    className="resize-none"
                  />
                </div>
              ))}
            </div>
          </div>
        </>
      ) : null}

      {/* Cover Letter Section */}
      <div className="border-t-2 border-slate-200 dark:border-slate-700" />
      <div className="space-y-6">
        <div>
          <h3 className="text-base font-semibold text-foreground">
            Cover Letter
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Optional - Tell us why you're interested
          </p>
        </div>

        <div className="space-y-2">
          <Textarea
            id="coverLetter"
            rows={6}
            value={form.coverLetter || ""}
            onChange={(e) => onChange("coverLetter", e.target.value)}
            placeholder="Share why you're a strong fit for this role and what excites you about this opportunity..."
            className="resize-none"
          />
        </div>
      </div>

      {/* Honeypot */}
      <div className="hidden" aria-hidden="true">
        <Label htmlFor="company">Company</Label>
        <Input
          id="company"
          autoComplete="off"
          tabIndex={-1}
          value={form.honeypot || ""}
          onChange={(e) => onChange("honeypot", e.target.value)}
        />
      </div>

      {/* Error & Submit */}
      <div className="space-y-4 pt-2">
        {error ? (
          <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800 dark:border-red-800/50 dark:bg-red-950/20 dark:text-red-400">
            {error}
          </div>
        ) : null}

        <Button
          type="submit"
          size="lg"
          className="w-full cursor-pointer sm:w-auto"
          disabled={isSubmitting}
        >
          {isSubmitting ? "Submitting..." : "Submit application"}
        </Button>
      </div>
    </form>
  );
}
