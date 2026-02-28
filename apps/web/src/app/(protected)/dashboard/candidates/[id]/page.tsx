"use client";

import {
  RiArrowLeftLine,
  RiBriefcaseLine,
  RiExternalLinkLine,
  RiFileTextLine,
  RiGithubLine,
  RiLinkedinBoxLine,
  RiLoader4Line,
  RiMailLine,
  RiRobot2Line,
  RiTimeLine,
} from "@remixicon/react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
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
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { PipelineStepper } from "@/components/pipeline-stepper";
import { apiClient } from "@/lib/api/client";

type CandidateStatus =
  | "applied"
  | "screening"
  | "interview"
  | "offer"
  | "hired"
  | "rejected";

type Candidate = {
  id: string;
  name: string;
  email: string;
  resumeUrl: string;
  linkedinUrl: string | null;
  githubUrl: string | null;
  portfolioUrl: string | null;
  coverLetter: string | null;
  status: CandidateStatus;
  createdAt: string;
  job: {
    id: string;
    title: string;
  };
};

type CandidateEvaluation = {
  id: string;
  model: string;
  score: number | null;
  summary: string | null;
  strengthsJson: string | null;
  weaknessesJson: string | null;
  recommendation: string | null;
  evidenceJson: string | null;
  aiResponseJson: string | null;
  updatedAt: string;
};

type EvaluationBreakdownItem = {
  key: string;
  label: string;
  score: number;
  max: number;
};

const statusMeta: Record<
  CandidateStatus,
  {
    label: string;
    badgeClassName: string;
    currentClassName: string;
    idleClassName: string;
    currentLabelClassName: string;
    idleLabelClassName: string;
  }
> = {
  applied: {
    label: "Applied",
    badgeClassName:
      "border-sky-300/70 bg-sky-500/15 text-sky-800 dark:border-sky-400/40 dark:bg-sky-400/15 dark:text-sky-200",
    currentClassName: "border-sky-400/80 bg-sky-500/15",
    idleClassName:
      "border-slate-300/80 bg-background hover:border-sky-300/70 hover:bg-sky-500/12 dark:border-slate-700/80 dark:hover:border-sky-400/35 dark:hover:bg-sky-400/12",
    currentLabelClassName: "text-sky-800 dark:text-sky-200",
    idleLabelClassName:
      "text-muted-foreground group-hover:text-sky-700 dark:group-hover:text-sky-300",
  },
  screening: {
    label: "Screening",
    badgeClassName:
      "border-indigo-300/70 bg-indigo-500/15 text-indigo-800 dark:border-indigo-400/40 dark:bg-indigo-400/15 dark:text-indigo-200",
    currentClassName: "border-indigo-400/80 bg-indigo-500/15",
    idleClassName:
      "border-slate-300/80 bg-background hover:border-indigo-300/70 hover:bg-indigo-500/12 dark:border-slate-700/80 dark:hover:border-indigo-400/35 dark:hover:bg-indigo-400/12",
    currentLabelClassName: "text-indigo-800 dark:text-indigo-200",
    idleLabelClassName:
      "text-muted-foreground group-hover:text-indigo-700 dark:group-hover:text-indigo-300",
  },
  interview: {
    label: "Interview",
    badgeClassName:
      "border-violet-300/70 bg-violet-500/15 text-violet-800 dark:border-violet-400/40 dark:bg-violet-400/15 dark:text-violet-200",
    currentClassName: "border-violet-400/80 bg-violet-500/15",
    idleClassName:
      "border-slate-300/80 bg-background hover:border-violet-300/70 hover:bg-violet-500/12 dark:border-slate-700/80 dark:hover:border-violet-400/35 dark:hover:bg-violet-400/12",
    currentLabelClassName: "text-violet-800 dark:text-violet-200",
    idleLabelClassName:
      "text-muted-foreground group-hover:text-violet-700 dark:group-hover:text-violet-300",
  },
  offer: {
    label: "Offer",
    badgeClassName:
      "border-amber-300/70 bg-amber-500/15 text-amber-900 dark:border-amber-400/40 dark:bg-amber-400/15 dark:text-amber-200",
    currentClassName: "border-amber-400/80 bg-amber-500/15",
    idleClassName:
      "border-slate-300/80 bg-background hover:border-amber-300/70 hover:bg-amber-500/12 dark:border-slate-700/80 dark:hover:border-amber-400/35 dark:hover:bg-amber-400/12",
    currentLabelClassName: "text-amber-900 dark:text-amber-200",
    idleLabelClassName:
      "text-muted-foreground group-hover:text-amber-800 dark:group-hover:text-amber-300",
  },
  hired: {
    label: "Hired",
    badgeClassName:
      "border-emerald-300/70 bg-emerald-500/15 text-emerald-800 dark:border-emerald-400/40 dark:bg-emerald-400/15 dark:text-emerald-200",
    currentClassName: "border-emerald-400/80 bg-emerald-500/15",
    idleClassName:
      "border-slate-300/80 bg-background hover:border-emerald-300/70 hover:bg-emerald-500/12 dark:border-slate-700/80 dark:hover:border-emerald-400/35 dark:hover:bg-emerald-400/12",
    currentLabelClassName: "text-emerald-800 dark:text-emerald-200",
    idleLabelClassName:
      "text-muted-foreground group-hover:text-emerald-700 dark:group-hover:text-emerald-300",
  },
  rejected: {
    label: "Rejected",
    badgeClassName:
      "border-rose-300/70 bg-rose-500/15 text-rose-800 dark:border-rose-400/40 dark:bg-rose-400/15 dark:text-rose-200",
    currentClassName: "border-rose-400/80 bg-rose-500/15",
    idleClassName:
      "border-slate-300/80 bg-background hover:border-rose-300/70 hover:bg-rose-500/12 dark:border-slate-700/80 dark:hover:border-rose-400/35 dark:hover:bg-rose-400/12",
    currentLabelClassName: "text-rose-800 dark:text-rose-200",
    idleLabelClassName:
      "text-muted-foreground group-hover:text-rose-700 dark:group-hover:text-rose-300",
  },
};

