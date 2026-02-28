import { notFound } from "next/navigation";

import { config } from "@/lib/config";
import { AboutCard } from "./components/AboutCard";
import { ApplyCard } from "./components/ApplyCard";
import { DescriptionCard } from "./components/DescriptionCard";
import { JobHeader } from "./components/JobHeader";
import { type Job, jobTypeLabelMap } from "./types";

type PublicJobResponse = {
  data: Job;
};

async function getPublicJob(orgSlug: string, jobSlug: string) {
  const apiBase = config.api.internalUrl || config.api.url;
  const res = await fetch(
    `${apiBase}/api/public/${encodeURIComponent(orgSlug)}/job/by-slug/${encodeURIComponent(jobSlug)}`,
    {
      cache: "no-store",
    },
  );

  if (!res.ok) {
    return null;
  }

  return (await res.json()) as PublicJobResponse;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ orgSlug: string; jobSlug: string }>;
}) {
  const { orgSlug, jobSlug } = await params;
  const result = await getPublicJob(orgSlug, jobSlug);

  if (!result) {
    return {
      title: "Job Not Found",
      description: "This job listing could not be found.",
    };
  }

  const { data: job } = result;
  const orgName = job.organization.name;

  // ── Title: punchy, scan-friendly, keyword-rich ─────────────────────
  // e.g. "Senior Engineer @ Acme — Remote · $120k-$160k"
  const typePart = job.jobType
    ? (jobTypeLabelMap[job.jobType] ?? job.jobType)
    : null;
  const titleSuffix = [typePart, job.location, job.salaryRange]
    .filter(Boolean)
    .join(" · ");
  const title = titleSuffix
    ? `${job.title} @ ${orgName} — ${titleSuffix}`
    : `${job.title} @ ${orgName}`;

  // ── Description: "{Org} is hiring for {Job} · {type} · {location} · {salary}"
  const detailParts = [
    job.jobType ? (jobTypeLabelMap[job.jobType] ?? job.jobType) : null,
    job.location,
    job.salaryRange,
  ]
    .filter(Boolean)
    .join(" · ");

  const rawDescription = `${orgName} is hiring for ${job.title}${detailParts ? ` · ${detailParts}` : ""}. Apply now on Orizen Flow.`;

  // Clamp to 155 chars for best SEO snippet display
  const description =
    rawDescription.length > 155
      ? rawDescription.slice(0, 152).trimEnd() + "…"
      : rawDescription;

  // ── Canonical URL & OG image ────────────────────────────────────────
  const pageUrl = `${config.app.url}/${orgSlug}/${jobSlug}`;
  const ogImage = `${config.app.url}/api/og/hero?t=${Date.now()}`;

  // ── Keywords ────────────────────────────────────────────────────────
  const keywords = [
    job.title,
    orgName,
    job.jobType ? (jobTypeLabelMap[job.jobType] ?? job.jobType) : null,
    job.location,
    "jobs",
    "hiring",
    "apply",
    "Orizen Flow",
  ].filter(Boolean) as string[];

  return {
    title,
    description,
    keywords,
    openGraph: {
      title,
      description,
      url: pageUrl,
      type: "website",
      siteName: "Orizen Flow",
      images: [
        {
          url: ogImage,
          width: 1200,
          height: 630,
          alt: title,
        },
      ],
    },
    // summary_large_image renders a big card on Twitter/X, WhatsApp, LinkedIn
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [ogImage],
    },
  };
}

export default async function PublicJobApplyPage({
  params,
}: {
  params: Promise<{ orgSlug: string; jobSlug: string }>;
}) {
  const { orgSlug, jobSlug } = await params;
  const result = await getPublicJob(orgSlug, jobSlug);

  if (!result) {
    notFound();
  }

  const job = result.data;

  return (
    <main className="mx-auto w-full max-w-6xl px-4 pb-16 pt-20 sm:px-6 lg:px-8">
      <div className="rounded-3xl border-2 border-slate-300/80 bg-slate-100 p-4 dark:border-slate-700/80 dark:bg-muted/30 sm:p-6 lg:p-8">
        <div className="space-y-8">
          <JobHeader job={job} orgSlug={orgSlug} />
          <AboutCard organization={job.organization} />
          <DescriptionCard description={job.description} />
          <ApplyCard
            orgSlug={orgSlug}
            jobSlug={jobSlug}
            questions={job.questions}
            status={job.status}
          />
        </div>
      </div>
    </main>
  );
}
