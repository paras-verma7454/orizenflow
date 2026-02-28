"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Highlight } from "@/components/ui/hero-highlight";
import { Separator } from "@/components/ui/separator";
import { ApplyForm } from "./ApplyForm";

interface ApplyCardProps {
  orgSlug: string;
  jobSlug: string;
  questions: Array<{ id: string; prompt: string; required: boolean }>;
  status: string;
}

export function ApplyCard({
  orgSlug,
  jobSlug,
  questions,
  status,
}: ApplyCardProps) {
  const isJobOpen = status === "open";

  return (
    <Card className="border-2 border-slate-300/80 dark:border-slate-700/80">
      <CardHeader>
        <CardTitle>
          <Highlight className="text-foreground font-semibold from-emerald-200 to-emerald-300 dark:from-emerald-500/30 dark:to-emerald-600/30">
            Apply for this role
          </Highlight>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Required: name, email, and resume URL. Optional links help us evaluate
          your work better.
        </p>
        <Separator />
        {isJobOpen ? (
          <ApplyForm
            orgSlug={orgSlug}
            jobSlug={jobSlug}
            questions={questions ?? []}
          />
        ) : (
          <p className="text-sm text-muted-foreground">
            Applications are currently closed for this role.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
