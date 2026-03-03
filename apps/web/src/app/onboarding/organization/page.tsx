import { redirect } from "next/navigation";

import { OrganizationOnboardingForm } from "@/app/onboarding/organization/organization-onboarding-form";
import { auth } from "@/lib/auth";

export default async function OrganizationOnboardingPage() {
  const session = await auth.api.getSession();

  if (!session?.user) {
    redirect("/");
  }

  if (session.session.activeOrganizationId) {
    redirect("/dashboard");
  }

  return <OrganizationOnboardingForm />;
}
