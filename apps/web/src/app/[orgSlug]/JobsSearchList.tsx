"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Search } from "lucide-react";

import { Input } from "@/components/ui/input";

const jobTypeLabelMap: Record<string, string> = {
  remote: "Remote",
  hybrid: "Hybrid",
  "on-site": "On-site",
  full_time: "Full-time",
  part_time: "Part-time",
  contract: "Contract",
  internship: "Internship",
  freelance: "Freelance",
};

interface Job {
  id: string;
  shortId?: string; // Optional based on previous context, but safer to assume it might be missing
  title: string;
  slug: string;
  jobType: string;
  location: string | null;
  salaryRange: string | null;
  createdAt: string;
}

interface JobsSearchListProps {
  jobs: Job[];
  orgSlug: string;
}

export function JobsSearchList({ jobs, orgSlug }: JobsSearchListProps) {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredJobs = useMemo(() => {
    if (!searchQuery.trim()) return jobs;

    const query = searchQuery.toLowerCase().trim();
    return jobs.filter((job) => {
      const matchTitle = job.title.toLowerCase().includes(query);
      const matchId = job.id.toLowerCase().includes(query);
      const matchShortId = job.shortId?.toLowerCase().includes(query);

      return matchTitle || matchId || matchShortId;
    });
  }, [jobs, searchQuery]);

  return (
    <div className="space-y-6">
      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <Input
          type="text"
          placeholder="Search for jobs by title or ID..."
          className="pl-10 h-10 w-full rounded-md border border-slate-200 bg-white placeholder:text-slate-400 focus-visible:ring-1 focus-visible:ring-slate-400 dark:border-slate-800 dark:bg-stone-950/40 dark:focus-visible:ring-slate-700"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {/* Jobs Section Title */}
      <div>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
          Open Positions
        </h2>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
          {filteredJobs.length} {filteredJobs.length === 1 ? "job" : "jobs"}{" "}
          available
        </p>
      </div>

      {/* Jobs Grid */}
      {filteredJobs.length > 0 ? (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredJobs.map((job) => {
            const detailParts = [
              jobTypeLabelMap[job.jobType] ?? job.jobType,
              job.location,
              job.salaryRange,
            ]
              .filter(Boolean)
              .join(" · ");

            return (
              <Link
                key={job.id}
                href={`/${orgSlug}/${job.slug}`}
                className="group block rounded-lg border border-slate-200 bg-white p-6 shadow-sm transition-all duration-200 hover:border-slate-300 hover:shadow-md dark:border-slate-800 dark:bg-stone-950/40 dark:hover:border-slate-700"
              >
                <div className="space-y-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                        {job.title}
                      </h3>
                      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                        {detailParts}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-400">
                    <span>
                      Posted{" "}
                      {new Date(job.createdAt).toLocaleDateString("en-US", {
                        month: "long",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </span>
                    {job.shortId && (
                      <span className="font-mono text-slate-300 dark:text-slate-600">
                        #{job.shortId}
                      </span>
                    )}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-slate-200 py-12 text-center dark:border-slate-800">
          <p className="text-lg font-medium text-slate-900 dark:text-white">
            No jobs found
          </p>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Try adjusting your search terms
          </p>
        </div>
      )}
    </div>
  );
}