const statusOrder: CandidateStatus[] = [
  "applied",
  "screening",
  "interview",
  "offer",
  "hired",
  "rejected",
];

const pipelineColorMeta: Record<
  CandidateStatus,
  {
    completedClassName: string;
    activeClassName: string;
    selectedClassName: string;
  }
> = {
  applied: {
    completedClassName: "bg-sky-600 text-white",
    activeClassName: "bg-sky-600 text-white",
    selectedClassName:
      "bg-sky-700 text-white ring-2 ring-sky-300/70 ring-inset",
  },
  screening: {
    completedClassName: "bg-indigo-600 text-white",
    activeClassName: "bg-indigo-600 text-white",
    selectedClassName:
      "bg-indigo-700 text-white ring-2 ring-indigo-300/70 ring-inset",
  },
  interview: {
    completedClassName: "bg-violet-600 text-white",
    activeClassName: "bg-violet-600 text-white",
    selectedClassName:
      "bg-violet-700 text-white ring-2 ring-violet-300/70 ring-inset",
  },
  offer: {
    completedClassName: "bg-amber-500 text-amber-950",
    activeClassName: "bg-amber-500 text-amber-950",
    selectedClassName:
      "bg-amber-600 text-white ring-2 ring-amber-300/70 ring-inset",
  },
  hired: {
    completedClassName: "bg-emerald-600 text-white",
    activeClassName: "bg-emerald-600 text-white",
    selectedClassName:
      "bg-emerald-700 text-white ring-2 ring-emerald-300/70 ring-inset",
  },
  rejected: {
    completedClassName: "bg-rose-600 text-white",
    activeClassName: "bg-rose-600 text-white",
    selectedClassName:
      "bg-rose-700 text-white ring-2 ring-rose-300/70 ring-inset",
  },
};

function getInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function parseStringArray(raw: string | null) {
  if (!raw) return [] as string[];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [] as string[];
    return parsed.filter((item): item is string => typeof item === "string");
  } catch {
    return [] as string[];
  }
}

