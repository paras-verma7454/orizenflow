"use client";

import {
  RiArrowLeftLine,
  RiBriefcaseLine,
  RiBuildingLine,
  RiHistoryLine,
  RiHomeLine,
  RiInformationLine,
  RiMapPinLine,
  RiMoneyDollarCircleLine,
  RiRemoteControlLine,
  RiShieldCheckLine,
} from "@remixicon/react";
import { useForm } from "@tanstack/react-form";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { z } from "zod";

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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { apiClient } from "@/lib/api/client";

interface Job {
  id: string;
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

const JOB_TYPES = [
  { value: "remote", label: "Remote", icon: RiRemoteControlLine },
  { value: "hybrid", label: "Hybrid", icon: RiHomeLine },
  { value: "on-site", label: "On-site", icon: RiBuildingLine },
] as const;

const JOB_STATUSES = [
  { value: "draft", label: "Draft", description: "Not visible to candidates" },
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

type JobType = (typeof JOB_TYPES)[number]["value"];
type JobStatus = (typeof JOB_STATUSES)[number]["value"];

const formSchema = z.object({
  title: z.string().min(1, "Title is required").max(200),
  description: z.string().min(1, "Description is required"),
  jobType: z.enum(["remote", "hybrid", "on-site"]),
  status: z.enum(["draft", "open", "closed", "filled"]),
  location: z.string(),
  salaryRange: z.string(),
});

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

function EditJobForm({ job }: { job: Job }) {
  const router = useRouter();
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async (values: z.infer<typeof formSchema>) => {
      const res = await apiClient.v1.jobs[":id"].$put({
        param: { id: job.id },
        json: {
          title: values.title,
          description: values.description,
          jobType: values.jobType,
          status: values.status,
          location: values.location?.trim() || undefined,
          salaryRange: values.salaryRange?.trim() || undefined,
        },
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(
          (err as { error?: { message?: string } }).error?.message ??
            "Failed to update job",
        );
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["jobs", job.id] });
      queryClient.invalidateQueries({ queryKey: ["jobs"] });
      toast.success("Job updated successfully");
      router.push(`/dashboard/jobs/${job.id}`);
    },
    onError: (err) => toast.error(err.message),
  });

