"use client";

import {
  RiArrowRightLine,
  RiExternalLinkLine,
  RiFileTextLine,
  RiGithubLine,
  RiGroupLine,
  RiLinkedinBoxLine,
  RiLoader4Line,
  RiRobot2Line,
} from "@remixicon/react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { apiClient } from "@/lib/api/client";

type CandidateStatus = "applied" | "screening" | "interview" | "offer" | "hired" | "rejected";
type CandidateSource = "all" | "github" | "portfolio" | "resume";

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
  matchScore: number | null;
  skillsJson: string | null;
  evaluationSummary: string | null;
  recommendation: string | null;
  createdAt: string;
  job: {
    id: string;
    title: string;
  };
};

type Job = {
  id: string;
  title: string;
};

const PAGE_SIZE = 25;

const statusOptions: Array<{ value: CandidateStatus; label: string }> = [
  { value: "applied", label: "Applied" },
  { value: "screening", label: "Screening" },
  { value: "interview", label: "Interview" },
  { value: "offer", label: "Offer" },
  { value: "hired", label: "Hired" },
  { value: "rejected", label: "Rejected" },
];

const parseSkills = (raw: string | null) => {
  if (!raw) return [] as string[];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [] as string[];
    return parsed.filter((item): item is string => typeof item === "string").slice(0, 4);
  } catch {
    return [] as string[];
  }
};

const sourceLabelMap: Record<CandidateSource, string> = {
  all: "All sources",
  github: "GitHub",
  portfolio: "Portfolio",
  resume: "Resume",
};

