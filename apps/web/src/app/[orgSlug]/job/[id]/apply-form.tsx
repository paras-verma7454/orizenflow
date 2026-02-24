"use client";

import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type ApplyPayload = {
  name: string;
  email: string;
  resumeUrl: string;
  linkedinUrl?: string;
  githubUrl?: string;
  portfolioUrl?: string;
  coverLetter?: string;
  honeypot?: string;
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
    if (!(parsed.protocol === "http:" || parsed.protocol === "https:")) return false;
    const isDrive = parsed.hostname === "drive.google.com";
    const isPdf = parsed.pathname.toLowerCase().endsWith(".pdf");
    return isDrive || isPdf;
  } catch {
    return false;
  }
}

export function ApplyForm({
  orgSlug,
  jobId,
}: {
  orgSlug: string;
  jobId: string;
}) {
  const [form, setForm] = useState<ApplyPayload>({
    name: "",
    email: "",
    resumeUrl: "",
    linkedinUrl: "",
    githubUrl: "",
    portfolioUrl: "",
    coverLetter: "",
    honeypot: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

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

    setIsSubmitting(true);
    setError(null);

    try {
      const res = await fetch(
        `/api/public/${encodeURIComponent(orgSlug)}/job/${encodeURIComponent(jobId)}/apply`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(form),
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
      <div className="rounded-xl border bg-card p-6">
        <h2 className="text-xl font-semibold">Application submitted</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Thanks for applying. The hiring team will review your profile and
          reach out if there is a fit.
        </p>
      </div>
    );
  }

  return (
    <form
      className="space-y-5 rounded-xl border bg-card p-6"
      onSubmit={onSubmit}
    >
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

      <div className="grid gap-5 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="linkedinUrl">LinkedIn URL</Label>
          <Input
            id="linkedinUrl"
            placeholder="https://linkedin.com/in/your-name"
            value={form.linkedinUrl || ""}
            onChange={(e) => onChange("linkedinUrl", e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="githubUrl">GitHub URL</Label>
          <Input
            id="githubUrl"
            placeholder="https://github.com/your-handle"
            value={form.githubUrl || ""}
            onChange={(e) => onChange("githubUrl", e.target.value)}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="portfolioUrl">Portfolio URL</Label>
        <Input
          id="portfolioUrl"
          placeholder="https://your-portfolio.com"
          value={form.portfolioUrl || ""}
          onChange={(e) => onChange("portfolioUrl", e.target.value)}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="coverLetter">Cover letter</Label>
        <Textarea
          id="coverLetter"
          rows={6}
          value={form.coverLetter || ""}
          onChange={(e) => onChange("coverLetter", e.target.value)}
          placeholder="Share why you're a strong fit for this role"
        />
      </div>

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

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <Button
        type="submit"
        className="w-full cursor-pointer"
        disabled={isSubmitting}
      >
        {isSubmitting ? "Submitting..." : "Submit application"}
      </Button>
    </form>
  );
}
