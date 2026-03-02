"use client";

import {
  RiArrowLeftLine,
  RiBuildingLine,
  RiCalendarLine,
  RiFileCopyLine,
  RiDeleteBinLine,
  RiEditLine,
  RiHomeLine,
  RiMapPinLine,
  RiMoneyDollarCircleLine,
  RiRemoteControlLine,
} from "@remixicon/react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { RiLoaderLine } from "@remixicon/react";

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
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { apiClient } from "@/lib/api/client";
import { config } from "@/lib/config";

interface Job {
  id: string;
  shortId: string;
  title: string;
  slug: string;
  description: string;
  organizationId: string;
  status: string;
  jobType: string;
  location: string | null;
  salaryRange: string | null;
  createdAt: string;
  updatedAt: string;
}

interface OrganizationProfile {
  slug: string;
}

const JOB_STATUSES = [
  { value: "draft", label: "Draft", description: "Not yet published" },
  {
    value: "open",
    label: "Actively Hiring",
    description: "Accepting applications",
  },
  {
    value: "closed",
    label: "Closed",
    description: "No longer accepting applications",
  },
  {
    value: "filled",
    label: "Position Filled",
    description: "A candidate was hired",
  },
] as const;

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

function statusLabel(status: string) {
  return JOB_STATUSES.find((s) => s.value === status)?.label ?? status;
}

