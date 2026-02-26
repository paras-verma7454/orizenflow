"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

const navItems = [
  { label: "Overview", href: "/admin" },
  { label: "Users & Orgs", href: "/admin/users-orgs" },
  { label: "Organizations", href: "/admin/organizations" },
  { label: "Waitlist", href: "/admin/waitlist" },
  { label: "Queue", href: "/admin/queue" },
  { label: "Candidate Debug", href: "/admin/candidates" },
  { label: "Health", href: "/admin/health" },
];

export function AdminNav() {
  const pathname = usePathname();

  return (
    <Tabs value={pathname} className="w-full">
      <TabsList className="w-full justify-start border-b rounded-none h-auto bg-transparent p-0 gap-6">
        {navItems.map((item) => (
          <Link key={item.href} href={item.href} passHref>
            <TabsTrigger
              value={item.href}
              className={cn(
                "px-0 py-0 pb-3 rounded-none border-b-2 border-transparent bg-transparent shadow-none text-sm font-semibold text-muted-foreground transition-all hover:text-foreground data-[state=active]:border-primary data-[state=active]:text-foreground data-[state=active]:bg-transparent data-[state=active]:shadow-none",
              )}
            >
              {item.label}
            </TabsTrigger>
          </Link>
        ))}
      </TabsList>
    </Tabs>
  );
}
