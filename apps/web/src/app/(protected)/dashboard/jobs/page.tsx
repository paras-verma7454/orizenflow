"use client";

import {
  RiAddLine,
  RiBriefcaseLine,
  RiBuildingLine,
  RiDeleteBinLine,
  RiHomeLine,
  RiMapPinLine,
  RiRemoteControlLine,
} from "@remixicon/react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { toast } from "sonner";

import { LinkIcon, type LinkIconHandle } from "@/components/ui/link";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { apiClient } from "@/lib/api/client";
import { config } from "@/lib/config";
import { shortId } from "@/lib/utils";

interface Job {
  id: string;
  shortId: string;
  title: string;
  description: string;
  organizationId: string;
  status: string;
  jobType: string;
  location: string | null;
  salaryRange: string | null;
  createdAt: string;
  updatedAt: string;
}

const JOB_TYPES: Record<
  string,
  { label: string; icon: typeof RiRemoteControlLine }
> = {
  remote: { label: "Remote", icon: RiRemoteControlLine },
  hybrid: { label: "Hybrid", icon: RiHomeLine },
  "on-site": { label: "On-site", icon: RiBuildingLine },
};

function statusVariant(status: string) {
  switch (status) {
    case "open":
      return "default" as const;
    case "draft":
      return "secondary" as const;
    case "closed":
      return "destructive" as const;
    case "filled":
      return "outline" as const;
    default:
      return "secondary" as const;
  }
}

function statusClassName(status: string) {
  switch (status) {
    case "open":
      return "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300";
    case "draft":
      return "border-slate-200 bg-slate-100 text-slate-700 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-300";
    case "closed":
      return "";
    case "filled":
      return "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-950/40 dark:text-blue-300";
    default:
      return "";
  }
}

function statusLabel(status: string) {
  switch (status) {
    case "open":
      return "Actively Hiring";
    case "draft":
      return "Draft";
    case "closed":
      return "Closed";
    case "filled":
      return "Position Filled";
    default:
      return status;
  }
}

function JobCard({ job }: { job: Job }) {
  const queryClient = useQueryClient();
  const jobType = JOB_TYPES[job.jobType];

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const res = await apiClient.v1.jobs[":id"].$delete({
        param: { id: job.id },
      });
      if (!res.ok) throw new Error("Failed to delete job");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["jobs"] });
      toast.success("Job deleted");
    },
    onError: () => toast.error("Failed to delete job"),
  });

  return (
    <Card className="group relative">
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <Link
            href={`/dashboard/jobs/${job.id}`}
            className="hover:underline underline-offset-2"
          >
            <CardTitle className="line-clamp-1">{job.title}</CardTitle>
          </Link>
          <Badge
            variant={statusVariant(job.status)}
            className={statusClassName(job.status)}
          >
            {statusLabel(job.status)}
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground">Job ID: {job.shortId}</p>
        <CardDescription className="line-clamp-2 whitespace-pre-wrap">
          {job.description}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
          {jobType && (
            <Badge variant="outline" className="text-xs gap-1">
              <jobType.icon className="size-3" />
              {jobType.label}
            </Badge>
          )}
          {job.location && (
            <span className="flex items-center gap-1">
              <RiMapPinLine className="size-3" />
              {job.location}
            </span>
          )}
          {job.salaryRange && <span>{job.salaryRange}</span>}
        </div>
      </CardContent>
      <CardFooter className="gap-2">
        <Button
          variant="outline"
          size="sm"
          className="cursor-pointer"
          render={<Link href={`/dashboard/jobs/${job.id}`} />}
        >
          View
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="cursor-pointer"
          render={<Link href={`/dashboard/jobs/${job.id}/edit`} />}
        >
          Edit
        </Button>
        <AlertDialog>
          <AlertDialogTrigger
            render={
              <Button
                variant="destructive"
                size="icon-sm"
                className="cursor-pointer ml-auto"
                disabled={deleteMutation.isPending}
              />
            }
          >
            <RiDeleteBinLine />
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete this job?</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently remove &ldquo;{job.title}&rdquo;. This
                action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                variant="destructive"
                className="cursor-pointer"
                onClick={() => deleteMutation.mutate()}
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardFooter>
    </Card>
  );
}

const STATUS_FILTERS = [
  { value: "all", label: "All" },
  { value: "open", label: "Actively Hiring" },
  { value: "draft", label: "Draft" },
  { value: "closed", label: "Closed" },
  { value: "filled", label: "Filled" },
] as const;

type StatusFilter = (typeof STATUS_FILTERS)[number]["value"];

type ApiError = {
  error?: {
    code?: string;
    message?: string;
  };
};

