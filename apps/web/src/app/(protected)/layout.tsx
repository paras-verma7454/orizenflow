import Link from "next/link"
import { redirect } from "next/navigation"

import { SidebarDashboardFooter, SidebarDashboardNav } from "@/components/sidebar/dashboard"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarRail,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { isPlatformAdmin } from "@/lib/admin"
import { auth } from "@/lib/auth"
import { config } from "@/lib/config"

export default async function Layout({ children }: { children: React.ReactNode }) {
  const session = await auth.api.getSession()
  const canAccessAdmin = isPlatformAdmin(session?.user?.email)

  if (!session?.user) redirect("/")
  if (!session.session.activeOrganizationId) redirect("/onboarding/organization")

  return (
    <SidebarProvider>
      <Sidebar collapsible="icon">
        <SidebarHeader>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton size="lg" render={<Link href="/" />}>
                <div className="text-primary-foreground bg-primary flex size-6 items-center justify-center rounded-md text-xs font-bold">
                  O
                </div>
                <span className="truncate font-bold group-data-[collapsible=icon]:hidden">
                  {config.app.name}
                </span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarHeader>
        <SidebarContent>
          <SidebarDashboardNav canAccessAdmin={canAccessAdmin} />
        </SidebarContent>
        <SidebarFooter>
          <SidebarDashboardFooter user={session.user} />
        </SidebarFooter>
        <SidebarRail />
      </Sidebar>
      <main className="flex flex-1 flex-col overflow-auto">
        <SidebarTrigger className="bg-sidebar absolute m-2 cursor-pointer border" />
        {children}
      </main>
    </SidebarProvider>
  )
}
