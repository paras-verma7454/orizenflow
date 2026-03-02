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

export default async function JobSlugRedirectPage({
  params,
}: {
  params: Promise<{ orgSlug: string; jobSlug: string }>;
}) {
  const { orgSlug, jobSlug } = await params;

  const result = await getJobBySlug(orgSlug, jobSlug);

  if (!result) {
    redirect(`/${orgSlug}`);
  }

  const job = result.data;
  redirect(`/${orgSlug}/${job.slug}/${job.shortId}`);
}
