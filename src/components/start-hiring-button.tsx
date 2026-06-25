"use client";

import Link from "next/link";
import { authClient } from "@/lib/auth/client";
import { Access } from "@/components/access";
import { Button } from "@/components/ui/button";

export function StartHiringButton() {
  const { data } = authClient.useSession();
  const user = data?.user;

  if (user) {
    return (
      <Link
        href="/dashboard"
        className="h-14 inline-flex items-center justify-center rounded-full bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 px-10 font-semibold tracking-tight transition-all hover:bg-zinc-800 hover:dark:bg-zinc-100 shadow-xl"
      >
        Start Hiring Free
      </Link>
    );
  }

  return (
    <Access>
      <Button
        size="xl"
        className="h-14 inline-flex items-center justify-center rounded-full bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 px-10 font-semibold tracking-tight transition-all hover:bg-zinc-800 hover:dark:bg-zinc-100 shadow-xl"
      >
        Start Hiring Free
      </Button>
    </Access>
  );
}