export default function CandidatesPage() {
  const queryClient = useQueryClient();

  const [jobId, setJobId] = useState("all");
  const [status, setStatus] = useState<"all" | CandidateStatus>("all");
  const [search, setSearch] = useState("");
  const [skills, setSkills] = useState("");
  const [source, setSource] = useState<CandidateSource>("all");
  const [minScore, setMinScore] = useState("");
  const [maxScore, setMaxScore] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [semanticQuery, setSemanticQuery] = useState("");
  const [semanticResults, setSemanticResults] = useState<Candidate[] | null>(null);
  const [offset, setOffset] = useState(0);

  const { data: jobs = [] } = useQuery({
    queryKey: ["jobs", "candidate-filter"],
    queryFn: async () => {
      const res = await apiClient.v1.jobs.$get();
      if (!res.ok) throw new Error("Failed to load jobs");
      const json = await res.json();
      return (json.data ?? []) as Job[];
    },
  });

  const query = useMemo(
    () => ({
      limit: String(PAGE_SIZE),
      offset: String(offset),
      ...(jobId !== "all" ? { jobId } : {}),
      ...(status !== "all" ? { status } : {}),
      ...(search.trim() ? { q: search.trim() } : {}),
      ...(skills.trim() ? { skills: skills.trim() } : {}),
      ...(source !== "all" ? { source } : {}),
      ...(minScore.trim() ? { minScore: Number(minScore.trim()) } : {}),
      ...(maxScore.trim() ? { maxScore: Number(maxScore.trim()) } : {}),
      ...(dateFrom ? { dateFrom } : {}),
      ...(dateTo ? { dateTo } : {}),
    }),
    [dateFrom, dateTo, jobId, maxScore, minScore, offset, search, skills, source, status],
  );

  const { data, isLoading } = useQuery({
    queryKey: ["candidates", query],
    queryFn: async () => {
      const res = await apiClient.v1.candidates.$get({ query });
      if (!res.ok) throw new Error("Failed to load candidates");
      const json = await res.json();
      return {
        candidates: (json.data ?? []) as Candidate[],
        pagination: json.pagination as {
          limit: number;
          offset: number;
          total: number;
          hasMore: boolean;
        },
      };
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, nextStatus }: { id: string; nextStatus: CandidateStatus }) => {
      const res = await apiClient.v1.candidates[":id"].status.$patch({
        param: { id },
        json: { status: nextStatus },
      });
      if (!res.ok) throw new Error("Failed to update candidate status");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["candidates"] });
      toast.success("Candidate status updated");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const bulkReviewMutation = useMutation({
    mutationFn: async () => {
      const res = await apiClient.v1.candidates["review-bulk"].$post({
        json: {
          ...(jobId !== "all" ? { jobId } : {}),
          ...(status !== "all" ? { status } : {}),
          limit: 100,
          offset: 0,
          force: false,
        },
      });
      if (!res.ok) throw new Error("Failed to queue bulk review");
      return res.json();
    },
    onSuccess: (result) => {
      toast.success(`Queued ${result.data.queued} candidates for review`);
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const semanticMutation = useMutation({
    mutationFn: async () => {
      const res = await apiClient.v1.candidates["semantic-search"].$post({
        json: {
          query: semanticQuery,
          ...(jobId !== "all" ? { jobId } : {}),
          ...(status !== "all" ? { status } : {}),
          ...(minScore.trim() ? { minScore: Number(minScore) } : {}),
          ...(maxScore.trim() ? { maxScore: Number(maxScore) } : {}),
          limit: 20,
        },
      });
      if (!res.ok) throw new Error("Semantic search failed");
      const json = await res.json();
      return (json.data ?? []) as Candidate[];
    },
    onSuccess: (items) => {
      setSemanticResults(items);
      toast.success(`Found ${items.length} semantic matches`);
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const candidates = semanticResults ?? data?.candidates ?? [];
  const pagination = data?.pagination;
  const total = pagination?.total ?? 0;

  return (
    <div className="flex flex-1 flex-col gap-6 p-6 pt-14">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Candidates</h1>
          <p className="text-sm text-muted-foreground">
            Search and filter by skills, score, source, application date, and semantic intent.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" className="cursor-pointer" onClick={() => bulkReviewMutation.mutate()} disabled={bulkReviewMutation.isPending}>
            {bulkReviewMutation.isPending ? "Queueing..." : "Bulk Review"}
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="space-y-2.5 py-3 sm:space-y-3 sm:py-4">
          <div className="grid gap-2.5 sm:gap-3 md:grid-cols-2 xl:grid-cols-4">
          <Input
            placeholder="Search name, email, resume text"
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setOffset(0);
              setSemanticResults(null);
            }}
          />
          <Input
            placeholder="Skills (e.g. React, Node.js)"
            value={skills}
            onChange={(event) => {
              setSkills(event.target.value);
              setOffset(0);
              setSemanticResults(null);
            }}
          />
          <Input
            placeholder="Semantic query"
            value={semanticQuery}
            onChange={(event) => setSemanticQuery(event.target.value)}
          />
          <div className="flex gap-2">
            <Button
              className="w-full cursor-pointer"
              variant="outline"
              disabled={!semanticQuery.trim() || semanticMutation.isPending}
              onClick={() => semanticMutation.mutate()}
            >
              <RiRobot2Line className="size-4" />
              Semantic Search
            </Button>
            {semanticResults ? (
              <Button className="cursor-pointer" variant="ghost" onClick={() => setSemanticResults(null)}>
                Clear
              </Button>
            ) : null}
          </div>
          </div>

          <div className="grid gap-2.5 sm:gap-3 md:grid-cols-2 xl:grid-cols-4">
          <Select
            value={jobId}
            onValueChange={(value) => {
              setJobId(value ?? "all");
              setOffset(0);
              setSemanticResults(null);
            }}
          >
            <SelectTrigger className="w-full">
              <span className="truncate text-sm">
                {jobId === "all" ? "All jobs" : jobs.find((job) => job.id === jobId)?.title ?? "All jobs"}
              </span>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All jobs</SelectItem>
              {jobs.map((job) => (
                <SelectItem key={job.id} value={job.id}>
                  {job.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={status}
            onValueChange={(value) => {
              setStatus((value as CandidateStatus | null) ?? "all");
              setOffset(0);
              setSemanticResults(null);
            }}
          >
            <SelectTrigger className="w-full">
              <span className="truncate text-sm">
                {status === "all"
                  ? "All statuses"
                  : statusOptions.find((option) => option.value === status)?.label ?? "All statuses"}
              </span>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              {statusOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={source}
            onValueChange={(value) => {
              setSource((value as CandidateSource | null) ?? "all");
              setOffset(0);
              setSemanticResults(null);
            }}
          >
            <SelectTrigger className="w-full">
              <span className="truncate text-sm">{sourceLabelMap[source]}</span>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All sources</SelectItem>
              <SelectItem value="github">GitHub</SelectItem>
              <SelectItem value="portfolio">Portfolio</SelectItem>
              <SelectItem value="resume">Resume</SelectItem>
            </SelectContent>
          </Select>

          <div className="grid grid-cols-2 gap-2">
            <Input
              placeholder="Min score"
              type="number"
              min={0}
              max={100}
              value={minScore}
              onChange={(event) => {
                setMinScore(event.target.value);
                setOffset(0);
                setSemanticResults(null);
              }}
            />
            <Input
              placeholder="Max score"
              type="number"
              min={0}
              max={100}
              value={maxScore}
              onChange={(event) => {
                setMaxScore(event.target.value);
                setOffset(0);
                setSemanticResults(null);
              }}
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <Input
              type="date"
              value={dateFrom}
              onChange={(event) => {
                setDateFrom(event.target.value);
                setOffset(0);
                setSemanticResults(null);
              }}
            />
            <Input
              type="date"
              value={dateTo}
              onChange={(event) => {
                setDateTo(event.target.value);
                setOffset(0);
                setSemanticResults(null);
              }}
            />
          </div>

          <div className="text-muted-foreground flex items-center text-xs sm:text-sm">
            {isLoading ? "Loading candidates..." : semanticResults ? `${semanticResults.length} semantic matches` : `${total} total candidates`}
          </div>
          </div>
        </CardContent>
      </Card>

      <Card className="flex-1">
        {isLoading ? (
          <CardContent className="flex min-h-64 items-center justify-center py-16">
            <RiLoader4Line className="size-5 animate-spin text-muted-foreground" />
          </CardContent>
        ) : candidates.length === 0 ? (
          <CardContent className="flex flex-1 items-center justify-center py-16">
            <Empty>
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <RiGroupLine />
                </EmptyMedia>
                <EmptyTitle>No candidates found</EmptyTitle>
                <EmptyDescription>
                  Try changing filters or use semantic search with a broader query.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          </CardContent>
        ) : (
          <CardContent className="py-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Candidate</TableHead>
                  <TableHead>Job</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Score</TableHead>
                  <TableHead>Skills</TableHead>
                  <TableHead>Applied</TableHead>
                  <TableHead>Links</TableHead>
                  <TableHead>Resume</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {candidates.map((candidate) => (
                  <TableRow key={candidate.id}>
                    <TableCell>
                      <div className="flex flex-col">
                        <Link
                          href={`/dashboard/candidates/${candidate.id}`}
                          className="inline-flex items-center gap-1 font-medium hover:underline"
                        >
                          {candidate.name}
                          <RiArrowRightLine className="size-3.5 text-muted-foreground" />
                        </Link>
                        <span className="text-xs text-muted-foreground">{candidate.email}</span>
                      </div>
                    </TableCell>
                    <TableCell>{candidate.job.title}</TableCell>
                    <TableCell>
                      <Select
                        value={candidate.status}
                        onValueChange={(value) =>
                          updateStatusMutation.mutate({
                            id: candidate.id,
                            nextStatus: value as CandidateStatus,
                          })
                        }
                      >
                        <SelectTrigger className="w-36">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {statusOptions.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>{candidate.matchScore ?? "-"}</TableCell>
                    <TableCell>
                      <div className="max-w-48 truncate text-xs text-muted-foreground">
                        {parseSkills(candidate.skillsJson).join(", ") || "-"}
                      </div>
                    </TableCell>
                    <TableCell>
                      {new Date(candidate.createdAt).toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })}
                    </TableCell>
                    <TableCell>
                      <TooltipProvider>
                        <div className="flex items-center gap-2">
                          {candidate.linkedinUrl ? (
                            <Tooltip>
                              <TooltipTrigger
                                render={
                                  <a
                                    href={candidate.linkedinUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="text-muted-foreground hover:text-foreground"
                                  />
                                }
                              >
                                <RiLinkedinBoxLine className="size-4" />
                              </TooltipTrigger>
                              <TooltipContent>LinkedIn</TooltipContent>
                            </Tooltip>
                          ) : null}
                          {candidate.githubUrl ? (
                            <Tooltip>
                              <TooltipTrigger
                                render={
                                  <a
                                    href={candidate.githubUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="text-muted-foreground hover:text-foreground"
                                  />
                                }
                              >
                                <RiGithubLine className="size-4" />
                              </TooltipTrigger>
                              <TooltipContent>GitHub</TooltipContent>
                            </Tooltip>
                          ) : null}
                          {candidate.portfolioUrl ? (
                            <Tooltip>
                              <TooltipTrigger
                                render={
                                  <a
                                    href={candidate.portfolioUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="text-muted-foreground hover:text-foreground"
                                  />
                                }
                              >
                                <RiExternalLinkLine className="size-4" />
                              </TooltipTrigger>
                              <TooltipContent>Portfolio</TooltipContent>
                            </Tooltip>
                          ) : null}
                          {!candidate.linkedinUrl && !candidate.githubUrl && !candidate.portfolioUrl ? (
                            <span className="text-xs text-muted-foreground">-</span>
                          ) : null}
                        </div>
                      </TooltipProvider>
                    </TableCell>
                    <TableCell>
                      <a
                        href={candidate.resumeUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-accent hover:underline"
                      >
                        <RiFileTextLine className="size-4" />
                        Open
                      </a>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {!semanticResults ? (
              <div className="mt-4 flex items-center justify-between gap-3">
                <div className="text-muted-foreground text-sm">
                  Showing {pagination ? pagination.offset + 1 : 0} to {pagination ? pagination.offset + candidates.length : 0} of {total}
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    disabled={offset === 0}
                    onClick={() => setOffset((current) => Math.max(0, current - PAGE_SIZE))}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    disabled={!pagination?.hasMore}
                    onClick={() => setOffset((current) => current + PAGE_SIZE)}
                  >
                    Next
                  </Button>
                </div>
              </div>
            ) : null}
          </CardContent>
        )}
      </Card>
    </div>
  );
}
