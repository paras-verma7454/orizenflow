"use client";

import Script from "next/script";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { config } from "@/lib/config";

declare global {
  interface Window {
    turnstile?: {
      render: (
        container: string | HTMLElement,
        options: {
          sitekey: string;
          action?: string;
          callback: (token: string) => void;
          "expired-callback"?: () => void;
          "error-callback"?: () => void;
        },
      ) => string;
      reset: (widgetId?: string) => void;
    };
  }
}

type ApplyPayload = {
  name: string;
  email: string;
  resumeUrl: string;
  linkedinUrl?: string;
  githubUrl?: string;
  portfolioUrl?: string;
  coverLetter?: string;
  questionAnswers?: Array<{ questionId: string; answer: string }>;
  source?: "public_link" | "embedded_iframe";
  captchaToken: string;
  honeypot?: string;
};

type JobQuestion = {
  id: string;
  prompt: string;
  required: boolean;
};

function isValidUrl(value: string) {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

function isValidResumeLink(value: string) {
  try {
    const parsed = new URL(value);
    if (!(parsed.protocol === "http:" || parsed.protocol === "https:"))
      return false;
    const isDrive = parsed.hostname === "drive.google.com";
    const isPdf = parsed.pathname.toLowerCase().endsWith(".pdf");
    return isDrive || isPdf;
  } catch {
    return false;
  }
}

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
    resumeUrl: "",
    linkedinUrl: "",
    githubUrl: "",
    portfolioUrl: "",
    coverLetter: "",
    source,
    captchaToken: "",
    honeypot: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [questionAnswers, setQuestionAnswers] = useState<
    Record<string, string>
  >({});
  const [captchaToken, setCaptchaToken] = useState("");
  const [captchaReady, setCaptchaReady] = useState(false);
  const captchaContainerRef = useRef<HTMLDivElement | null>(null);
  const captchaWidgetIdRef = useRef<string | null>(null);
  const turnstileSiteKey = config.captcha.turnstileSiteKey;
  const turnstileAction =
    source === "embedded_iframe" ? "embedded_apply" : "public_apply";

  useEffect(() => {
    setForm((prev) => ({ ...prev, source }));
  }, [source]);

  useEffect(() => {
    if (!turnstileSiteKey || !captchaReady) return;
    if (!captchaContainerRef.current || !window.turnstile) return;
    if (captchaWidgetIdRef.current) return;

    captchaWidgetIdRef.current = window.turnstile.render(
      captchaContainerRef.current,
      {
        sitekey: turnstileSiteKey,
        action: turnstileAction,
        callback: (token) => {
          setCaptchaToken(token);
        },
        "expired-callback": () => {
          setCaptchaToken("");
        },
        "error-callback": () => {
          setCaptchaToken("");
        },
      },
    );
  }, [captchaReady, turnstileAction, turnstileSiteKey]);

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
    if (!form.resumeUrl.trim()) {
      setError("Resume URL is required");
      toast.error("Resume URL is required");
      return;
    }

    if (!isValidResumeLink(form.resumeUrl)) {
      setError("Resume must be a Google Drive link or direct .pdf link");
      toast.error("Resume must be a Google Drive link or direct .pdf link");
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

    if (!captchaToken.trim()) {
      setError("Please complete the captcha challenge");
      toast.error("Please complete the captcha challenge");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const payload: ApplyPayload = {
        ...form,
        questionAnswers: questions
          .map((question) => ({
            questionId: question.id,
            answer: questionAnswers[question.id]?.trim() ?? "",
          }))
          .filter((item) => item.answer.length > 0),
        source,
        captchaToken,
      };

      const res = await fetch(
        `/api/public/${encodeURIComponent(orgSlug)}/job/${encodeURIComponent(jobSlug)}/apply`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(payload),
        },
      );

      if (!res.ok) {
        const json = (await res.json().catch(() => null)) as {
          error?: { message?: string };
        } | null;
        const message = json?.error?.message || "Failed to submit application";
        setError(message);
        toast.error(message);
        if (captchaWidgetIdRef.current && window.turnstile) {
          window.turnstile.reset(captchaWidgetIdRef.current);
          setCaptchaToken("");
        }
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
      <Script
        src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
        strategy="afterInteractive"
        onLoad={() => setCaptchaReady(true)}
      />

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
            <Label htmlFor="resumeUrl">Resume URL *</Label>
            <Input
              id="resumeUrl"
              placeholder="https://drive.google.com/file/d/... or https://example.com/resume.pdf"
              value={form.resumeUrl}
              onChange={(e) => onChange("resumeUrl", e.target.value)}
              required
            />
            <p className="text-xs text-muted-foreground">
              For Google Drive, set sharing to Anyone with link - Viewer.
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
        <div className="space-y-2">
          <Label>Verification *</Label>
          <div ref={captchaContainerRef} />
          {!turnstileSiteKey ? (
            <p className="text-xs text-red-600 dark:text-red-400">
              Captcha is not configured.
            </p>
          ) : null}
        </div>

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