export default function JobDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [isEmbedDialogOpen, setIsEmbedDialogOpen] = useState(false);
  const [showEmbedPreview, setShowEmbedPreview] = useState(false);
  const [isIframeLoading, setIsIframeLoading] = useState(false);

  const { data: job, isLoading } = useQuery({
    queryKey: ["jobs", params.id],
    queryFn: async () => {
      const res = await apiClient.v1.jobs[":id"].$get({
        param: { id: params.id },
      });
      if (!res.ok) throw new Error("Job not found");
      const json = await res.json();
      return json.data as Job;
    },
  });

  const { data: organizationProfile } = useQuery({
    queryKey: ["organization-profile"],
    queryFn: async () => {
      const res = await apiClient.v1.organization.profile.$get();
      if (!res.ok) throw new Error("Failed to load organization profile");
      const json = await res.json();
      return json.data as OrganizationProfile;
    },
  });

  const handleCopyPublicLink = async () => {
    if (!organizationProfile?.slug || !job?.id) {
      toast.error("Public link is not available yet");
      return;
    }

    const link = `${config.app.url}/${organizationProfile.slug}/${job.slug}/${job.shortId}`;

    try {
      await navigator.clipboard.writeText(link);
      toast.success("Public link copied");
    } catch {
      toast.error("Failed to copy link");
    }
  };

  const handleCopyEmbedCode = async () => {
    if (!organizationProfile?.slug || !job?.id) {
      toast.error("Embed code is not available yet");
      return;
    }

    const embedUrl = `${config.app.url}/${organizationProfile.slug}/${job.slug}/${job.shortId}?embed=1`;
    const snippet = `<iframe src="${embedUrl}" title="Apply for ${job.title}" width="100%" height="980" frameborder="0" loading="lazy"></iframe>`;

    try {
      await navigator.clipboard.writeText(snippet);
      toast.success("Embed code copied");
    } catch {
      toast.error("Failed to copy embed code");
    }
  };

  const statusMutation = useMutation({
    mutationFn: async (status: string) => {
      const res = await apiClient.v1.jobs[":id"].$put({
        param: { id: params.id },
        json: { status: status as "draft" | "open" | "closed" | "filled" },
      });
      if (!res.ok) throw new Error("Failed to update status");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["jobs", params.id] });
      queryClient.invalidateQueries({ queryKey: ["jobs"] });
      toast.success("Status updated");
    },
    onError: () => toast.error("Failed to update status"),
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const res = await apiClient.v1.jobs[":id"].$delete({
        param: { id: params.id },
      });
      if (!res.ok) throw new Error("Failed to delete job");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["jobs"] });
      toast.success("Job deleted");
      router.push("/dashboard/jobs");
    },
    onError: () => toast.error("Failed to delete job"),
  });

  if (isLoading) {
    return (
      <div className="flex flex-1 flex-col gap-6 p-6 pt-14">
        <Skeleton className="h-4 w-48" />
        <Skeleton className="h-8 w-80" />
        <Card className="max-w-3xl">
          <CardContent className="space-y-4 py-6">
            <Skeleton className="h-5 w-64" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!job) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 p-6">
        <p className="text-muted-foreground">Job not found.</p>
        <Button
          variant="outline"
          className="cursor-pointer"
          render={<Link href="/dashboard/jobs" />}
        >
          Back to Jobs
        </Button>
      </div>
    );
  }

  const jobType = JOB_TYPES[job.jobType];
  const jobShortId = job.id.replace(/-/g, "").slice(-6).toUpperCase();
  const embedUrl = organizationProfile?.slug
    ? `${config.app.url}/${organizationProfile.slug}/${job.slug}/${job.shortId}?embed=1`
    : "";
  const embedSnippet = organizationProfile?.slug
    ? `<iframe src="${embedUrl}" title="Apply for ${job.title}" width="100%" height="980" frameborder="0" loading="lazy"></iframe>`
    : "";

  return (
    <div className="flex flex-1 flex-col gap-6 p-6 pt-14">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink render={<Link href="/dashboard/jobs" />}>
              Jobs
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>{job.title}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon-sm"
            className="cursor-pointer"
            render={<Link href="/dashboard/jobs" />}
          >
            <RiArrowLeftLine />
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold tracking-tight">{job.title}</h1>
              <Badge variant={statusVariant(job.status)}>
                {statusLabel(job.status)}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              Posted{" "}
              {new Date(job.createdAt).toLocaleDateString("en-US", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </p>
            <p className="text-xs text-muted-foreground font-mono">
              Job ID: {job.id.replace(/-/g, "").slice(-6).toUpperCase()}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            className="cursor-pointer"
            onClick={handleCopyPublicLink}
          >
            <RiFileCopyLine />
            Copy Public Link
          </Button>
          <Dialog
            open={isEmbedDialogOpen}
            onOpenChange={(open) => {
              setIsEmbedDialogOpen(open);
              if (!open) {
                setShowEmbedPreview(false);
                setIsIframeLoading(false);
              }
            }}
          >
            <DialogTrigger
              render={<Button variant="outline" className="cursor-pointer" />}
            >
              <RiFileCopyLine />
              Embed Code
            </DialogTrigger>
            <DialogContent className="sm:max-w-3xl">
              <DialogHeader>
                <DialogTitle>Embed Apply Form</DialogTitle>
                <DialogDescription>
                  Preview the application form and copy the iframe snippet for
                  your careers page.
                </DialogDescription>
              </DialogHeader>

              {organizationProfile?.slug ? (
                <div className="grid gap-4 md:grid-cols-2 md:items-start">
                  <div className="space-y-2">
                    <h3 className="text-sm font-medium">Form Preview</h3>

                    <div className="rounded-md border bg-muted/20 p-2">
                      {showEmbedPreview ? (
                        <div className="relative">
                          {isIframeLoading && (
                            <div className="absolute inset-0 flex items-center justify-center rounded-md border bg-background/90 backdrop-blur-sm z-10">
                              <div className="flex flex-col items-center gap-2">
                                <RiLoaderLine className="h-8 w-8 animate-spin text-muted-foreground" />
                                <p className="text-sm text-muted-foreground">
                                  Loading preview...
                                </p>
                              </div>
                            </div>
                          )}
                          <div className="overflow-hidden rounded-md border bg-background">
                            <iframe
                              src={embedUrl}
                              title={`Apply for ${job.title}`}
                              className="h-96 w-full"
                              loading="lazy"
                              onLoad={() => setIsIframeLoading(false)}
                            />
                          </div>
                        </div>
                      ) : (
                        <div className="flex h-96 items-center justify-center rounded-md border bg-background/80">
                          <div className="space-y-2 px-4 text-center">
                            <p className="text-sm text-muted-foreground">
                              Preview loads on demand for faster dialog opening.
                            </p>
                            <Button
                              variant="outline"
                              className="cursor-pointer"
                              onClick={() => {
                                setShowEmbedPreview(true);
                                setIsIframeLoading(true);
                              }}
                            >
                              Load Preview
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="text-sm font-medium">Code Snippet</h3>
                      <Button
                        variant="outline"
                        size="sm"
                        className="cursor-pointer"
                        onClick={handleCopyEmbedCode}
                      >
                        <RiFileCopyLine />
                        Copy Code
                      </Button>
                    </div>
                    <pre className="max-h-96 overflow-auto rounded-md border bg-muted/30 p-3 text-xs whitespace-pre-wrap break-all">
                      <code>{embedSnippet}</code>
                    </pre>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Embed code is unavailable until your organization slug is
                  configured.
                </p>
              )}
            </DialogContent>
          </Dialog>
          <Button
            variant="outline"
            className="cursor-pointer"
            render={<Link href={`/dashboard/jobs/${job.id}/edit`} />}
          >
            <RiEditLine />
            Edit
          </Button>
          <AlertDialog>
            <AlertDialogTrigger
              render={
                <Button
                  variant="destructive"
                  size="icon"
                  className="cursor-pointer"
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
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 max-w-3xl lg:grid-cols-[1fr_280px] lg:max-w-5xl">
        <Card>
          <CardHeader>
            <h2 className="text-base font-medium">Job Description</h2>
          </CardHeader>
          <Separator />
          <CardContent className="pt-4">
            <div className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">
              {job.description}
            </div>
          </CardContent>
        </Card>

        <div className="flex flex-col gap-4">
          <Card>
            <CardHeader>
              <h2 className="text-base font-medium">Status</h2>
            </CardHeader>
            <Separator />
            <CardContent className="pt-4">
              <Select
                value={job.status}
                onValueChange={(val) => val && statusMutation.mutate(val)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {JOB_STATUSES.map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-2">
                {JOB_STATUSES.find((s) => s.value === job.status)?.description}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <h2 className="text-base font-medium">Details</h2>
            </CardHeader>
            <Separator />
            <CardContent className="pt-4 space-y-3">
              {jobType && (
                <div className="flex items-center gap-2 text-sm">
                  <jobType.icon className="size-4 text-muted-foreground" />
                  <span>{jobType.label}</span>
                </div>
              )}
              {job.location && (
                <div className="flex items-center gap-2 text-sm">
                  <RiMapPinLine className="size-4 text-muted-foreground" />
                  <span>{job.location}</span>
                </div>
              )}
              {job.salaryRange && (
                <div className="flex items-center gap-2 text-sm">
                  <RiMoneyDollarCircleLine className="size-4 text-muted-foreground" />
                  <span>{job.salaryRange}</span>
                </div>
              )}
              <div className="flex items-center gap-2 text-sm">
                <RiCalendarLine className="size-4 text-muted-foreground" />
                <span>
                  Updated{" "}
                  {new Date(job.updatedAt).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                  })}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
