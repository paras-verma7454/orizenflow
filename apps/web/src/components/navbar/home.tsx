"use client";

import { RiLoaderLine, RiMenuLine } from "@remixicon/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

import { Access } from "@/components/access";
import { ModeToggle } from "@/components/mode-toggle";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { authClient } from "@/lib/auth/client";
import { config } from "@/lib/config";

export function Navbar() {
  const pathname = usePathname();
  const { data: session } = authClient.useSession();
  const isPublicApplyRoute = Boolean(
    pathname && /^\/[^/]+\/job\/[^/]+$/.test(pathname),
  );

  const [toDashboard, setToDashboard] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  if (pathname?.startsWith("/dashboard")) return null;

  return (
    <div className="fixed top-0 left-0 z-40 w-full border-b border-border bg-background/90 backdrop-blur-md">
      <div className="flex h-14 items-center justify-between px-6 lg:px-12">
        <Link
          href="/"
          className="flex items-center gap-2 font-bold text-xl tracking-tight"
        >
          Orizen Flow
        </Link>
        <div className="flex items-center gap-4">
          {/* Desktop Navigation */}
          {!isPublicApplyRoute ? (
            <nav className="hidden items-center gap-8 lg:flex">
              <Button
                variant="ghost"
                size="sm"
                className="text-muted-foreground hover:text-foreground font-medium"
                onClick={() =>
                  document
                    .getElementById("waitlist")
                    ?.scrollIntoView({ behavior: "smooth" })
                }
              >
                Join Waitlist
              </Button>
            </nav>
          ) : null}

          <div className="flex items-center gap-2">
            {!isPublicApplyRoute ? (
              session?.user ? (
                <Button
                  className="w-24 font-semibold"
                  variant="outline"
                  onClick={() => setToDashboard(true)}
                  render={<Link href="/dashboard" />}
                >
                  {toDashboard ? (
                    <RiLoaderLine className="animate-spin" />
                  ) : (
                    "Dashboard"
                  )}
                </Button>
              ) : (
                <Access />
              )
            ) : null}

            <div className="hidden sm:block">
              <ModeToggle />
            </div>

            {/* Mobile Navigation Toggle */}
            {!isPublicApplyRoute ? (
              <Sheet open={isOpen} onOpenChange={setIsOpen}>
                <SheetTrigger
                  render={
                    <Button
                      className="size-9 lg:hidden"
                      aria-label="Open menu"
                      size="icon"
                      variant="ghost"
                    >
                      <RiMenuLine className="size-5" aria-hidden="true" />
                    </Button>
                  }
                />
                <SheetContent
                  side="right"
                  className="bg-background border-l border-border"
                >
                  <SheetHeader>
                    <SheetTitle className="text-left font-bold text-xl">
                      Orizen Flow
                    </SheetTitle>
                  </SheetHeader>
                  <nav className="mt-8 flex flex-col gap-4 px-4">
                    <Button
                      variant="ghost"
                      className="justify-start px-0 text-lg hover:bg-transparent"
                      onClick={() => {
                        setIsOpen(false);
                        document
                          .getElementById("waitlist")
                          ?.scrollIntoView({ behavior: "smooth" });
                      }}
                    >
                      Join Waitlist
                    </Button>
                    <div className="pt-4 border-t border-border flex items-center justify-between">
                      <span className="text-sm text-muted-foreground font-medium">
                        Theme
                      </span>
                      <ModeToggle />
                    </div>
                  </nav>
                </SheetContent>
              </Sheet>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
