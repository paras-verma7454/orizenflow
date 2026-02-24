"use client"

import { env } from "@packages/env/web-next"
import { RiExpandUpDownLine, RiLogoutBoxLine, RiMessage2Line, RiMoonLine, RiSunLine } from "@remixicon/react"
import { type User } from "better-auth/types"
import Link from "next/link"
import { redirect } from "next/navigation"
import { useTheme } from "next-themes"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"
import { authClient } from "@/lib/auth/client"
import { cn } from "@/lib/utils"

export function SidebarDashboardFooter({ user }: { user: User }) {
  const { isMobile } = useSidebar()
  const { theme, setTheme } = useTheme()

  const smartToggle = () => {
    const prefersDarkScheme = window.matchMedia("(prefers-color-scheme: dark)").matches
    if (theme === "system") {
      setTheme(prefersDarkScheme ? "light" : "dark")
    } else if ((theme === "light" && !prefersDarkScheme) || (theme === "dark" && prefersDarkScheme)) {
      setTheme(theme === "light" ? "dark" : "light")
    } else {
      setTheme("system")
    }
  }

  const modeLabel = theme === "system" ? "System" : theme === "dark" ? "Dark" : "Light"

  return (
    <SidebarMenu className="space-y-1.5">
      <SidebarMenuItem>
        <SidebarMenuButton
          className="cursor-pointer border"
          onClick={smartToggle}
          tooltip="Toggle theme"
        >
          <RiSunLine className="dark:hidden" />
          <RiMoonLine className="hidden dark:block" />
          <span>Theme</span>
          <span className="ml-auto text-xs text-muted-foreground group-data-[collapsible=icon]:hidden">{modeLabel}</span>
        </SidebarMenuButton>
      </SidebarMenuItem>

      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <SidebarMenuButton
                size="lg"
                className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground cursor-pointer border"
              />
            }
          >
            <Avatar className="size-8 rounded-md">
              <AvatarImage src={user.image ?? ""} alt={user.name} />
              <AvatarFallback className="rounded-md">ND</AvatarFallback>
            </Avatar>
            <div className="grid flex-1 text-left text-sm leading-tight">
              <span className="truncate font-medium">{user.name}</span>
              <span className="truncate text-xs">{user.email}</span>
            </div>
            <RiExpandUpDownLine className="ml-auto size-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className={cn("w-(--anchor-width) min-w-56 rounded-lg", isMobile ? "mb-1" : "ml-3")}
            side={isMobile ? "top" : "right"}
            align="end"
            sideOffset={4}
          >
            <DropdownMenuGroup>
              <DropdownMenuLabel className="p-0 font-normal">
                <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                  <Avatar className="size-8 rounded-md">
                    <AvatarImage src={user.image ?? ""} alt={user.name} />
                    <AvatarFallback className="rounded-md">ND</AvatarFallback>
                  </Avatar>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-medium">{user.name}</span>
                    <span className="truncate text-xs">{user.email}</span>
                  </div>
                </div>
              </DropdownMenuLabel>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            {env.NEXT_PUBLIC_USERJOT_URL && (
              <DropdownMenuItem
                render={
                  <Link
                    href={env.NEXT_PUBLIC_USERJOT_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="cursor-pointer"
                  />
                }
              >
                <RiMessage2Line />
                Feedback
              </DropdownMenuItem>
            )}
            <DropdownMenuItem
              className="cursor-pointer"
              onClick={async () => {
                await authClient.signOut()
                redirect("/")
              }}
            >
              <RiLogoutBoxLine />
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