function parseEvaluationBreakdown(raw: string | null) {
  if (!raw)
    return {
      roleFamily: null as string | null,
      rubricVersion: null as string | null,
      breakdown: [] as EvaluationBreakdownItem[],
    };
  try {
    const parsed = JSON.parse(raw) as {
      roleFamily?: unknown;
      rubricVersion?: unknown;
      scoreBreakdown?: unknown;
    };

    let breakdown: EvaluationBreakdownItem[] = [];
    if (Array.isArray(parsed.scoreBreakdown)) {
      breakdown = parsed.scoreBreakdown
        .map((item) => {
          if (!item || typeof item !== "object") return null;
          const row = item as Record<string, unknown>;
          const score =
            typeof row.score === "number" ? row.score : Number(row.score ?? 0);
          const max =
            typeof row.max === "number" ? row.max : Number(row.max ?? 0);
          return {
            key: String(row.key ?? ""),
            label: String(row.label ?? row.key ?? ""),
            score: Number.isFinite(score) ? score : 0,
            max: Number.isFinite(max) && max > 0 ? max : 0,
          };
        })
        .filter(
          (item): item is EvaluationBreakdownItem =>
            !!item && item.label.length > 0 && item.max > 0,
        );
    } else if (
      parsed.scoreBreakdown &&
      typeof parsed.scoreBreakdown === "object"
    ) {
      const legacy = parsed.scoreBreakdown as Record<string, unknown>;
      const maxByKey: Record<string, number> = {
        skills: 30,
        projects: 25,
        impact: 20,
        github: 15,
        resume: 10,
      };
      breakdown = Object.entries(maxByKey).map(([key, max]) => {
        const scoreRaw = legacy[key];
        const score =
          typeof scoreRaw === "number" ? scoreRaw : Number(scoreRaw ?? 0);
        return {
          key,
          label: key[0]!.toUpperCase() + key.slice(1),
          score: Number.isFinite(score)
            ? Math.max(0, Math.min(max, Math.round(score)))
            : 0,
          max,
        };
      });
    }

    return {
      roleFamily:
        typeof parsed.roleFamily === "string" ? parsed.roleFamily : null,
      rubricVersion:
        typeof parsed.rubricVersion === "string" ? parsed.rubricVersion : null,
      breakdown,
    };
  } catch {
    return {
      roleFamily: null as string | null,
      rubricVersion: null as string | null,
      breakdown: [] as EvaluationBreakdownItem[],
    };
  }
}

