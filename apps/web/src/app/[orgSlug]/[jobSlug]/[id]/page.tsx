import { redirect } from "next/navigation";

export default async function LegacyPublicJobUrlPage({
  params,
}: {
  params: Promise<{ orgSlug: string; jobSlug: string }>;
}) {
  const { orgSlug, jobSlug } = await params;
  redirect(`/${orgSlug}/${jobSlug}`);
}
