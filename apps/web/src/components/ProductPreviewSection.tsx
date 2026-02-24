"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { PointerHighlight } from "@/components/ui/pointer-highlight"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import React from "react";

export function ProductPreviewSection() {
  return (
    <section id="product-preview" className="border-b border-border bg-zinc-100/60 py-24 dark:bg-zinc-950">
      <div className="mx-auto max-w-6xl px-6">
        <div className="mb-10 text-center">
          <PointerHighlight
            containerClassName="mb-5 md:mx-auto"
            rectangleClassName="bg-cyan-100 dark:bg-cyan-900 border-cyan-300 dark:border-cyan-700 leading-loose"
            pointerClassName="text-cyan-500 h-3 w-3"
          >
            <span className="relative z-10 inline-block px-2 text-sm font-bold tracking-wide text-foreground md:text-base">
              Product Preview
            </span>
          </PointerHighlight>
          <h2 className="text-balance text-4xl font-bold tracking-tight md:text-6xl">
            Reserved for upcoming dashboard build.
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-muted-foreground">
            This block is intentionally a placeholder and will be replaced with the real dashboard screenshot.
          </p>
        </div>
        <Card className="mx-auto max-w-5xl border-border/70 bg-card shadow-sm dark:shadow-none">
          <CardHeader>
            <CardTitle>Built for modern hiring teams</CardTitle>
            <CardDescription>Coming soon</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <Skeleton className="h-8 w-44" />
            <Separator />
            <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
              <Skeleton className="h-28 rounded-lg" />
              <Skeleton className="h-28 rounded-lg md:col-span-3" />
            </div>
            <Skeleton className="h-48 rounded-xl" />
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
