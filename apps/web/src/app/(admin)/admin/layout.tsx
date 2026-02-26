import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { isPlatformAdmin } from "@/lib/admin";
import { AdminNav } from "@/components/admin/admin-nav";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth.api.getSession();

  if (!session?.user) {
    redirect("/");
  }

  if (!isPlatformAdmin(session.user.email)) {
    redirect("/dashboard");
  }

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 pb-10 pt-20 md:px-6 md:pt-24">
      <header className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Admin Dashboard</h1>
          <p className="text-muted-foreground mt-1 text-base">
            Platform-level read-only operations and diagnostics.
          </p>
        </div>
        <AdminNav />
      </header>
      <section>{children}</section>
    </div>
  );
}
