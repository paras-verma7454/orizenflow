import { notFound } from "next/navigation";
import type { CSSProperties } from "react";

import { config } from "@/lib/config";
import { ApplyForm } from "@/app/[orgSlug]/[jobSlug]/[shortId]/components/ApplyForm";
import { HeightReporter } from "./height-reporter";
import { Highlight } from "@/components/ui/hero-highlight";

type PublicJobResponse = {
  data: {
    shortId: string;
    title: string;
    status: string;
    questions: Array<{ id: string; prompt: string; required: boolean }>;
    organization: {
      slug: string;
    };
  };
};

async function getPublicJobByShortId(
  shortId: string,
): Promise<PublicJobResponse | null> {
  const apiBase = config.api.internalUrl || config.api.url;
  const res = await fetch(
    `${apiBase}/api/public/job/${encodeURIComponent(shortId)}`,
    {
      cache: "no-store",
    },
  );

  if (!res.ok) {
    return null;
  }

  return (await res.json()) as PublicJobResponse;
}

export default async function EmbedJobApplyPage({
  params,
  searchParams,
}: {
  params: Promise<{ shortId: string }>;
  searchParams: Promise<{ hideTitle?: string; transparentBackground?: string }>;
}) {
  const { shortId } = await params;
  const query = await searchParams;

  const result = await getPublicJobByShortId(shortId);

  if (!result) {
    notFound();
  }

  const job = result.data;
  const isJobOpen = job.status === "open";
  const hideTitle = query.hideTitle === "1";
  const transparentBackground = query.transparentBackground === "1";
  const forcedLightVars: CSSProperties = {
    colorScheme: "light",
    ["--background" as string]: "#FFFFFF",
    ["--foreground" as string]: "#0F172A",
    ["--card" as string]: "#FFFFFF",
    ["--card-foreground" as string]: "#0F172A",
    ["--popover" as string]: "#FFFFFF",
    ["--popover-foreground" as string]: "#0F172A",
    ["--primary" as string]: "#0F172A",
    ["--primary-foreground" as string]: "#FFFFFF",
    ["--secondary" as string]: "#F8FAFC",
    ["--secondary-foreground" as string]: "#0F172A",
    ["--muted" as string]: "#F8FAFC",
    ["--muted-foreground" as string]: "#64748B",
    ["--accent" as string]: "#2563EB",
    ["--accent-foreground" as string]: "#FFFFFF",
    ["--border" as string]: "#D1D5DB",
    ["--input" as string]: "#D1D5DB",
    ["--ring" as string]: "#2563EB",
  };

  return (
    <>
      {transparentBackground ? (
        <style>{"html, body { background: transparent !important; }"}</style>
      ) : null}
      <main
        className={`w-full px-4 py-0 m-0 text-foreground ${transparentBackground ? "bg-transparent" : "bg-background"}`}
        style={forcedLightVars}
      >
        <HeightReporter />
        <div className="space-y-4">
          {!hideTitle ? (
            <h2 className="text-lg font-semibold py-5">
              <Highlight className="text-foreground from-emerald-200 to-emerald-300  px-1 py-0.5 rounded-md inline-block">
                Apply for {job.title}
              </Highlight>
            </h2>
          ) : null}
          {isJobOpen ? (
            <ApplyForm
              orgSlug={job.organization.slug}
              jobSlug={job.shortId}
              questions={job.questions ?? []}
              source="embedded_iframe"
            />
          ) : (
            <p className="text-sm text-muted-foreground">
              Applications are currently closed for this role.
            </p>
          )}
        </div>
        <div className="mt-3 flex justify-end">
          <a
            href={config.app.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-muted-foreground"
          >
            Powered by <span className="font-semibold">Orizen Flow</span>
          </a>
        </div>
      </main>
    </>
  );
}
