import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { AnimatedLinkedin } from "@/components/icons/animated-linkedin";
import { Highlight } from "@/components/ui/hero-highlight";
import { config } from "@/lib/config";
import { JobsSearchList } from "./JobsSearchList";

type JobsGalleryResponse = {
  data: Array<{
    id: string;
    shortId: string;
    title: string;
    slug: string;
    description: string;
    status: string;
    jobType: string;
    location: string | null;
    salaryRange: string | null;
    createdAt: string;
  }>;
  organization: {
    id: string;
    name: string;
    slug: string;
    logo: string | null;
    tagline: string | null;
    about: string | null;
    websiteUrl: string | null;
    linkedinUrl: string | null;
  };
};

async function getJobsGallery(orgSlug: string) {
  const apiBases = [
    config.api.internalUrl,
    config.api.url,
    config.app.url,
  ].filter((value): value is string => Boolean(value));

  for (const apiBase of apiBases) {
    try {
      const res = await fetch(
        `${apiBase}/api/public/${encodeURIComponent(orgSlug)}/jobs`,
        {
          cache: "no-store",
        },
      );

      if (!res.ok) {
        continue;
      }

      return (await res.json()) as JobsGalleryResponse;
    } catch {
      continue;
    }
  }

  return null;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}): Promise<Metadata> {
  const { orgSlug } = await params;
  const result = await getJobsGallery(orgSlug);

  if (!result) {
    return {
      title: "Organization Not Found",
      description: "This organization could not be found.",
    };
  }

  const { organization, data: jobs } = result;
  const title = `${organization.name} — Careers`;
  const description = `Join ${organization.name}. Browse ${jobs.length} open position${jobs.length !== 1 ? "s" : ""} and find your next opportunity.`;

  const ogImage = `${config.app.url}/api/og/organization?${new URLSearchParams({
    orgName: organization.name,
    jobCount: String(jobs.length),
  }).toString()}`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: `${config.app.url}/${orgSlug}`,
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
  };
}

export default async function OrgJobsPage({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;
  const result = await getJobsGallery(orgSlug);

  if (!result) {
    notFound();
  }

  const { organization, data: jobs } = result;

  if (jobs.length === 0) {
    return (
      <div className="min-h-screen bg-slate-50 pt-20 dark:bg-black">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <div className="mb-8 flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold tracking-tight text-slate-900 dark:text-white">
                <Highlight className="text-slate-900 dark:text-white from-sky-200 to-sky-300 dark:from-sky-500/30 dark:to-sky-600/30">
                  {organization.name}
                </Highlight>
              </h1>
              <p className="mt-2 text-lg text-slate-600 dark:text-slate-400">
                Careers
              </p>
            </div>
            {organization.logo && (
              <img
                src={organization.logo}
                alt={organization.name}
                className="h-16 w-16 rounded-lg border border-slate-300 bg-white object-contain p-1 shadow-md dark:border-slate-700"
              />
            )}
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-12 text-center dark:border-slate-800 dark:bg-stone-950/40">
            <p className="text-lg text-slate-600 dark:text-slate-400">
              No open positions at the moment. Check back soon!
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 pt-20 dark:bg-black">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold tracking-tight text-slate-900 dark:text-white">
              <Highlight className="text-slate-900 dark:text-white from-sky-200 to-sky-300 dark:from-sky-500/30 dark:to-sky-600/30">
                {organization.name}
              </Highlight>
            </h1>
            {organization.tagline && (
              <p className="mt-2 text-lg text-slate-600 dark:text-slate-400">
                {organization.tagline}
              </p>
            )}
          </div>
          {organization.logo && (
            <img
              src={organization.logo}
              alt={organization.name}
              className="h-20 w-20 rounded-lg border border-slate-300 bg-white object-contain p-2 shadow-xl dark:border-slate-700"
            />
          )}
        </div>

        {/* About Organization */}
        <div className="mb-12 rounded-lg border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-stone-950/40">
          <div className="mb-4">
            <h2 className="mb-4 text-2xl font-bold text-slate-900 dark:text-white">
              About Us
            </h2>
            <p className="text-slate-600 dark:text-slate-300">
              {organization.about ||
                `At ${organization.name}, we are on a mission to build exceptional products and teams. We value innovation, collaboration, and excellence in everything we do.`}
            </p>
          </div>

          {(organization.websiteUrl || organization.linkedinUrl) && (
            <div className="flex flex-wrap gap-3 pt-2">
              {organization.websiteUrl && (
                <a
                  href={organization.websiteUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-md border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:border-slate-700 dark:bg-stone-900 dark:text-slate-300 dark:hover:bg-stone-800 dark:hover:text-white"
                >
                  <svg
                    className="h-4 w-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9"
                    />
                  </svg>
                  Website
                </a>
              )}
              {organization.linkedinUrl && (
                <a
                  href={organization.linkedinUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-md border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:border-slate-700 dark:bg-stone-900 dark:text-slate-300 dark:hover:bg-stone-800 dark:hover:text-white"
                >
                  <AnimatedLinkedin className="size-4" size={16} />
                  LinkedIn
                </a>
              )}
            </div>
          )}
        </div>

        {/* Jobs List with Search */}
        <JobsSearchList jobs={jobs} orgSlug={orgSlug} />
      </div>
    </div>
  );
}
