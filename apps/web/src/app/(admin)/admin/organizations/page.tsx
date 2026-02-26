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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { apiClient } from "@/lib/api/client";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

type Organization = {
  id: string;
  name: string;
  slug: string;
  logo: string | null;
  createdAt: string | null;
  jobCount: number;
  jobs: Array<{
    id: string;
    title: string;
    status: string;
    createdAt: string | null;
  }>;
};

import { Button } from "@/components/ui/button";
import { RiAddLine, RiDownloadLine, RiRefreshLine } from "@remixicon/react";

export default function AdminOrganizationsPage() {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["admin-organizations"],
    queryFn: async () => {
      const response = await apiClient.v1.admin.organizations.$get({
        query: { limit: "100", offset: "0" },
      });
      if (!response.ok) throw new Error("Failed to load organizations");
      const json = await response.json();
      return {
        rows: (json.data ?? []) as Organization[],
        total: json.pagination?.total ?? 0,
      };
    },
  });

  if (isLoading) return <Skeleton className="h-64 w-full" />;

  if (isError || !data) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Organizations unavailable</CardTitle>
          <CardDescription>Unable to load organization data.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const statusTone = (status: string) => {
    switch (status) {
      case "open":
        return "border-emerald-200 bg-emerald-500/10 text-emerald-700";
      case "closed":
        return "border-rose-200 bg-rose-500/10 text-rose-700";
      case "filled":
        return "border-blue-200 bg-blue-500/10 text-blue-700";
      case "draft":
        return "border-amber-200 bg-amber-500/10 text-amber-700";
      default:
        return "border-muted-foreground/20 bg-muted/40 text-muted-foreground";
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold tracking-tight">Organizations</h2>
          <p className="text-sm text-muted-foreground">
            {data.total} organizations registered on the platform.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            className="h-8 gap-2 text-xs font-semibold"
          >
            <RiRefreshLine className="size-3.5" />
            Refresh
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-8 gap-2 text-xs font-semibold"
          >
            <RiDownloadLine className="size-3.5" />
            Export CSV
          </Button>
          <Button
            size="sm"
            className="h-8 gap-2 text-xs font-semibold shadow-sm"
          >
            <RiAddLine className="size-3.5" />
            Add Organization
          </Button>
        </div>
      </div>

      <Card className="border-none shadow-none bg-transparent">
        <CardContent className="px-0">
          <div className="rounded-xl border bg-gradient-to-b from-card/80 to-card/40 shadow-sm overflow-hidden">
            <Table className="text-[13px]">
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="w-[72px]">Logo</TableHead>
                  <TableHead className="font-semibold text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                    Organization
                  </TableHead>
                  <TableHead className="font-semibold text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                    Slug
                  </TableHead>
                  <TableHead className="font-semibold text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                    Jobs
                  </TableHead>
                  <TableHead className="font-semibold text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                    Status
                  </TableHead>
                  <TableHead className="text-right font-semibold text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                    Created
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.rows.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      className="h-24 text-center text-muted-foreground"
                    >
                      No organizations found.
                    </TableCell>
                  </TableRow>
                ) : (
                  data.rows.map((org) => {
                    const orgJobs = org.jobs ?? [];
                    const statusCounts = orgJobs.reduce<Record<string, number>>(
                      (acc, job) => {
                        acc[job.status] = (acc[job.status] ?? 0) + 1;
                        return acc;
                      },
                      {},
                    );
                    return (
                      <TableRow
                        key={org.id}
                        className="group/row hover:bg-muted/20 transition-colors"
                      >
                        <TableCell>
                          <Avatar className="h-10 w-10 border-2 border-background shadow-sm">
                            <AvatarImage src={org.logo || ""} alt={org.name} />
                            <AvatarFallback className="text-[10px] bg-muted font-bold text-muted-foreground">
                              {org.name.substring(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                        </TableCell>
                        <TableCell className="align-top">
                          <div className="space-y-1">
                            <p className="font-semibold text-foreground text-[15px]">
                              {org.name}
                            </p>
                            <p className="text-[11px] text-muted-foreground font-mono">
                              {org.id}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell className="align-top">
                          <Badge
                            variant="outline"
                            className="font-mono text-[10px] bg-background/60"
                          >
                            {org.slug}
                          </Badge>
                        </TableCell>
                        <TableCell className="align-top">
                          <div className="flex items-center gap-2">
                            <Badge
                              variant="secondary"
                              className="text-[10px] font-mono"
                            >
                              {org.jobCount}
                            </Badge>
                            <span className="text-[11px] text-muted-foreground">
                              jobs
                            </span>
                          </div>
                          {orgJobs.length > 0 ? (
                            <div className="mt-2 space-y-1">
                              {orgJobs.slice(0, 2).map((job) => (
                                <div
                                  key={job.id}
                                  className="flex items-center gap-2 text-[11px]"
                                >
                                  <span className="truncate max-w-[200px] text-muted-foreground">
                                    {job.title}
                                  </span>
                                  <Badge
                                    className={cn(
                                      "border text-[9px] uppercase tracking-wide",
                                      statusTone(job.status),
                                    )}
                                  >
                                    {job.status}
                                  </Badge>
                                </div>
                              ))}
                              {orgJobs.length > 2 ? (
                                <span className="text-[10px] text-muted-foreground">
                                  +{orgJobs.length - 2} more
                                </span>
                              ) : null}
                            </div>
                          ) : (
                            <p className="mt-2 text-[11px] text-muted-foreground">
                              No jobs yet
                            </p>
                          )}
                        </TableCell>
                        <TableCell className="align-top">
                          <div className="flex flex-wrap gap-1">
                            {Object.entries(statusCounts).map(
                              ([status, count]) => (
                                <Badge
                                  key={status}
                                  className={cn(
                                    "border text-[9px] uppercase tracking-wide",
                                    statusTone(status),
                                  )}
                                >
                                  {status} {count}
                                </Badge>
                              ),
                            )}
                            {orgJobs.length === 0 ? (
                              <Badge
                                className={cn(
                                  "border text-[9px] uppercase tracking-wide",
                                  statusTone("unknown"),
                                )}
                              >
                                none
                              </Badge>
                            ) : null}
                          </div>
                        </TableCell>
                        <TableCell className="text-right text-[11px] font-mono text-muted-foreground align-top">
                          {org.createdAt
                            ? new Date(org.createdAt).toLocaleDateString(
                                "en-US",
                                {
                                  year: "numeric",
                                  month: "short",
                                  day: "numeric",
                                },
                              )
                            : "-"}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
