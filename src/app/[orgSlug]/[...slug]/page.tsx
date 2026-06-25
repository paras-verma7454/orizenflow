import { redirect } from "next/navigation";
import { config } from "@/lib/config";

type PublicJobResponse = {
  data: {
    id: string;
    shortId: string;
    slug: string;
  };
};

async function getJobBySlug(
  orgSlug: string,
  jobSlug: string,
): Promise<PublicJobResponse | null> {
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

export default async function CatchAllPage({
  params,
}: {
  params: Promise<{ slug: string[] }>;
}) {
  const { slug } = await params;

  if (!slug || slug.length === 0) {
    redirect("/");
  }

  const [orgSlug, jobSlug, ...rest] = slug;

  // If it's just orgSlug, redirect to org page
  if (!jobSlug) {
    redirect(`/${orgSlug}`);
  }

  // If it's orgSlug + jobSlug + shortId (old URL format), redirect to proper structure
  if (rest.length > 0) {
    // Assume last segment is shortId, rest is job slug
    const shortId = rest[rest.length - 1];
    const reconstructedJobSlug = jobSlug;
    redirect(`/${orgSlug}/${reconstructedJobSlug}/${shortId}`);
  }

  // If it's just orgSlug + jobSlug, look it up and redirect to full URL
  const result = await getJobBySlug(orgSlug, jobSlug);

  if (!result) {
    redirect(`/${orgSlug}`);
  }

  const job = result.data;
  redirect(`/${orgSlug}/${job.slug}/${job.shortId}`);
}