export default function JobsPage() {
  const router = useRouter();
  const [filter, setFilter] = useState<StatusFilter>("all");
  const linkIconRef = useRef<LinkIconHandle>(null);

  const { data: organizationProfile } = useQuery({
    queryKey: ["organization-profile"],
    queryFn: async () => {
      const res = await apiClient.v1.organization.profile.$get();
      if (!res.ok) return null;
      const json = await res.json();
      return json.data as { slug: string };
    },
  });

  const handleCopyJobsPageLink = async () => {
    if (!organizationProfile?.slug) {
      toast.error("Organization slug not available");
      return;
    }

    const link = `${config.app.url}/${organizationProfile.slug}/jobs`;

    try {
      await navigator.clipboard.writeText(link);
      toast.success("Jobs page link copied");
    } catch {
      toast.error("Failed to copy link");
    }
  };

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["jobs"],
    queryFn: async () => {
      const res = await apiClient.v1.jobs.$get();
      const json = (await res.json()) as ApiError & { data?: Job[] };

      if (!res.ok) {
        const message = json.error?.message ?? "Failed to load jobs";
        const err = new Error(message) as Error & { code?: string };
        err.code = json.error?.code;
        throw err;
      }

      return (json.data ?? []) as Job[];
    },
  });

  const allJobs = data ?? [];
  const filteredJobs =
    filter === "all" ? allJobs : allJobs.filter((j) => j.status === filter);

  const countByStatus = (status: string) =>
    allJobs.filter((j) => j.status === status).length;

  return (
    <div className="flex flex-1 flex-col gap-6 p-6 pt-14">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Jobs</h1>
          <p className="text-sm text-muted-foreground">
            Manage your job postings.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={handleCopyJobsPageLink}
            disabled={!organizationProfile?.slug}
            onMouseEnter={() => linkIconRef.current?.startAnimation()}
            onMouseLeave={() => linkIconRef.current?.stopAnimation()}
          >
            <LinkIcon ref={linkIconRef} size={16} />
            Copy Jobs Page Link
          </Button>
          <Button
            className="cursor-pointer"
            render={<Link href="/dashboard/jobs/new" />}
          >
            <RiAddLine />
            Create Job
          </Button>
        </div>
      </div>

      {!isLoading && allJobs.length > 0 && (
        <Tabs
          value={filter}
          onValueChange={(val) => setFilter(val as StatusFilter)}
        >
          <TabsList>
            {STATUS_FILTERS.map((s) => {
              const count =
                s.value === "all" ? allJobs.length : countByStatus(s.value);
              return (
                <TabsTrigger key={s.value} value={s.value}>
                  {s.label}
                  {count > 0 && (
                    <Badge
                      variant="secondary"
                      className="ml-1 h-4 min-w-4 px-1 text-[10px]"
                    >
                      {count}
                    </Badge>
                  )}
                </TabsTrigger>
              );
            })}
          </TabsList>
        </Tabs>
      )}

      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-5 w-40" />
                <Skeleton className="h-4 w-full" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-4 w-24" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : isError ? (
        <Card className="flex-1">
          <CardContent className="flex flex-1 items-center justify-center py-16">
            <Empty>
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <RiBriefcaseLine />
                </EmptyMedia>
                <EmptyTitle>Unable to load jobs</EmptyTitle>
                <EmptyDescription>
                  {((error as Error & { code?: string })?.code ===
                  "NO_ACTIVE_ORGANIZATION"
                    ? "Select or create an organization to view your job postings."
                    : error?.message) ?? "Please try again."}
                </EmptyDescription>
              </EmptyHeader>
              <EmptyContent>
                {(error as Error & { code?: string })?.code ===
                "NO_ACTIVE_ORGANIZATION" ? (
                  <Button
                    className="cursor-pointer"
                    onClick={() => router.push("/onboarding/organization")}
                  >
                    <RiAddLine />
                    Set up organization
                  </Button>
                ) : (
                  <Button
                    className="cursor-pointer"
                    onClick={() => window.location.reload()}
                  >
                    Retry
                  </Button>
                )}
              </EmptyContent>
            </Empty>
          </CardContent>
        </Card>
      ) : allJobs.length === 0 ? (
        <Card className="flex-1">
          <CardContent className="flex flex-1 items-center justify-center py-16">
            <Empty>
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <RiBriefcaseLine />
                </EmptyMedia>
                <EmptyTitle>No jobs yet</EmptyTitle>
                <EmptyDescription>
                  Create your first job posting to start building your hiring
                  pipeline.
                </EmptyDescription>
              </EmptyHeader>
              <EmptyContent>
                <Button
                  className="cursor-pointer"
                  render={<Link href="/dashboard/jobs/new" />}
                >
                  <RiAddLine />
                  Create Job
                </Button>
              </EmptyContent>
            </Empty>
          </CardContent>
        </Card>
      ) : filteredJobs.length === 0 ? (
        <Card className="flex-1">
          <CardContent className="flex flex-1 items-center justify-center py-16">
            <Empty>
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <RiBriefcaseLine />
                </EmptyMedia>
                <EmptyTitle>
                  No{" "}
                  {STATUS_FILTERS.find(
                    (s) => s.value === filter,
                  )?.label.toLowerCase()}{" "}
                  jobs
                </EmptyTitle>
                <EmptyDescription>
                  No jobs match the selected filter.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredJobs.map((job) => (
            <JobCard key={job.id} job={job} />
          ))}
        </div>
      )}
    </div>
  );
}
