"use client";

import {
  RiArrowLeftLine,
  RiBriefcaseLine,
  RiBuildingLine,
  RiCheckLine,
  RiDraftLine,
  RiFileTextLine,
  RiHomeLine,
  RiLightbulbLine,
  RiMapPinLine,
  RiMoneyDollarCircleLine,
  RiRemoteControlLine,
  RiSparklingLine,
} from "@remixicon/react";
import { useForm } from "@tanstack/react-form";
import { useMutation } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
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
import { Textarea } from "@/components/ui/textarea";
import { apiClient } from "@/lib/api/client";

const JOB_TYPES = [
  { value: "remote", label: "Remote", icon: RiRemoteControlLine },
  { value: "hybrid", label: "Hybrid", icon: RiHomeLine },
  { value: "on-site", label: "On-site", icon: RiBuildingLine },
] as const;

type JobType = (typeof JOB_TYPES)[number]["value"];
type JobStatus = "draft" | "open" | "closed" | "filled";

const formSchema = z.object({
  title: z.string().min(1, "Title is required").max(200),
  description: z.string().min(1, "Description is required"),
  jobType: z.enum(["remote", "hybrid", "on-site"]),
  location: z.string(),
  salaryRange: z.string(),
});

const TIPS = [
  "Use a clear, specific title that candidates search for",
  "Include responsibilities, requirements, and benefits",
  "Mention your tech stack and team culture",
  "Be transparent about salary to attract better fits",
];

