"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Highlight } from "@/components/ui/hero-highlight";
import { Separator } from "@/components/ui/separator";

interface AboutCardProps {
  organization: {
    name: string;
    tagline: string | null;
    about: string | null;
    websiteUrl: string | null;
    linkedinUrl: string | null;
    website?: string | null;
    linkedin?: string | null;
  };
}

export function AboutCard({ organization }: AboutCardProps) {
  const websiteUrl = organization.websiteUrl || organization.website || null;
  const linkedinUrl = organization.linkedinUrl || organization.linkedin || null;

  return (
    <Card className="border-2 border-slate-300/80 dark:border-slate-700/80">
      <CardHeader>
        <CardTitle>
          <Highlight className="text-foreground font-semibold from-sky-200 to-sky-300 dark:from-sky-500/30 dark:to-sky-600/30">
            About {organization.name}
          </Highlight>
        </CardTitle>
      </CardHeader>
      <Separator />
      <CardContent className="space-y-3 text-sm text-muted-foreground">
        {organization.tagline ? (
          <p className="text-foreground/90">{organization.tagline}</p>
        ) : null}
        <p>
          {organization.about ||
            `${organization.name} is hiring for this role. Apply to share your profile and relevant experience.`}
        </p>
        <div className="space-y-2 pt-1">
          <div className="text-sm">
            <span className="text-foreground/80">Website: </span>
            {websiteUrl ? (
              <a
                href={websiteUrl}
                target="_blank"
                rel="noreferrer"
                className="text-accent hover:underline break-all"
              >
                {websiteUrl}
              </a>
            ) : (
              <span>Not provided</span>
            )}
          </div>
          <div className="text-sm">
            <span className="text-foreground/80">LinkedIn: </span>
            {linkedinUrl ? (
              <a
                href={linkedinUrl}
                target="_blank"
                rel="noreferrer"
                className="text-accent hover:underline break-all"
              >
                {linkedinUrl}
              </a>
            ) : (
              <span>Not provided</span>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
