"use client";

import {
  RiArrowRightUpLine,
  RiBriefcaseLine,
  RiGroupLine,
  RiLineChartLine,
  RiTimeLine,
} from "@remixicon/react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useMemo } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  XAxis,
  YAxis,
} from "recharts";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
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

type CandidateStatus =
  | "applied"
  | "screening"
  | "interview"
  | "offer"
  | "hired"
  | "rejected";

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
  status: CandidateStatus;
  createdAt: string;
  job: {
    id: string;
    title: string;
  };
};

const statusOptions = [
  { value: "applied", label: "Applied" },
  { value: "screening", label: "Screening" },
  { value: "interview", label: "Interview" },
  { value: "offer", label: "Offer" },
  { value: "hired", label: "Hired" },
  { value: "rejected", label: "Rejected" },
] as const;

const statusLabelMap = Object.fromEntries(
  statusOptions.map((item) => [item.value, item.label]),
) as Record<CandidateStatus, string>;

const statusChartConfig = {
  total: {
    label: "Candidates",
    color: "var(--chart-2)",
  },
} satisfies ChartConfig;

const trendChartConfig = {
  applications: {
    label: "Applications",
    color: "var(--chart-1)",
  },
} satisfies ChartConfig;

const statusBadgeVariantMap = {
  applied: "outline",
  screening: "secondary",
  interview: "secondary",
  offer: "default",
  hired: "default",
  rejected: "destructive",
} as const;

const shortDateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
});

const longDateFormatter = new Intl.DateTimeFormat("en-US", {
  year: "numeric",
  month: "short",
  day: "numeric",
});

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
  const hiredCount = candidates.filter(
    (candidate) => candidate.status === "hired",
  ).length;
  const conversionRate =
    candidates.length > 0
      ? Math.round((hiredCount / candidates.length) * 100)
      : 0;

  const recentCandidates = useMemo(
    () =>
      [...candidates]
        .sort(
          (left, right) =>
            new Date(right.createdAt).getTime() -
            new Date(left.createdAt).getTime(),
        )
        .slice(0, 6),
    [candidates],
  );

  const statusChartData = useMemo(
    () =>
      statusOptions.map((statusOption) => ({
        status: statusOption.label,
        total: candidates.filter(
          (candidate) => candidate.status === statusOption.value,
        ).length,
      })),
    [candidates],
  );

  const trendChartData = useMemo(() => {
    const totalDays = 14;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const buckets = new Map<string, number>();
    for (let index = totalDays - 1; index >= 0; index -= 1) {
      const day = new Date(today);
      day.setDate(today.getDate() - index);
      const key = day.toISOString().slice(0, 10);
      buckets.set(key, 0);
    }

    candidates.forEach((candidate) => {
      const created = new Date(candidate.createdAt);
      created.setHours(0, 0, 0, 0);
      const key = created.toISOString().slice(0, 10);
      if (buckets.has(key)) {
        buckets.set(key, (buckets.get(key) ?? 0) + 1);
      }
    });

    return Array.from(buckets.entries()).map(([date, applications]) => ({
      date,
      label: shortDateFormatter.format(new Date(`${date}T00:00:00`)),
      applications,
    }));
  }, [candidates]);

  const activePipelineCount = candidates.filter(
    (candidate) =>
      candidate.status !== "hired" && candidate.status !== "rejected",
  ).length;

  const stats = [
    {
      title: "Open Jobs",
      value: String(openJobsCount),
      description: `${jobs.length} total jobs`,
      icon: <RiBriefcaseLine className="size-4 text-muted-foreground" />,
    },
    {
      title: "Total Candidates",
      value: String(candidates.length),
      description: "Total applications received",
      icon: <RiGroupLine className="size-4 text-muted-foreground" />,
    },
    {
      title: "Applied (Not Reviewed)",
      value: String(pendingReviewCount),
      description: "Candidates in applied stage",
      icon: <RiTimeLine className="size-4 text-muted-foreground" />,
    },
    {
      title: "Conversion Rate",
      value: `${conversionRate}%`,
      description: `${hiredCount} hired candidates`,
      icon: <RiLineChartLine className="size-4 text-muted-foreground" />,
    },
  ];

  return (
    <div className="flex flex-1 flex-col gap-6 p-6 pt-14">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            Real-time hiring pipeline snapshot and team activity.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            render={<Link href="/dashboard/candidates" />}
          >
            View Candidates
          </Button>
          <Button render={<Link href="/dashboard/jobs/new" />}>
            Create Job
            <RiArrowRightUpLine className="size-4" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {isLoading
          ? Array.from({ length: 4 }).map((_, index) => (
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

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle>Applications Trend</CardTitle>
            <CardDescription>
              New applications from the last 14 days
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-64 w-full" />
            ) : (
              <ChartContainer className="h-64 w-full" config={trendChartConfig}>
                <AreaChart
                  data={trendChartData}
                  margin={{ left: 12, right: 12 }}
                >
                  <CartesianGrid vertical={false} />
                  <XAxis
                    dataKey="label"
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                    minTickGap={18}
                  />
                  <ChartTooltip
                    cursor={false}
                    content={<ChartTooltipContent indicator="line" />}
                  />
                  <Area
                    dataKey="applications"
                    type="monotone"
                    fill="var(--color-applications)"
                    fillOpacity={0.2}
                    stroke="var(--color-applications)"
                    strokeWidth={2}
                  />
                </AreaChart>
              </ChartContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Pipeline Breakdown</CardTitle>
            <CardDescription>
              {activePipelineCount} active in pipeline
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-64 w-full" />
            ) : (
              <ChartContainer
                className="h-64 w-full"
                config={statusChartConfig}
              >
                <BarChart
                  data={statusChartData}
                  layout="vertical"
                  margin={{ left: 12, right: 8 }}
                >
                  <CartesianGrid horizontal={false} />
                  <YAxis
                    type="category"
                    dataKey="status"
                    axisLine={false}
                    tickLine={false}
                    width={76}
                  />
                  <XAxis type="number" hide />
                  <ChartTooltip
                    cursor={false}
                    content={<ChartTooltipContent hideLabel />}
                  />
                  <Bar dataKey="total" fill="var(--color-total)" radius={6} />
                </BarChart>
              </ChartContainer>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Applications</CardTitle>
          <CardDescription>
            Latest candidates entering your pipeline
          </CardDescription>
        </CardHeader>
        {isLoading ? (
          <CardContent className="space-y-3 pb-6">
            {Array.from({ length: 6 }).map((_, index) => (
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
          <CardContent className="space-y-2 pb-6">
            {recentCandidates.map((candidate) => (
              <div
                key={candidate.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">
                    {candidate.name}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {candidate.job.title} • {candidate.email}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge
                    variant={
                      statusBadgeVariantMap[candidate.status] ?? "outline"
                    }
                  >
                    {statusLabelMap[candidate.status]}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {longDateFormatter.format(new Date(candidate.createdAt))}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    render={
                      <Link href={`/dashboard/candidates/${candidate.id}`} />
                    }
                  >
                    Open
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        )}
      </Card>
    </div>
  );
}
