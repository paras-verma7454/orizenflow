import { notFound } from "next/navigation";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Highlight } from "@/components/ui/hero-highlight";
import { Separator } from "@/components/ui/separator";
import { config } from "@/lib/config";

import { ApplyForm } from "./apply-form";

type PublicJobResponse = {
  data: {
    id: string;
    title: string;
    slug: string;
    description: string;
    status: string;
    jobType: string;
    location: string | null;
    salaryRange: string | null;
    createdAt: string;
    organization: {
      id: string;
      name: string;
      slug: string;
      logo: string | null;
      tagline: string | null;
      about: string | null;
      websiteUrl: string | null;
      linkedinUrl: string | null;
      website?: string | null;
      linkedin?: string | null;
    };
  };
};

const statusLabelMap: Record<string, string> = {
  open: "Actively hiring",
  closed: "Closed",
  filled: "Filled",
};

function statusBadgeVariant(status: string) {
  switch (status) {
    case "open":
      return "outline" as const;
    case "closed":
      return "destructive" as const;
    case "filled":
      return "outline" as const;
    case "draft":
      return "secondary" as const;
    default:
      return "secondary" as const;
  }
}

function statusBadgeClassName(status: string) {
  switch (status) {
    case "open":
      return "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300";
    case "closed":
      return "";
    case "filled":
      return "border-orange-200 bg-orange-50 text-orange-700 dark:border-orange-800 dark:bg-orange-950/40 dark:text-orange-300";
    default:
      return "";
  }
}

const jobTypeLabelMap: Record<string, string> = {
  remote: "Remote",
  hybrid: "Hybrid",
  "on-site": "On-site",
};

async function getPublicJob(orgSlug: string, id: string) {
  const apiBase = config.api.internalUrl || config.api.url;
  const res = await fetch(
    `${apiBase}/api/public/${encodeURIComponent(orgSlug)}/job/${encodeURIComponent(id)}`,
    {
      cache: "no-store",
    },
  );

  if (!res.ok) {
    return null;
  }

  return (await res.json()) as PublicJobResponse;
}

export default async function PublicJobApplyPage({
  params,
}: {
  params: Promise<{ orgSlug: string; id: string }>;
}) {
  const { orgSlug, id } = await params;
  const result = await getPublicJob(orgSlug, id);

  if (!result) {
    notFound();
  }

  const job = result.data;
  const websiteUrl =
    job.organization.websiteUrl || job.organization.website || null;
  const linkedinUrl =
    job.organization.linkedinUrl || job.organization.linkedin || null;
  const isJobOpen = job.status === "open";

  return (
    <main className="mx-auto w-full max-w-6xl px-4 pb-16 pt-20 sm:px-6 lg:px-8">
      <div className="rounded-3xl border-2 border-slate-300/80 bg-slate-100 p-4 dark:border-slate-700/80 dark:bg-muted/30 sm:p-6 lg:p-8">
        <div className="space-y-8">
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              {job.organization.name}
            </p>
            <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
              {job.title}
            </h1>
            <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
              <Badge
                variant={statusBadgeVariant(job.status)}
                className={statusBadgeClassName(job.status)}
              >
                {statusLabelMap[job.status] || job.status}
              </Badge>
              <span>{jobTypeLabelMap[job.jobType] || job.jobType}</span>
              {job.location ? <span>• {job.location}</span> : null}
              {job.salaryRange ? <span>• {job.salaryRange}</span> : null}
            </div>
          </div>

          <Card className="border-2 border-slate-300/80 dark:border-slate-700/80">
            <CardHeader>
              <CardTitle>
                <Highlight className="text-foreground font-semibold from-sky-200 to-sky-300 dark:from-sky-500/30 dark:to-sky-600/30">
                  About {job.organization.name}
                </Highlight>
              </CardTitle>
            </CardHeader>
            <Separator />
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              {job.organization.tagline ? (
                <p className="text-foreground/90">{job.organization.tagline}</p>
              ) : null}
              <p>
                {job.organization.about ||
                  `${job.organization.name} is hiring for this role. Apply to share your profile and relevant experience.`}
              </p>
              <div className="space-y-2 pt-1">
                <div className="text-sm">
                  <span className="text-foreground/80">Website: </span>
                  {websiteUrl ? (
                    <a
                      href={websiteUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-accent hover:underline break-all"
                    >
                      {websiteUrl}
                    </a>
                  ) : (
                    <span>Not provided</span>
                  )}
                </div>
                <div className="text-sm">
                  <span className="text-foreground/80">LinkedIn: </span>
                  {linkedinUrl ? (
                    <a
                      href={linkedinUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-accent hover:underline break-all"
                    >
                      {linkedinUrl}
                    </a>
                  ) : (
                    <span>Not provided</span>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-2 border-slate-300/80 dark:border-slate-700/80">
            <CardHeader>
              <CardTitle>
                <Highlight className="text-foreground font-semibold from-amber-200 to-amber-300 dark:from-amber-500/30 dark:to-amber-600/30">
                  Job description
                </Highlight>
              </CardTitle>
            </CardHeader>
            <Separator />
            <CardContent>
              <div className="space-y-3 text-sm leading-7 text-foreground/90">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={{
                    h1: ({ children }) => <h1 className="text-xl font-semibold text-foreground">{children}</h1>,
                    h2: ({ children }) => <h2 className="text-lg font-semibold text-foreground">{children}</h2>,
                    h3: ({ children }) => <h3 className="text-base font-semibold text-foreground">{children}</h3>,
                    p: ({ children }) => <p className="text-sm leading-7 text-foreground/90">{children}</p>,
                    ul: ({ children }) => <ul className="list-disc space-y-1 pl-5">{children}</ul>,
                    ol: ({ children }) => <ol className="list-decimal space-y-1 pl-5">{children}</ol>,
                    li: ({ children }) => <li className="text-sm leading-7">{children}</li>,
                    a: ({ href, children }) => (
                      <a href={href} target="_blank" rel="noreferrer" className="text-accent underline underline-offset-2">
                        {children}
                      </a>
                    ),
                    code: ({ children }) => (
                      <code className="rounded bg-muted px-1 py-0.5 font-mono text-xs text-foreground">{children}</code>
                    ),
                  }}
                >
                  {job.description}
                </ReactMarkdown>
              </div>
            </CardContent>
          </Card>

          <Card className="border-2 border-slate-300/80 dark:border-slate-700/80">
            <CardHeader>
              <CardTitle>
                <Highlight className="text-foreground font-semibold from-emerald-200 to-emerald-300 dark:from-emerald-500/30 dark:to-emerald-600/30">
                  Apply for this role
                </Highlight>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Required: name, email, and resume URL. Optional links help us
                evaluate your work better.
              </p>
              <Separator />
              {isJobOpen ? (
                <ApplyForm orgSlug={orgSlug} jobId={id} />
              ) : (
                <p className="text-sm text-muted-foreground">
                  Applications are currently closed for this role.
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  );
}