export default function CandidateProfilePage() {
  const params = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const [optimisticStatus, setOptimisticStatus] =
    useState<CandidateStatus | null>(null);
  const [selectedStage, setSelectedStage] = useState<CandidateStatus | null>(
    null,
  );

  const { data: candidate, isLoading: isCandidateLoading } = useQuery({
    queryKey: ["candidate", params.id],
    queryFn: async () => {
      const res = await apiClient.v1.candidates[":id"].$get({
        param: { id: params.id },
      });
      if (!res.ok) throw new Error("Failed to load candidate");
      const json = await res.json();
      return json.data as Candidate;
    },
  });
  const { data: evaluation, isLoading: isEvaluationLoading } = useQuery({
    queryKey: ["candidate-evaluation", params.id],
    queryFn: async () => {
      const res = await apiClient.v1.candidates[":id"].evaluation.$get({
        param: { id: params.id },
      });
      if (!res.ok) throw new Error("Failed to load candidate evaluation");
      const json = await res.json();
      return (json.data ?? null) as CandidateEvaluation | null;
    },
  });

  const statusMutation = useMutation({
    mutationFn: async (nextStatus: CandidateStatus) => {
      const res = await apiClient.v1.candidates[":id"].status.$patch({
        param: { id: params.id },
        json: { status: nextStatus },
      });
      if (!res.ok) throw new Error("Failed to update candidate status");
      return res.json();
    },
    onMutate: async (nextStatus) => {
      setOptimisticStatus(nextStatus);
      const previousCandidate = queryClient.getQueryData<Candidate>([
        "candidate",
        params.id,
      ]);
      if (previousCandidate) {
        queryClient.setQueryData<Candidate>(["candidate", params.id], {
          ...previousCandidate,
          status: nextStatus,
        });
      }
      return { previousCandidate };
    },
    onSuccess: (result) => {
      queryClient.setQueryData<Candidate>(
        ["candidate", params.id],
        result.data as Candidate,
      );
      queryClient.invalidateQueries({ queryKey: ["candidates"] });
      toast.success("Candidate status updated");
    },
    onError: (error, _nextStatus, context) => {
      if (context?.previousCandidate) {
        queryClient.setQueryData<Candidate>(
          ["candidate", params.id],
          context.previousCandidate,
        );
      }
      setOptimisticStatus(null);
      toast.error(error.message);
    },
    onSettled: () => {
      setOptimisticStatus(null);
    },
  });

  const reviewMutation = useMutation({
    mutationFn: async (force: boolean) => {
      const res = await apiClient.v1.candidates[":id"].review.$post({
        param: { id: params.id },
        json: { force },
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as {
          error?: { message?: string };
        } | null;
        throw new Error(body?.error?.message ?? "Failed to queue review");
      }
      return res.json();
    },
    onSuccess: (result) => {
      toast.success(
        `Review queued for candidate (${result.data.applicationId})`,
      );
      queryClient.invalidateQueries({
        queryKey: ["candidate-evaluation", params.id],
      });
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const activeStatus = candidate
    ? (optimisticStatus ?? candidate.status)
    : "applied";
  const status = statusMeta[activeStatus];
  const selectedOrActiveStatus = selectedStage ?? activeStatus;
  const pipelineSteps = statusOrder.map((stage) => statusMeta[stage].label);
  const activeStepIndex = statusOrder.indexOf(activeStatus);
  const selectedStepIndex = selectedStage
    ? statusOrder.indexOf(selectedStage)
    : null;
  const activePipelineColors = pipelineColorMeta[activeStatus];
  const selectedPipelineColors = selectedStage
    ? pipelineColorMeta[selectedStage]
    : null;
  const strengths = parseStringArray(evaluation?.strengthsJson ?? null);
  const weaknesses = parseStringArray(evaluation?.weaknessesJson ?? null);
  const evaluationMeta = parseEvaluationBreakdown(
    evaluation?.aiResponseJson ?? null,
  );
  const isLoading = isCandidateLoading || isEvaluationLoading;

  useEffect(() => {
    if (candidate) {
      setOptimisticStatus(null);
      setSelectedStage(null);
    }
  }, [candidate?.status]);

  return (
    <div className="flex flex-1 flex-col gap-6 p-6 pt-14">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-3">
          <Button
            variant="ghost"
            size="sm"
            render={<Link href="/dashboard/candidates" />}
          >
            <RiArrowLeftLine className="size-4" />
            Back to Candidates
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              Candidate Profile
            </h1>
            <p className="text-sm text-muted-foreground">
              Detailed view of candidate profile and supporting links.
            </p>
          </div>
        </div>
      </div>

      {candidate ? (
        <div>
          <p className="mb-2 text-xs text-muted-foreground">Pipeline status</p>
          <div className="flex items-center justify-between">
            <div className="min-w-0 flex-1">
              <PipelineStepper
                steps={pipelineSteps}
                currentStep={activeStepIndex}
                selectedStep={selectedStepIndex}
                completedClassName={activePipelineColors.completedClassName}
                activeClassName={activePipelineColors.activeClassName}
                selectedClassName={selectedPipelineColors?.selectedClassName}
                onStepClick={(index) => {
                  const nextStage = statusOrder[index];
                  if (!nextStage) return;
                  if (statusMutation.isPending) return;
                  if (nextStage === activeStatus) {
                    setSelectedStage(null);
                    return;
                  }
                  setSelectedStage(nextStage);
                }}
              />
            </div>
            <Button
              type="button"
              className="cursor-pointer border border-blue-600 bg-transparent text-blue-600 hover:bg-blue-50 font-medium px-4 py-2 rounded-lg transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:border-slate-300"
              disabled={
                statusMutation.isPending ||
                selectedOrActiveStatus === activeStatus
              }
              onClick={() => {
                if (selectedOrActiveStatus === activeStatus) return;
                statusMutation.mutate(selectedOrActiveStatus);
              }}
            >
              {statusMutation.isPending
                ? "Updating..."
                : "Mark as Current Stage"}
            </Button>
          </div>
        </div>
      ) : null}

      {isLoading ? (
        <Card>
          <CardContent className="flex min-h-64 items-center justify-center py-16">
            <RiLoader4Line className="size-5 animate-spin text-muted-foreground" />
          </CardContent>
        </Card>
      ) : !candidate ? (
        <Card>
          <CardContent className="flex min-h-64 items-center justify-center py-16">
            <Empty>
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <RiBriefcaseLine />
                </EmptyMedia>
                <EmptyTitle>Candidate not found</EmptyTitle>
                <EmptyDescription>
                  This profile may have been removed or is not available for
                  your organization.
                </EmptyDescription>
              </EmptyHeader>
              <EmptyContent>
                <Button render={<Link href="/dashboard/candidates" />}>
                  Return to Candidates
                </Button>
              </EmptyContent>
            </Empty>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 lg:grid-cols-3">
          <Card className="border-2 border-slate-300/80 dark:border-slate-700/80 lg:col-span-2">
            <CardHeader>
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <Avatar size="lg">
                    <AvatarFallback>
                      {getInitials(candidate.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <CardTitle>{candidate.name}</CardTitle>
                    <CardDescription>{candidate.email}</CardDescription>
                  </div>
                </div>
                <Badge variant="outline" className={status.badgeClassName}>
                  {status.label}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-lg border-2 border-slate-300/80 p-3 dark:border-slate-700/80">
                  <p className="text-xs text-muted-foreground">Applied Role</p>
                  <p className="mt-1 inline-flex items-center gap-1 text-sm font-medium">
                    <RiBriefcaseLine className="size-3.5" />
                    {candidate.job.title}
                  </p>
                </div>
                <div className="rounded-lg border-2 border-slate-300/80 p-3 dark:border-slate-700/80">
                  <p className="text-xs text-muted-foreground">Applied On</p>
                  <p className="mt-1 inline-flex items-center gap-1 text-sm font-medium">
                    <RiTimeLine className="size-3.5" />
                    {new Date(candidate.createdAt).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </p>
                </div>
              </div>

              <div className="rounded-lg border-2 border-slate-300/80 p-4 dark:border-slate-700/80">
                <h2 className="mb-2 text-sm font-semibold">Cover Letter</h2>
                <p className="text-sm whitespace-pre-wrap text-muted-foreground">
                  {candidate.coverLetter &&
                  candidate.coverLetter.trim().length > 0
                    ? candidate.coverLetter
                    : "No cover letter submitted."}
                </p>
              </div>

              <div className="rounded-lg border-2 border-slate-300/80 p-4 dark:border-slate-700/80">
                <div className="mb-3 flex items-center justify-between gap-2">
                  <h2 className="inline-flex items-center gap-2 text-sm font-semibold">
                    <RiRobot2Line className="size-4 text-muted-foreground" />
                    AI Evaluation
                  </h2>
                  <div className="flex flex-wrap items-center gap-2">
                    {evaluationMeta.roleFamily ? (
                      <Badge variant="secondary">
                        {evaluationMeta.roleFamily.replaceAll("_", " ")}
                      </Badge>
                    ) : null}
                    {evaluation?.score !== null &&
                    evaluation?.score !== undefined ? (
                      <Badge variant="outline">
                        Score {evaluation.score}/100
                      </Badge>
                    ) : null}
                  </div>
                </div>

                {!evaluation ? (
                  <p className="text-sm text-muted-foreground">
                    No evaluation yet. Click{" "}
                    <span className="font-medium">Review now</span> to generate
                    one.
                  </p>
                ) : (
                  <div className="space-y-5">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <p className="text-xs text-muted-foreground">
                          Recommendation
                        </p>
                        <p className="text-sm font-medium">
                          {evaluation.recommendation ?? "-"}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">
                          Last Updated
                        </p>
                        <p className="text-sm font-medium">
                          {new Date(evaluation.updatedAt).toLocaleDateString(
                            "en-US",
                            {
                              year: "numeric",
                              month: "short",
                              day: "numeric",
                            },
                          )}
                        </p>
                      </div>
                    </div>

                    <div className="pt-1">
                      <p className="text-xs text-muted-foreground">Summary</p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {evaluation.summary ?? "-"}
                      </p>
                    </div>

                    {evaluationMeta.breakdown.length > 0 ? (
                      <div className="pt-1">
                        <div className="mb-2 flex items-center justify-between gap-2">
                          <p className="text-xs font-semibold text-foreground">
                            Score Breakdown
                          </p>
                          {evaluationMeta.rubricVersion ? (
                            <p className="text-xs text-muted-foreground">
                              {evaluationMeta.rubricVersion}
                            </p>
                          ) : null}
                        </div>
                        <div className="space-y-2">
                          {evaluationMeta.breakdown.map((item) => {
                            const percent = Math.max(
                              0,
                              Math.min(
                                100,
                                Math.round((item.score / item.max) * 100),
                              ),
                            );
                            return (
                              <div
                                key={`${item.key}-${item.label}`}
                                className="space-y-1"
                              >
                                <div className="flex items-center justify-between gap-2 text-xs">
                                  <p className="text-muted-foreground">
                                    {item.label}
                                  </p>
                                  <p className="font-medium">
                                    {item.score}/{item.max}
                                  </p>
                                </div>
                                <div className="bg-muted h-1.5 w-full overflow-hidden rounded-full">
                                  <div
                                    className="bg-foreground/70 h-full rounded-full"
                                    style={{ width: `${percent}%` }}
                                  />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ) : null}

                    <div className="grid gap-4 pt-1 sm:grid-cols-2">
                      <div>
                        <p className="text-xs font-semibold text-foreground">
                          Strengths
                        </p>
                        {strengths.length > 0 ? (
                          <ul className="mt-1 space-y-1 text-sm text-muted-foreground">
                            {strengths.slice(0, 5).map((item) => (
                              <li key={item}>- {item}</li>
                            ))}
                          </ul>
                        ) : (
                          <p className="mt-1 text-sm text-muted-foreground">
                            -
                          </p>
                        )}
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-foreground">
                          Weaknesses
                        </p>
                        {weaknesses.length > 0 ? (
                          <ul className="mt-1 space-y-1 text-sm text-muted-foreground">
                            {weaknesses.slice(0, 5).map((item) => (
                              <li key={item}>- {item}</li>
                            ))}
                          </ul>
                        ) : (
                          <p className="mt-1 text-sm text-muted-foreground">
                            -
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="border-2 border-slate-300/80 dark:border-slate-700/80">
            <CardHeader>
              <CardTitle>Candidate Actions</CardTitle>
              <CardDescription>
                Status, review actions, and profile links
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant="outline"
                  className="cursor-pointer"
                  disabled={reviewMutation.isPending}
                  onClick={() => reviewMutation.mutate(false)}
                >
                  {reviewMutation.isPending ? "Queueing..." : "Review now"}
                </Button>
                <Button
                  variant="ghost"
                  className="cursor-pointer"
                  disabled={reviewMutation.isPending}
                  onClick={() => reviewMutation.mutate(true)}
                >
                  Re-run review
                </Button>
              </div>

              <a
                href={`mailto:${candidate.email}`}
                className="hover:bg-muted flex items-center gap-2 rounded-lg border-2 border-slate-300/80 p-2.5 transition-colors dark:border-slate-700/80"
              >
                <RiMailLine className="size-4 text-muted-foreground" />
                <span className="text-sm">Email Candidate</span>
              </a>
              <a
                href={candidate.resumeUrl}
                target="_blank"
                rel="noreferrer"
                className="hover:bg-muted flex items-center gap-2 rounded-lg border-2 border-slate-300/80 p-2.5 transition-colors dark:border-slate-700/80"
              >
                <RiFileTextLine className="size-4 text-muted-foreground" />
                <span className="text-sm">Open Resume</span>
              </a>
              {candidate.linkedinUrl ? (
                <a
                  href={candidate.linkedinUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="hover:bg-muted flex items-center gap-2 rounded-lg border-2 border-slate-300/80 p-2.5 transition-colors dark:border-slate-700/80"
                >
                  <RiLinkedinBoxLine className="size-4 text-muted-foreground" />
                  <span className="text-sm">LinkedIn</span>
                </a>
              ) : null}
              {candidate.githubUrl ? (
                <a
                  href={candidate.githubUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="hover:bg-muted flex items-center gap-2 rounded-lg border-2 border-slate-300/80 p-2.5 transition-colors dark:border-slate-700/80"
                >
                  <RiGithubLine className="size-4 text-muted-foreground" />
                  <span className="text-sm">GitHub</span>
                </a>
              ) : null}
              {candidate.portfolioUrl ? (
                <a
                  href={candidate.portfolioUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="hover:bg-muted flex items-center gap-2 rounded-lg border-2 border-slate-300/80 p-2.5 transition-colors dark:border-slate-700/80"
                >
                  <RiExternalLinkLine className="size-4 text-muted-foreground" />
                  <span className="text-sm">Portfolio</span>
                </a>
              ) : null}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
