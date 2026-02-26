"use client";

import { useQuery } from "@tanstack/react-query";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { apiClient } from "@/lib/api/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useMemo, useState } from "react";
import {
  RiOrganizationChart,
  RiUser3Line,
  RiSuitcaseLine,
  RiFileTextLine,
  RiShieldFlashLine,
  RiPulseLine,
  RiMailSendLine,
  RiDatabase2Line,
  RiRefreshLine,
  RiPulseFill,
  RiDownloadLine,
} from "@remixicon/react";
import { Badge } from "@/components/ui/badge";

type OverviewResponse = {
  totals: {
    users: number;
    organizations: number;
    jobs: number;
    applications: number;
    evaluations: number;
  };
  jobsByStatus: Array<{ status: string; count: number }>;
  applicationsByStatus: Array<{ status: string; count: number }>;
  evaluations: {
    averageScore: number | null;
    completedLast24Hours: number;
  };
  queue: {
    connected: boolean;
    counts: {
      waiting: number;
      active: number;
      completed: number;
      failed: number;
      delayed: number;
      paused: number;
    };
    oldestWaitingAgeSeconds: number | null;
    queuedLast24HoursProxy: number;
  };
};

export default function AdminOverviewPage() {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["admin-overview"],
    queryFn: async () => {
      const response = await apiClient.v1.admin.overview.$get();
      if (!response.ok) {
        throw new Error("Failed to load admin overview");
      }
      const json = await response.json();
      return json.data as OverviewResponse;
    },
  });

  const [isSending, setIsSending] = useState(false);
  const [lastSyncAt, setLastSyncAt] = useState<Date | null>(null);

  const lastSyncLabel = useMemo(() => {
    if (!lastSyncAt) return "--";
    return lastSyncAt.toLocaleTimeString();
  }, [lastSyncAt]);

  const handleSendLiveNow = async () => {
    if (
      !confirm(
        "Are you sure you want to send the 'Live Now' email to all pending waitlist users?",
      )
    )
      return;

    setIsSending(true);
    try {
      const res = await apiClient.v1.admin.waitlist["send-live-now"].$post();
      if (!res.ok) throw new Error("Failed to send emails");
      const result = await res.json();
      toast.success(`Successfully sent emails to ${result.count} users!`);
    } catch (error) {
      toast.error("Failed to send live now emails");
    } finally {
      setIsSending(false);
    }
  };

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="h-32 w-full" />
        ))}
      </div>
    );
  }

  if (isError || !data) {
    return (
      <Card className="border-destructive/20 bg-destructive/5">
        <CardHeader>
          <div className="flex items-center gap-2 text-destructive">
            <RiDatabase2Line className="h-5 w-5" />
            <CardTitle>Overview unavailable</CardTitle>
          </div>
          <CardDescription>
            Unable to load platform metrics from the API.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const stats = [
    {
      label: "Total Users",
      value: data.totals.users,
      icon: RiUser3Line,
      color: "text-blue-500",
    },
    {
      label: "Organizations",
      value: data.totals.organizations,
      icon: RiOrganizationChart,
      color: "text-purple-500",
    },
    {
      label: "Active Jobs",
      value: data.totals.jobs,
      icon: RiSuitcaseLine,
      color: "text-orange-500",
    },
    {
      label: "Applications",
      value: data.totals.applications,
      icon: RiFileTextLine,
      color: "text-green-500",
    },
  ];

  const handleRefresh = async () => {
    const result = await refetch();
    if (result.data) {
      setLastSyncAt(new Date());
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="rounded-xl border bg-card/60 p-4 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-3">
            <Badge
              variant="outline"
              className="bg-green-500/5 text-green-600 border-green-200 gap-1 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider"
            >
              <RiPulseFill className="size-3 animate-pulse" />
              System Live
            </Badge>
            <div className="rounded-full border bg-muted/40 px-3 py-1">
              <span className="text-[10px] text-muted-foreground font-mono">
                LAST SYNC: {lastSyncLabel}
              </span>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              className="h-8 gap-2 text-xs font-semibold"
            >
              <RiRefreshLine className="size-3.5" />
              Refresh
            </Button>
            <Button
              size="sm"
              className="h-8 gap-2 text-xs font-semibold shadow-sm"
            >
              <RiDownloadLine className="size-3.5" />
              Export Data
            </Button>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card
            key={stat.label}
            className="overflow-hidden border shadow-sm bg-card/70"
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1">
              <CardTitle className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {stat.label}
              </CardTitle>
              <stat.icon className={`h-4 w-4 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold tracking-tight tabular-nums">
                {stat.value.toLocaleString()}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Evaluation Metrics */}
        <Card className="lg:col-span-2 border shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <RiShieldFlashLine className="h-5 w-5 text-primary" />
              <CardTitle className="text-base">
                AI Evaluation Performance
              </CardTitle>
            </div>
            <CardDescription>
              Throughput and scoring metrics for the last 24 hours.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4 rounded-lg border bg-muted/30 p-4">
              <div className="space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Avg Score
                </span>
                <p className="text-2xl font-mono font-semibold tabular-nums">
                  {data.evaluations.averageScore ?? "-"}
                </p>
              </div>
              <div className="space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Completed (24h)
                </span>
                <p className="text-2xl font-mono font-semibold tabular-nums">
                  {data.evaluations.completedLast24Hours}
                </p>
              </div>
              <div className="space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Queued (24h)
                </span>
                <p className="text-2xl font-mono font-semibold tabular-nums">
                  {data.queue.queuedLast24HoursProxy}
                </p>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-2 gap-8">
              <div className="space-y-3">
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">
                  Jobs by Status
                </h4>
                <div className="space-y-2">
                  {data.jobsByStatus.map((item) => (
                    <div
                      key={item.status}
                      className="flex items-center justify-between text-sm"
                    >
                      <span className="capitalize">{item.status}</span>
                      <div className="flex items-center gap-2">
                        <div className="h-1 w-24 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary"
                            style={{
                              width: `${data.totals.jobs ? (item.count / data.totals.jobs) * 100 : 0}%`,
                            }}
                          />
                        </div>
                        <span className="font-mono tabular-nums w-6 text-right">
                          {item.count}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="space-y-3">
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">
                  Applications
                </h4>
                <div className="space-y-2">
                  {data.applicationsByStatus.map((item) => (
                    <div
                      key={item.status}
                      className="flex items-center justify-between text-sm"
                    >
                      <span className="capitalize">{item.status}</span>
                      <div className="flex items-center gap-2">
                        <div className="h-1 w-24 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary"
                            style={{
                              width: `${data.totals.applications ? (item.count / data.totals.applications) * 100 : 0}%`,
                            }}
                          />
                        </div>
                        <span className="font-mono tabular-nums w-6 text-right">
                          {item.count}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Queue Health */}
        <Card className="flex flex-col border shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <RiPulseLine className="h-5 w-5 text-primary" />
                <CardTitle className="text-base">Queue Health</CardTitle>
              </div>
              <Badge
                variant={data.queue.connected ? "default" : "destructive"}
                className="text-[10px] px-1.5 py-0"
              >
                {data.queue.connected ? "CONNECTED" : "OFFLINE"}
              </Badge>
            </div>
            <CardDescription>
              {data.queue.connected
                ? "Real-time worker queue status via Redis."
                : "Queue metrics are unavailable because Redis is disconnected."}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex-1 space-y-4">
            <div className="grid grid-cols-2 gap-2">
              {[
                {
                  label: "Waiting",
                  value: data.queue.counts.waiting,
                  color: "text-yellow-600",
                },
                {
                  label: "Active",
                  value: data.queue.counts.active,
                  color: "text-blue-600",
                },
                {
                  label: "Completed",
                  value: data.queue.counts.completed,
                  color: "text-green-600",
                },
                {
                  label: "Failed",
                  value: data.queue.counts.failed,
                  color: "text-red-600",
                },
              ].map((c) => (
                <div
                  key={c.label}
                  className="rounded border bg-muted/20 p-2 text-center"
                >
                  <span className="text-[10px] text-muted-foreground uppercase">
                    {c.label}
                  </span>
                  <p
                    className={`text-lg font-mono font-bold tabular-nums ${c.color}`}
                  >
                    {c.value}
                  </p>
                </div>
              ))}
            </div>
            <div className="rounded-lg border border-primary/10 bg-primary/5 p-3">
              <span className="text-xs text-muted-foreground block mb-1">
                Oldest Waiting Age
              </span>
              <p className="text-xl font-mono font-bold tabular-nums">
                {data.queue.oldestWaitingAgeSeconds === null
                  ? "0s"
                  : `${data.queue.oldestWaitingAgeSeconds}s`}
              </p>
            </div>
          </CardContent>
          <div className="p-6 pt-0 mt-auto">
            <Button
              onClick={handleSendLiveNow}
              disabled={isSending}
              className="w-full gap-2"
              variant="outline"
              size="sm"
            >
              {isSending ? (
                <Skeleton className="h-4 w-4 rounded-full" />
              ) : (
                <RiMailSendLine className="h-4 w-4" />
              )}
              {isSending ? "Processing..." : "Notify Waitlist (Live Now)"}
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
