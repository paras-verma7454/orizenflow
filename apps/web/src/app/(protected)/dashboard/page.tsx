"use client";

import { RiBriefcaseLine, RiGroupLine, RiTimeLine } from "@remixicon/react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
} from "@/components/ui/card";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";
import { apiClient } from "@/lib/api/client";

type Job = {
  id: string;
  title: string;
  status: string;
};

type Candidate = {
  id: string;
  name: string;
  email: string;
  resumeUrl: string;
  status: string;
  createdAt: string;
  job: {
    id: string;
    title: string;
  };
};

export default function DashboardPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["dashboard-overview"],
    queryFn: async () => {
      const [jobsRes, candidatesRes] = await Promise.all([
        apiClient.v1.jobs.$get(),
        apiClient.v1.candidates.$get({
          query: {
            limit: "200",
            offset: "0",
          },
        }),
      ]);

      if (!jobsRes.ok || !candidatesRes.ok) {
        throw new Error("Failed to load dashboard");
      }

      const jobsJson = await jobsRes.json();
      const candidatesJson = await candidatesRes.json();

      return {
        jobs: (jobsJson.data ?? []) as Job[],
        candidates: (candidatesJson.data ?? []) as Candidate[],
      };
    },
  });

  const jobs = data?.jobs ?? [];
  const candidates = data?.candidates ?? [];
  const openJobsCount = jobs.filter((job) => job.status === "open").length;
  const pendingReviewCount = candidates.filter(
    (candidate) => candidate.status === "applied",
  ).length;
  const recentCandidates = [...candidates].slice(0, 5);

  const stats = [
    {
      title: "Open Jobs",
      value: String(openJobsCount),
      description: "Active job postings",
      icon: <RiBriefcaseLine className="size-4 text-muted-foreground" />,
    },
    {
      title: "Candidates",
      value: String(candidates.length),
      description: "Total applications",
      icon: <RiGroupLine className="size-4 text-muted-foreground" />,
    },
    {
      title: "Pending Review",
      value: String(pendingReviewCount),
      description: "Awaiting evaluation",
      icon: <RiTimeLine className="size-4 text-muted-foreground" />,
    },
  ];

  return (
    <div className="flex flex-1 flex-col gap-6 p-6 pt-14">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Overview of your hiring pipeline.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {isLoading
          ? Array.from({ length: 3 }).map((_, index) => (
              <Card key={index}>
                <CardHeader>
                  <Skeleton className="h-4 w-24" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-8 w-16" />
                  <Skeleton className="mt-2 h-3 w-28" />
                </CardContent>
              </Card>
            ))
          : stats.map((stat) => (
              <Card key={stat.title}>
                <CardHeader className="flex-row items-center justify-between">
                  <CardDescription>{stat.title}</CardDescription>
                  {stat.icon}
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold tracking-tight">
                    {stat.value}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {stat.description}
                  </p>
                </CardContent>
              </Card>
            ))}
      </div>

      <Card className="flex-1">
        {isLoading ? (
          <CardContent className="space-y-4 py-6">
            <Skeleton className="h-5 w-40" />
            {Array.from({ length: 4 }).map((_, index) => (
              <Skeleton key={index} className="h-12 w-full" />
            ))}
          </CardContent>
        ) : recentCandidates.length === 0 ? (
          <CardContent className="flex flex-1 items-center justify-center py-16">
            <Empty>
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <RiBriefcaseLine />
                </EmptyMedia>
                <EmptyTitle>No activity yet</EmptyTitle>
                <EmptyDescription>
                  Create your first job posting to start receiving and
                  evaluating candidates.
                </EmptyDescription>
              </EmptyHeader>
              <EmptyContent>
                <Button render={<Link href="/dashboard/jobs" />}>
                  View Jobs
                </Button>
              </EmptyContent>
            </Empty>
          </CardContent>
        ) : (
          <CardContent className="space-y-4 py-6">
            <h2 className="text-sm font-medium">Recent applications</h2>
            {recentCandidates.map((candidate) => (
              <div
                key={candidate.id}
                className="flex items-center justify-between rounded-lg border px-3 py-2"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">
                    {candidate.name}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {candidate.job.title}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-muted-foreground">
                    {new Date(candidate.createdAt).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    })}
                  </span>
                  <a
                    href={candidate.resumeUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs text-accent hover:underline"
                  >
                    Resume
                  </a>
                </div>
              </div>
            ))}
          </CardContent>
        )}
      </Card>
    </div>
  );
}
