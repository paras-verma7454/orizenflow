"use client"

import {
  RiBriefcaseLine,
  RiDashboardLine,
  RiGroupLine,
  RiShieldUserLine,
  RiUserLine,
} from "@remixicon/react"
import Link from "next/link"
import { usePathname } from "next/navigation"

import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { config } from "@/lib/config"

const iconMap: Record<string, React.ReactNode> = {
  "/dashboard": <RiDashboardLine />,
  "/dashboard/jobs": <RiBriefcaseLine />,
  "/dashboard/candidates": <RiGroupLine />,
  "/dashboard/account": <RiUserLine />,
  "/admin": <RiShieldUserLine />,
}

export function SidebarDashboardNav({ canAccessAdmin = false }: { canAccessAdmin?: boolean }) {
  const pathname = usePathname()
  const baseGroups = config.sidebar.groups
  const groups = canAccessAdmin
    ? [
        ...baseGroups,
        {
          label: "Platform",
          items: [{ title: "Admin", url: "/admin" }],
        },
      ]
    : baseGroups

  return (
    <>
      {groups.map((group) => (
        <SidebarGroup key={group.label}>
          <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
          <SidebarMenu>
            {group.items.map((item) => (
              <SidebarMenuItem key={item.url}>
                <SidebarMenuButton
                  isActive={
                    pathname === item.url ||
                    (item.url !== "/dashboard" && pathname.startsWith(`${item.url}/`))
                  }
                  render={<Link href={item.url} />}
                >
                  {iconMap[item.url]}
                  <span>{item.title}</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroup>
      ))}
    </>
  )
}
