"use client";

import { useMemo, useRef, useState } from "react";
import {
  Bar,
  BarChart,
  Cell,
  CartesianGrid,
  XAxis,
  YAxis,
  Area,
  AreaChart,
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
import { PointerHighlight } from "@/components/ui/pointer-highlight";
import {
  AnimatedBriefcase,
  type AnimatedBriefcaseHandle,
} from "@/components/icons/animated-briefcase";
import {
  AnimatedUsersCandidates,
  type AnimatedUsersCandidatesHandle,
} from "@/components/icons/animated-users-candidates";
import {
  AnimatedClock,
  type AnimatedClockHandle,
} from "@/components/icons/animated-clock";
import {
  AnimatedLineChart,
  type AnimatedLineChartHandle,
} from "@/components/icons/animated-line-chart";
import {
  dashboardDemoCandidates,
  dashboardDemoJobs,
  type CandidateStatus,
} from "@/lib/dashboard-demo-data";

const statusOptions = [
  { value: "all", label: "All" },
  { value: "applied", label: "Applied" },
  { value: "interview", label: "Interview" },
  { value: "hired", label: "Hired" },
] as const;

const statusChartConfig = {
  total: {
    label: "Candidates  ",
    color: "var(--chart-2)",
  },
} satisfies ChartConfig;

const trendChartConfig = {
  applications: {
    label: "Applications ",
    color: "var(--chart-1)",
  },
} satisfies ChartConfig;

const shortDateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
});

const longDateFormatter = new Intl.DateTimeFormat("en-US", {
  year: "numeric",
  month: "short",
  day: "numeric",
});

const compactNumberFormatter = new Intl.NumberFormat("en-US", {
  notation: "compact",
  maximumFractionDigits: 1,
});

const statusBaseVolumeMap: Record<CandidateStatus, number> = {
  applied: 620,
  screening: 980,
  interview: 760,
  offer: 540,
  hired: 420,
  rejected: 300,
};

const badgeVariantByStatus = {
  applied: "outline",
  screening: "secondary",
  interview: "secondary",
  offer: "default",
  hired: "default",
  rejected: "destructive",
} as const;

const pipelineStageColorMap: Record<string, string> = {
  Applied: "var(--chart-1)",
  Screening: "var(--chart-2)",
  Interview: "var(--chart-3)",
  Offer: "var(--chart-4)",
  Hired: "var(--chart-5)",
};

