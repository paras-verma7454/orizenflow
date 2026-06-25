"use client";

import { Briefcase } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRef } from "react";

import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { config } from "@/lib/config";
import {
  AnimatedLayoutDashboard,
  type AnimatedLayoutDashboardHandle,
} from "@/components/icons/animated-sidebar";
import {
  AnimatedUser,
  type AnimatedUserHandle,
} from "@/components/icons/animated-sidebar";
import {
  AnimatedShieldUser,
  type AnimatedShieldUserHandle,
} from "@/components/icons/animated-sidebar";
import {
  AnimatedUsersCandidates,
  type AnimatedUsersCandidatesHandle,
} from "@/components/icons/animated-users-candidates";

export function SidebarDashboardNav({
  canAccessAdmin = false,
}: {
  canAccessAdmin?: boolean;
}) {
  const dashboardRef = useRef<AnimatedLayoutDashboardHandle>(null);
  const candidatesRef = useRef<AnimatedUsersCandidatesHandle>(null);
  const accountRef = useRef<AnimatedUserHandle>(null);
  const adminRef = useRef<AnimatedShieldUserHandle>(null);
  const pathname = usePathname();
  const baseGroups = config.sidebar.groups;
  const groups = canAccessAdmin
    ? [
        ...baseGroups,
        {
          label: "Platform",
          items: [{ title: "Admin", url: "/admin" }],
        },
      ]
    : baseGroups;

  const iconMap: Record<
    string,
    { icon: React.ReactNode; ref?: React.RefObject<any> }
  > = {
    "/dashboard": {
      icon: <AnimatedLayoutDashboard ref={dashboardRef} />,
      ref: dashboardRef,
    },
    "/dashboard/jobs": { icon: <Briefcase />, ref: undefined },
    "/dashboard/candidates": {
      icon: <AnimatedUsersCandidates ref={candidatesRef} />,
      ref: candidatesRef,
    },
    "/dashboard/account": {
      icon: <AnimatedUser ref={accountRef} />,
      ref: accountRef,
    },
    "/admin": { icon: <AnimatedShieldUser ref={adminRef} />, ref: adminRef },
  };

  return (
    <>
      {groups.map((group) => (
        <SidebarGroup key={group.label}>
          <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
          <SidebarMenu>
            {group.items.map((item) => {
              const iconData = iconMap[item.url];
              return (
                <SidebarMenuItem key={item.url}>
                  <SidebarMenuButton
                    isActive={
                      pathname === item.url ||
                      (item.url !== "/dashboard" &&
                        pathname.startsWith(`${item.url}/`))
                    }
                    render={<Link href={item.url} />}
                    onMouseEnter={() =>
                      iconData?.ref?.current?.startAnimation?.()
                    }
                    onMouseLeave={() =>
                      iconData?.ref?.current?.stopAnimation?.()
                    }
                  >
                    {iconData?.icon}
                    <span>{item.title}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              );
            })}
          </SidebarMenu>
        </SidebarGroup>
      ))}
    </>
  );
}