  const form = useForm({
    defaultValues: {
      title: job.title,
      description: job.description,
      jobType: job.jobType as JobType,
      status: job.status as JobStatus,
      location: job.location ?? "",
      salaryRange: job.salaryRange ?? "",
    },
    validators: {
      onSubmit: formSchema,
    },
    onSubmit: async ({ value }) => {
      await mutation.mutateAsync(value);
    },
  });

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
            <BreadcrumbLink
              render={<Link href={`/dashboard/jobs/${job.id}`} />}
            >
              {job.title}
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>Edit</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon-sm"
            className="cursor-pointer"
            render={<Link href={`/dashboard/jobs/${job.id}`} />}
          >
            <RiArrowLeftLine />
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              Edit Job Posting
            </h1>
            <p className="text-sm text-muted-foreground">
              Update the job details below.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button
            type="submit"
            form="edit-job-form"
            disabled={mutation.isPending}
            className="cursor-pointer"
          >
            {mutation.isPending ? "Saving..." : "Save Changes"}
          </Button>
          <Button
            type="button"
            variant="outline"
            className="cursor-pointer"
            render={<Link href={`/dashboard/jobs/${job.id}`} />}
          >
            Cancel
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_300px] max-w-5xl">
        {/* Main form */}
        <form
          id="edit-job-form"
          className="flex flex-col gap-6"
          onSubmit={(e) => {
            e.preventDefault();
            form.handleSubmit();
          }}
        >
          {/* Section: Role basics */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <div className="flex size-7 items-center justify-center rounded-md bg-primary/10">
                  <RiBriefcaseLine className="size-4 text-primary" />
                </div>
                <div>
                  <CardTitle>Role Information</CardTitle>
                </div>
              </div>
            </CardHeader>
            <Separator />
            <CardContent className="pt-4">
              <FieldGroup>
                <form.Field name="title">
                  {(field) => {
                    const isInvalid =
                      field.state.meta.isTouched && !field.state.meta.isValid;
                    return (
                      <Field data-invalid={isInvalid}>
                        <FieldLabel htmlFor={field.name}>Job Title</FieldLabel>
                        <Input
                          id={field.name}
                          placeholder="e.g. Senior Frontend Engineer"
                          value={field.state.value}
                          onBlur={field.handleBlur}
                          onChange={(e) => field.handleChange(e.target.value)}
                        />
                        <FieldDescription>
                          Use a standard title candidates would search for.
                        </FieldDescription>
                        {isInvalid && (
                          <FieldError errors={field.state.meta.errors} />
                        )}
                      </Field>
                    );
                  }}
                </form.Field>

                <form.Field name="description">
                  {(field) => {
                    const isInvalid =
                      field.state.meta.isTouched && !field.state.meta.isValid;
                    return (
                      <Field data-invalid={isInvalid}>
                        <FieldLabel htmlFor={field.name}>
                          <div className="flex items-center gap-2">
                            Description
                            <Badge
                              variant="secondary"
                              className="text-[10px] font-normal"
                            >
                              Markdown-friendly
                            </Badge>
                          </div>
                        </FieldLabel>
                        <Textarea
                          id={field.name}
                          placeholder={
                            "Describe the role, responsibilities, and requirements.\n\nUse line breaks to structure sections."
                          }
                          rows={14}
                          className="font-mono text-[13px] leading-relaxed"
                          value={field.state.value}
                          onBlur={field.handleBlur}
                          onChange={(e) => field.handleChange(e.target.value)}
                        />
                        <FieldDescription>
                          Structure with sections: About, Requirements, Nice to
                          Have, Benefits.
                        </FieldDescription>
                        {isInvalid && (
                          <FieldError errors={field.state.meta.errors} />
                        )}
                      </Field>
                    );
                  }}
                </form.Field>
              </FieldGroup>
            </CardContent>
          </Card>

          {/* Section: Work details */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <div className="flex size-7 items-center justify-center rounded-md bg-primary/10">
                  <RiMapPinLine className="size-4 text-primary" />
                </div>
                <div>
                  <CardTitle>Work Details</CardTitle>
                </div>
              </div>
            </CardHeader>
            <Separator />
            <CardContent className="pt-4">
              <FieldGroup>
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                  <form.Field name="jobType">
                    {(field) => (
                      <Field>
                        <FieldLabel>Job Type</FieldLabel>
                        <Select
                          value={field.state.value}
                          onValueChange={(val) =>
                            field.handleChange(val as JobType)
                          }
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select job type" />
                          </SelectTrigger>
                          <SelectContent>
                            {JOB_TYPES.map((type) => (
                              <SelectItem key={type.value} value={type.value}>
                                <type.icon className="size-4" />
                                {type.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </Field>
                    )}
                  </form.Field>

                  <form.Field name="location">
                    {(field) => (
                      <Field>
                        <FieldLabel htmlFor={field.name}>Location</FieldLabel>
                        <Input
                          id={field.name}
                          placeholder="e.g. San Francisco, CA"
                          value={field.state.value}
                          onChange={(e) => field.handleChange(e.target.value)}
                        />
                      </Field>
                    )}
                  </form.Field>
                </div>
              </FieldGroup>
            </CardContent>
          </Card>

          {/* Section: Compensation */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <div className="flex size-7 items-center justify-center rounded-md bg-primary/10">
                  <RiMoneyDollarCircleLine className="size-4 text-primary" />
                </div>
                <div>
                  <CardTitle>Compensation</CardTitle>
                </div>
              </div>
            </CardHeader>
            <Separator />
            <CardContent className="pt-4">
              <FieldGroup>
                <form.Field name="salaryRange">
                  {(field) => (
                    <Field>
                      <FieldLabel htmlFor={field.name}>
                        Salary Range{" "}
                        <span className="text-muted-foreground font-normal">
                          (optional)
                        </span>
                      </FieldLabel>
                      <Input
                        id={field.name}
                        placeholder="e.g. $120k - $180k"
                        value={field.state.value}
                        onChange={(e) => field.handleChange(e.target.value)}
                      />
                      <FieldDescription>
                        Transparent salary ranges attract 30% more qualified
                        candidates.
                      </FieldDescription>
                    </Field>
                  )}
                </form.Field>
              </FieldGroup>
            </CardContent>
          </Card>
        </form>

        {/* Sidebar */}
        <div className="flex flex-col gap-4 lg:sticky lg:top-20 lg:self-start">
          {/* Hiring status */}
          <Card className="bg-muted/30">
            <CardContent className="flex items-start gap-3 pt-4">
              <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted">
                <RiShieldCheckLine className="size-4 text-muted-foreground" />
              </div>
              <form.Field name="status">
                {(field) => {
                  const selectedStatus = JOB_STATUSES.find(
                    (s) => s.value === field.state.value,
                  );
                  return (
                    <div className="w-full">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium">Hiring Status</p>
                        {selectedStatus ? (
                          <Badge
                            variant={statusVariant(field.state.value)}
                            className="text-[10px]"
                          >
                            {selectedStatus.label}
                          </Badge>
                        ) : null}
                      </div>
                      <Select
                        value={field.state.value}
                        onValueChange={(val) =>
                          field.handleChange(val as JobStatus)
                        }
                      >
                        <SelectTrigger className="mt-2 w-full">
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                        <SelectContent>
                          {JOB_STATUSES.map((status) => (
                            <SelectItem key={status.value} value={status.value}>
                              {status.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {selectedStatus ? (
                        <p className="text-xs text-muted-foreground mt-2">
                          {selectedStatus.description}
                        </p>
                      ) : null}
                    </div>
                  );
                }}
              </form.Field>
            </CardContent>
          </Card>

          {/* Timestamps */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <RiHistoryLine className="size-4 text-muted-foreground" />
                <CardTitle className="text-sm">Activity</CardTitle>
              </div>
            </CardHeader>
            <Separator />
            <CardContent className="pt-3">
              <div className="space-y-2.5">
                <div>
                  <p className="text-xs text-muted-foreground">Created</p>
                  <p className="text-xs font-medium">
                    {new Date(job.createdAt).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Last updated</p>
                  <p className="text-xs font-medium">
                    {new Date(job.updatedAt).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Info note */}
          <Card className="border-dashed">
            <CardContent className="flex items-start gap-3 pt-4">
              <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted">
                <RiInformationLine className="size-4 text-muted-foreground" />
              </div>
              <div>
                <p className="text-sm font-medium">Auto-saved Timestamps</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  The &quot;last updated&quot; date will be automatically set
                  when you save changes.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default function EditJobPage() {
  const params = useParams<{ id: string }>();

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

  if (isLoading) {
    return (
      <div className="flex flex-1 flex-col gap-6 p-6 pt-14">
        <Skeleton className="h-4 w-48" />
        <Skeleton className="h-8 w-80" />
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_300px] max-w-5xl">
          <div className="flex flex-col gap-6">
            <Card>
              <CardContent className="space-y-4 py-6">
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-32 w-full" />
              </CardContent>
            </Card>
            <Card>
              <CardContent className="space-y-4 py-6">
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-full" />
              </CardContent>
            </Card>
          </div>
          <div className="flex flex-col gap-4">
            <Card>
              <CardContent className="py-6">
                <Skeleton className="h-12 w-full" />
              </CardContent>
            </Card>
          </div>
        </div>
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

  return <EditJobForm job={job} />;
}