export function ProductPreviewSection() {
  const [selectedStatus, setSelectedStatus] = useState<"all" | CandidateStatus>(
    "all",
  );
  const briefcaseRef = useRef<AnimatedBriefcaseHandle>(null);
  const usersRef = useRef<AnimatedUsersCandidatesHandle>(null);
  const clockRef = useRef<AnimatedClockHandle>(null);
  const chartRef = useRef<AnimatedLineChartHandle>(null);

  const getCandidateVolume = (candidateId: string, status: CandidateStatus) => {
    const idNumber = Number(candidateId.split("-")[1] ?? 0);
    const boost = Number.isNaN(idNumber) ? 0 : (idNumber % 5) * 95;
    return statusBaseVolumeMap[status] + boost;
  };

  const filteredCandidates = useMemo(
    () =>
      selectedStatus === "all"
        ? dashboardDemoCandidates
        : dashboardDemoCandidates.filter(
            (candidate) => candidate.status === selectedStatus,
          ),
    [selectedStatus],
  );

  const openJobsCount = dashboardDemoJobs.filter(
    (job) => job.status === "open",
  ).length;
  const totalApplications = filteredCandidates.reduce(
    (sum, candidate) =>
      sum + getCandidateVolume(candidate.id, candidate.status),
    0,
  );
  const pendingApplications = filteredCandidates
    .filter((candidate) => candidate.status === "applied")
    .reduce(
      (sum, candidate) =>
        sum + getCandidateVolume(candidate.id, candidate.status),
      0,
    );
  const hiredApplications = filteredCandidates
    .filter((candidate) => candidate.status === "hired")
    .reduce(
      (sum, candidate) =>
        sum + getCandidateVolume(candidate.id, candidate.status),
      0,
    );
  const conversionRate =
    totalApplications > 0
      ? Math.round((hiredApplications / totalApplications) * 100)
      : 0;

  const statusChartData = useMemo(
    () => [
      {
        status: "Applied",
        total: filteredCandidates
          .filter((candidate) => candidate.status === "applied")
          .reduce(
            (sum, candidate) =>
              sum + getCandidateVolume(candidate.id, candidate.status),
            0,
          ),
      },
      {
        status: "Screening",
        total: filteredCandidates
          .filter((candidate) => candidate.status === "screening")
          .reduce(
            (sum, candidate) =>
              sum + getCandidateVolume(candidate.id, candidate.status),
            0,
          ),
      },
      {
        status: "Interview",
        total: filteredCandidates
          .filter((candidate) => candidate.status === "interview")
          .reduce(
            (sum, candidate) =>
              sum + getCandidateVolume(candidate.id, candidate.status),
            0,
          ),
      },
      {
        status: "Offer",
        total: filteredCandidates
          .filter((candidate) => candidate.status === "offer")
          .reduce(
            (sum, candidate) =>
              sum + getCandidateVolume(candidate.id, candidate.status),
            0,
          ),
      },
      {
        status: "Hired",
        total: filteredCandidates
          .filter((candidate) => candidate.status === "hired")
          .reduce(
            (sum, candidate) =>
              sum + getCandidateVolume(candidate.id, candidate.status),
            0,
          ),
      },
    ],
    [filteredCandidates],
  );

  const trendChartData = useMemo(() => {
    const totalDays = 14;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const buckets = new Map<string, number>();
    for (let index = 0; index < totalDays; index += 1) {
      const day = new Date(today);
      day.setDate(today.getDate() - (totalDays - 1 - index));
      const key = day.toISOString().slice(0, 10);
      buckets.set(key, 0);
    }

    filteredCandidates.forEach((candidate) => {
      const key = new Date(candidate.createdAt).toISOString().slice(0, 10);
      if (buckets.has(key)) {
        buckets.set(
          key,
          (buckets.get(key) ?? 0) +
            getCandidateVolume(candidate.id, candidate.status),
        );
      }
    });

    return Array.from(buckets.entries()).map(([date, applications]) => ({
      date,
      label: shortDateFormatter.format(new Date(`${date}T00:00:00`)),
      applications,
    }));
  }, [filteredCandidates]);

  const recentCandidates = useMemo(
    () =>
      [...filteredCandidates]
        .sort(
          (left, right) =>
            new Date(right.createdAt).getTime() -
            new Date(left.createdAt).getTime(),
        )
        .slice(0, 5),
    [filteredCandidates],
  );

  return (
    <section
      id="product-preview"
      className="border-b border-border bg-zinc-100/60 py-24 dark:bg-zinc-950"
    >
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
            Explore the hiring dashboard.
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-muted-foreground">
            Filter pipeline stages and inspect live chart behavior with
            realistic demo candidates.
          </p>
        </div>
        <Card className="mx-auto max-w-6xl border-border/70 bg-card shadow-sm dark:shadow-none">
          <CardHeader>
            <CardTitle>Hiring Pipeline Dashboard</CardTitle>
            {/* <CardDescription>Interactive demo data</CardDescription> */}
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex flex-wrap gap-2">
              {statusOptions.map((statusOption) => (
                <Button
                  key={statusOption.value}
                  variant={
                    selectedStatus === statusOption.value
                      ? "default"
                      : "outline"
                  }
                  size="sm"
                  onClick={() => setSelectedStatus(statusOption.value)}
                >
                  {statusOption.label}
                </Button>
              ))}
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <Card
                onMouseEnter={() => briefcaseRef.current?.startAnimation()}
                onMouseLeave={() => briefcaseRef.current?.stopAnimation()}
              >
                <CardHeader className="flex-row items-center justify-between">
                  <div className="flex items-center gap-3">
                    <AnimatedBriefcase
                      ref={briefcaseRef}
                      className="size-6 text-muted-foreground shrink-0"
                    />
                    <CardDescription className="text-sm font-medium">
                      Open Jobs
                    </CardDescription>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-semibold">{openJobsCount}</div>
                  <p className="text-xs text-muted-foreground">
                    {dashboardDemoJobs.length} total jobs
                  </p>
                </CardContent>
              </Card>
              <Card
                onMouseEnter={() => usersRef.current?.startAnimation()}
                onMouseLeave={() => usersRef.current?.stopAnimation()}
              >
                <CardHeader className="flex-row items-center justify-between">
                  <div className="flex items-center gap-3">
                    <AnimatedUsersCandidates
                      ref={usersRef}
                      className="size-6 text-muted-foreground shrink-0"
                    />
                    <CardDescription className="text-sm font-medium">
                      Total Applications
                    </CardDescription>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-semibold">
                    {compactNumberFormatter.format(totalApplications)}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Total applications received
                  </p>
                </CardContent>
              </Card>
              <Card
                onMouseEnter={() => clockRef.current?.startAnimation()}
                onMouseLeave={() => clockRef.current?.stopAnimation()}
              >
                <CardHeader className="flex-row items-center justify-between">
                  <div className="flex items-center gap-3">
                    <AnimatedClock
                      ref={clockRef}
                      className="size-6 text-muted-foreground shrink-0"
                    />
                    <CardDescription className="text-sm font-medium">
                      Applied Queue
                    </CardDescription>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-semibold">
                    {compactNumberFormatter.format(pendingApplications)}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Candidates in applied stage
                  </p>
                </CardContent>
              </Card>
              <Card
                onMouseEnter={() => chartRef.current?.startAnimation()}
                onMouseLeave={() => chartRef.current?.stopAnimation()}
              >
                <CardHeader className="flex-row items-center justify-between">
                  <div className="flex items-center gap-3">
                    <AnimatedLineChart
                      ref={chartRef}
                      className="size-6 text-muted-foreground shrink-0"
                    />
                    <CardDescription className="text-sm font-medium">
                      Conversion Rate
                    </CardDescription>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-semibold">
                    {conversionRate}%
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {compactNumberFormatter.format(hiredApplications)} hired
                    applications
                  </p>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
              <Card className="xl:col-span-2">
                <CardHeader>
                  <CardTitle>Applications Trend</CardTitle>
                  <CardDescription>Last 14 days</CardDescription>
                </CardHeader>
                <CardContent>
                  <ChartContainer
                    className="h-56 w-full"
                    config={trendChartConfig}
                  >
                    <AreaChart
                      data={trendChartData}
                      margin={{ left: 18, right: 18, top: 10, bottom: 10 }}
                    >
                      <CartesianGrid vertical={false} />
                      <XAxis
                        dataKey="label"
                        tickLine={false}
                        axisLine={false}
                        tickMargin={8}
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
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Pipeline Breakdown</CardTitle>
                  <CardDescription>By candidate stage</CardDescription>
                </CardHeader>
                <CardContent>
                  <ChartContainer
                    className="h-56 w-full"
                    config={statusChartConfig}
                  >
                    <BarChart
                      data={statusChartData}
                      layout="vertical"
                      margin={{ left: 10, right: 8 }}
                    >
                      <CartesianGrid horizontal={false} />
                      <YAxis
                        type="category"
                        dataKey="status"
                        axisLine={false}
                        tickLine={false}
                        width={72}
                      />
                      <XAxis type="number" />
                      <ChartTooltip
                        cursor={true}
                        content={<ChartTooltipContent indicator="dashed" />}
                      />
                      <Bar dataKey="total" radius={6}>
                        {statusChartData.map((entry) => (
                          <Cell
                            key={`stage-cell-${entry.status}`}
                            fill={
                              pipelineStageColorMap[entry.status] ??
                              "var(--color-total)"
                            }
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ChartContainer>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Recent Applications</CardTitle>
                <CardDescription>Filtered candidates</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
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
                      <Badge variant={badgeVariantByStatus[candidate.status]}>
                        {candidate.status.charAt(0).toUpperCase() +
                          candidate.status.slice(1)}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {longDateFormatter.format(
                          new Date(candidate.createdAt),
                        )}
                      </span>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
