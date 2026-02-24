import Link from "next/link"
import { redirect } from "next/navigation"

import { auth } from "@/lib/auth"
import { isPlatformAdmin } from "@/lib/admin"

const navItems = [
  { label: "Overview", href: "/admin" },
  { label: "Users & Orgs", href: "/admin/users-orgs" },
  { label: "Queue", href: "/admin/queue" },
  { label: "Candidate Debug", href: "/admin/candidates" },
  { label: "Health", href: "/admin/health" },
]

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth.api.getSession()

  if (!session?.user) {
    redirect("/")
  }

  if (!isPlatformAdmin(session.user.email)) {
    redirect("/dashboard")
  }

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-8 md:px-6">
      <header className="space-y-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Admin Dashboard</h1>
          <p className="text-sm text-muted-foreground">Platform-level read-only operations and diagnostics.</p>
        </div>
        <nav className="flex flex-wrap items-center gap-2">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-md border px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </header>
      <section>{children}</section>
    </div>
  )
}

