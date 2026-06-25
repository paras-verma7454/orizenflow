export const dynamic = "force-dynamic";

import { headers } from "next/headers"
import { redirect } from "next/navigation";

import { OrganizationOnboardingForm } from "@/app/onboarding/organization/organization-onboarding-form";
import { auth } from "@/lib/auth";

export default async function OrganizationOnboardingPage() {
  const session = await auth.api.getSession({ headers: (await headers()) });

  if (!session?.user) {
    redirect("/");
  }

  if (session.session.activeOrganizationId) {
    redirect("/dashboard");
  }

  return <OrganizationOnboardingForm />;
}