export default function CreateJobPage() {
  const router = useRouter();

  const mutation = useMutation({
    mutationFn: async (values: z.infer<typeof formSchema>) => {
      const res = await apiClient.v1.jobs.$post({
        json: {
          title: values.title.trim(),
          description: values.description.trim(),
          jobType: values.jobType,
          location: values.location?.trim() || undefined,
          salaryRange: values.salaryRange?.trim() || undefined,
          status: "open" as JobStatus,
        },
      });
      if (!res.ok) {
        const err = await res.json();
        const errorCode = (err as { error?: { code?: string } }).error?.code;
        if (errorCode === "NO_ACTIVE_ORGANIZATION") {
          router.push("/onboarding/organization");
        }
        throw new Error(
          (err as { error?: { message?: string } }).error?.message ??
            "Failed to create job",
        );
      }
      return res.json();
    },
    onSuccess: () => {
      toast.success("Job created successfully");
      router.push("/dashboard/jobs");
    },
    onError: (err) => toast.error(err.message),
  });

  const generateMutation = useMutation({
    mutationFn: async (payload: {
      context: string;
      jobType: JobType;
      location?: string;
      salaryRange?: string;
    }) => {
      const res = await apiClient.v1.jobs["generate-description"].$post({
        json: {
          context: payload.context.trim(),
          jobType: payload.jobType,
          location: payload.location?.trim() || undefined,
          salaryRange: payload.salaryRange?.trim() || undefined,
        },
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(
          (err as { error?: { message?: string } }).error?.message ??
            "Failed to generate job description",
        );
      }
      return res.json() as Promise<{
        data: { title: string; description: string; salaryRange?: string };
      }>;
    },
    onSuccess: ({ data }) => {
      form.setFieldValue("title", data.title as never);
      form.setFieldValue("description", data.description as never);
      if (data.salaryRange) {
        form.setFieldValue("salaryRange", data.salaryRange as never);
      }
      toast.success("Generated successfully");
    },
    onError: (err) => toast.error(err.message),
  });

  const form = useForm({
    defaultValues: {
      title: "",
      description: "",
      jobType: "on-site" as JobType,
      location: "",
      salaryRange: "",
    },
    validators: {
      onSubmit: formSchema,
    },
    onSubmit: async ({ value }) => {
      await mutation.mutateAsync(value);
    },
  });

  const handleGenerate = async () => {
    const title = form.getFieldValue("title").trim();
    const description = form.getFieldValue("description").trim();
    const jobType = form.getFieldValue("jobType") as JobType;
    const location = form.getFieldValue("location")?.trim();
    const salaryRange = form.getFieldValue("salaryRange")?.trim();

    const missingFields: string[] = [];
    if (!title) missingFields.push("title");
    if (!jobType) missingFields.push("job type");

    if (missingFields.length > 0) {
      toast.error(
        `Please fill ${missingFields.join(", ")} before generating with AI`,
      );
      return;
    }

    const contextParts = [
      `Job Title: ${title}`,
      description ? `Current Description: ${description}` : "",
    ].filter(Boolean);

    await generateMutation.mutateAsync({
      context: contextParts.join("\n"),
      jobType,
      location,
      salaryRange,
    });
  };

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
            <BreadcrumbPage>Create Job</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
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
            <h1 className="text-2xl font-bold tracking-tight">
              Create Job Posting
            </h1>
            <p className="text-sm text-muted-foreground">
              Define the role and requirements. You can edit details later.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button
            type="submit"
            form="create-job-form"
            disabled={mutation.isPending}
            className="cursor-pointer bg-blue-600 text-white hover:bg-blue-700"
          >
            {mutation.isPending ? "Creating..." : "Create Job"}
          </Button>
          <Button
            type="button"
            variant="outline"
            className="cursor-pointer border-blue-200 text-blue-700 hover:bg-blue-50"
            render={<Link href="/dashboard/jobs" />}
          >
            Cancel
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_300px] max-w-5xl">
        {/* Main form */}
        <form
          id="create-job-form"
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
                            "About the Role\nDescribe what this role involves and its impact on the team.\n\nRequirements\n• 3+ years of experience with React/TypeScript\n• Strong understanding of web fundamentals\n• Experience with modern build tools\n\nNice to Have\n• Open source contributions\n• Experience with design systems\n\nBenefits\n• Competitive salary and equity\n• Flexible working hours\n• Learning & development budget"
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
                        <FieldLabel htmlFor={field.name}>
                          Location{" "}
                          <span className="text-muted-foreground font-normal">
                            (optional)
                          </span>
                        </FieldLabel>
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
          {/* AI hint */}
          <Card className="border-dashed">
            <CardContent className="flex items-start gap-3 pt-4">
              <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
                <RiSparklingLine className="size-4 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium">AI Description</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Uses title and job type from this form. Optionally considers
                  location, salary range, and existing description.
                </p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="mt-3 cursor-pointer border-blue-200 text-blue-700 hover:bg-blue-50"
                  onClick={handleGenerate}
                  disabled={generateMutation.isPending}
                >
                  <RiSparklingLine />
                  {generateMutation.isPending
                    ? "Generating..."
                    : "Generate with AI"}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Status notice */}
          <Card className="bg-muted/30">
            <CardContent className="flex items-start gap-3 pt-4">
              <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted">
                <RiDraftLine className="size-4 text-muted-foreground" />
              </div>
              <div>
                <p className="text-sm font-medium">Starts as Open</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Your job is created as open by default. You can change the
                  status anytime from the job detail page.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Tips */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <RiLightbulbLine className="size-4 text-muted-foreground" />
                <CardTitle className="text-sm">
                  Tips for a Great Posting
                </CardTitle>
              </div>
            </CardHeader>
            <Separator />
            <CardContent className="pt-3">
              <ul className="space-y-2.5">
                {TIPS.map((tip) => (
                  <li
                    key={tip}
                    className="flex items-start gap-2 text-xs text-muted-foreground"
                  >
                    <RiCheckLine className="size-3.5 shrink-0 mt-0.5 text-primary" />
                    <span>{tip}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          {/* Description guide */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <RiFileTextLine className="size-4 text-muted-foreground" />
                <CardTitle className="text-sm">Description Structure</CardTitle>
              </div>
            </CardHeader>
            <Separator />
            <CardContent className="pt-3">
              <div className="space-y-2">
                {[
                  { label: "About the Role", desc: "What this role does" },
                  { label: "Requirements", desc: "Must-have skills" },
                  { label: "Nice to Have", desc: "Bonus qualifications" },
                  { label: "Benefits", desc: "Perks & compensation" },
                ].map((section, i) => (
                  <div
                    key={section.label}
                    className="flex items-center gap-2.5"
                  >
                    <div className="flex size-5 shrink-0 items-center justify-center rounded-full bg-muted text-[10px] font-medium text-muted-foreground">
                      {i + 1}
                    </div>
                    <div>
                      <p className="text-xs font-medium">{section.label}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {section.desc}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
