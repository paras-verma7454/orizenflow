"use client"

import Link from "next/link"
import { useQuery } from "@tanstack/react-query"
import { useParams } from "next/navigation"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { apiClient } from "@/lib/api/client"

type CandidateDebug = {
  application: {
    id: string
    name: string
    email: string
    status: string
    createdAt: string
    resumeUrl: string
    job: {
      id: string
      title: string
    }
    organization: {
      id: string
      name: string
      slug: string
    }
  }
  evaluation: {
    id: string
    model: string
    score: number | null
    summary: string | null
    recommendation: string | null
    resumeTextExcerpt: string | null
    evidenceJson: string | null
    aiResponseJson: string | null
    createdAt: string
    updatedAt: string
  } | null
}

export default function AdminCandidateDebugPage() {
  const params = useParams<{ id: string }>()
  const id = params.id

  const { data, isLoading, isError } = useQuery({
    queryKey: ["admin-candidate-debug", id],
    queryFn: async () => {
      const response = await apiClient.v1.admin.candidates[":id"].debug.$get({
        param: { id },
      })

      if (!response.ok) {
        if (response.status === 404) return null
        throw new Error("Failed to load candidate debug data")
      }

      const json = await response.json()
      return json.data as CandidateDebug
    },
  })

  if (isLoading) return <Skeleton className="h-96 w-full" />

  if (isError) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Debug view unavailable</CardTitle>
          <CardDescription>Unable to load candidate debug payload.</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  if (!data) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Candidate not found</CardTitle>
          <CardDescription>No candidate application exists for this ID.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="outline" render={<Link href="/admin/candidates" />}>
            Back to Candidate Debug
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>{data.application.name}</CardTitle>
          <CardDescription>{data.application.email}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-1 text-sm">
          <p><span className="text-muted-foreground">Application ID:</span> {data.application.id}</p>
          <p><span className="text-muted-foreground">Status:</span> {data.application.status}</p>
          <p><span className="text-muted-foreground">Job:</span> {data.application.job.title}</p>
          <p><span className="text-muted-foreground">Organization:</span> {data.application.organization.name}</p>
          <p>
            <span className="text-muted-foreground">Resume:</span>{" "}
            <a href={data.application.resumeUrl} target="_blank" rel="noreferrer" className="text-primary underline">
              Open resume
            </a>
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Evaluation</CardTitle>
          <CardDescription>{data.evaluation ? "Latest AI output" : "No evaluation found"}</CardDescription>
        </CardHeader>
        {data.evaluation && (
          <CardContent className="space-y-3 text-sm">
            <p><span className="text-muted-foreground">Model:</span> {data.evaluation.model}</p>
            <p><span className="text-muted-foreground">Score:</span> {data.evaluation.score ?? "-"}</p>
            <p><span className="text-muted-foreground">Recommendation:</span> {data.evaluation.recommendation ?? "-"}</p>
            <p><span className="text-muted-foreground">Summary:</span> {data.evaluation.summary ?? "-"}</p>

            <div className="space-y-2">
              <h3 className="font-medium">Resume Excerpt</h3>
              <pre className="max-h-56 overflow-auto rounded-md border bg-muted/30 p-3 whitespace-pre-wrap">
                {data.evaluation.resumeTextExcerpt ?? "N/A"}
              </pre>
            </div>

            <div className="space-y-2">
              <h3 className="font-medium">Evidence JSON</h3>
              <pre className="max-h-80 overflow-auto rounded-md border bg-muted/30 p-3">
                {data.evaluation.evidenceJson ?? "N/A"}
              </pre>
            </div>

            <div className="space-y-2">
              <h3 className="font-medium">AI Response JSON</h3>
              <pre className="max-h-80 overflow-auto rounded-md border bg-muted/30 p-3">
                {data.evaluation.aiResponseJson ?? "N/A"}
              </pre>
            </div>
          </CardContent>
        )}
      </Card>
    </div>
  )
}
