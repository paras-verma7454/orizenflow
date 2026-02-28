"use client";

import Link from "next/link";
import { ChevronLeft } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
  type Job,
  jobTypeLabelMap,
  statusBadgeClassName,
  statusBadgeVariant,
  statusLabelMap,
} from "../types";

interface JobHeaderProps {
  job: Job;
  orgSlug: string;
}

export function JobHeader({ job, orgSlug }: JobHeaderProps) {
  const faviconUrl = job.organization.logo
    ? job.organization.logo
    : job.organization.websiteUrl
      ? `https://www.google.com/s2/favicons?domain=${job.organization.websiteUrl}&sz=128`
      : null;

  return (
    <div className="space-y-4">
      {/* Back Button */}
      <Link
        href={`/${orgSlug}`}
        className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ChevronLeft className="h-4 w-4" />
        <span>Back to all jobs</span>
      </Link>

      {/* Job Header with Logo */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 space-y-3">
          <p className="text-sm text-muted-foreground">
            {job.organization.name}
          </p>
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            {job.title}
          </h1>
          <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <Badge
              variant={statusBadgeVariant(job.status)}
              className={statusBadgeClassName(job.status)}
            >
              {statusLabelMap[job.status] || job.status}
            </Badge>
            <Badge variant="secondary">Job ID: {job.shortId}</Badge>
            <span>{jobTypeLabelMap[job.jobType] || job.jobType}</span>
            {job.location ? <span>• {job.location}</span> : null}
            {job.salaryRange ? <span>• {job.salaryRange}</span> : null}
          </div>
        </div>

        {/* Organization Logo/Favicon */}
        {faviconUrl && (
          <div className="shrink-0">
            <img
              src={faviconUrl}
              alt={`${job.organization.name} logo`}
              className="h-16 w-16 rounded-lg border border-slate-300 bg-white object-contain p-2 shadow-md dark:border-slate-700 sm:h-20 sm:w-20"
            />
          </div>
        )}
      </div>
    </div>
  );
}
