export const dynamic = "force-dynamic";

import { eq } from "drizzle-orm"
import { headers } from "next/headers"
import { redirect } from "next/navigation";

import { OrganizationOnboardingForm } from "@/app/onboarding/organization/organization-onboarding-form";
import { db, member, session as sessionTable } from "@/lib/db";
import { auth } from "@/lib/auth";

export default async function OrganizationOnboardingPage() {
  const hdrs = await headers()
  const session = await auth.api.getSession({ headers: hdrs });

  if (!session?.user) {
    redirect("/");
  }

  if (session.session.activeOrganizationId) {
    redirect("/dashboard");
  }

  const [existingMembership] = await db
    .select({ organizationId: member.organizationId })
    .from(member)
    .where(eq(member.userId, session.session.userId));

  if (existingMembership) {
    await db
      .update(sessionTable)
      .set({ activeOrganizationId: existingMembership.organizationId })
      .where(
        eq(sessionTable.id, session.session.id),
      );
    redirect("/dashboard");
  }

  return <OrganizationOnboardingForm />;
}
