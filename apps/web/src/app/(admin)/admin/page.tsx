"use client"

import { useQuery } from "@tanstack/react-query"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { apiClient } from "@/lib/api/client"

type OverviewResponse = {
  totals: {
    users: number
    organizations: number
    jobs: number
    applications: number
    evaluations: number
  }
  jobsByStatus: Array<{ status: string; count: number }>
  applicationsByStatus: Array<{ status: string; count: number }>
  evaluations: {
    averageScore: number | null
    completedLast24Hours: number
  }
  queue: {
    connected: boolean
    counts: {
      waiting: number
      active: number
      completed: number
      failed: number
      delayed: number
      paused: number
    }
    oldestWaitingAgeSeconds: number | null
    queuedLast24HoursProxy: number
  }
}

export default function AdminOverviewPage() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["admin-overview"],
    queryFn: async () => {
      const response = await apiClient.v1.admin.overview.$get()
      if (!response.ok) {
        throw new Error("Failed to load admin overview")
      }
      const json = await response.json()
      return json.data as OverviewResponse
    },
  })

  if (isLoading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, index) => (
          <Skeleton key={index} className="h-28 w-full" />
        ))}
      </div>
    )
  }

  if (isError || !data) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Overview unavailable</CardTitle>
          <CardDescription>Unable to load platform metrics right now.</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Platform Totals</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-3 text-sm">
          <div><span className="text-muted-foreground">Users</span><p className="text-xl font-semibold">{data.totals.users}</p></div>
          <div><span className="text-muted-foreground">Orgs</span><p className="text-xl font-semibold">{data.totals.organizations}</p></div>
          <div><span className="text-muted-foreground">Jobs</span><p className="text-xl font-semibold">{data.totals.jobs}</p></div>
          <div><span className="text-muted-foreground">Applications</span><p className="text-xl font-semibold">{data.totals.applications}</p></div>
          <div><span className="text-muted-foreground">Evaluations</span><p className="text-xl font-semibold">{data.totals.evaluations}</p></div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Evaluation Throughput</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p>
            <span className="text-muted-foreground">Average score:</span>{" "}
            <span className="font-medium">{data.evaluations.averageScore ?? "-"}</span>
          </p>
          <p>
            <span className="text-muted-foreground">Completed in 24h:</span>{" "}
            <span className="font-medium">{data.evaluations.completedLast24Hours}</span>
          </p>
          <p>
            <span className="text-muted-foreground">Queued proxy in 24h:</span>{" "}
            <span className="font-medium">{data.queue.queuedLast24HoursProxy}</span>
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Jobs by Status</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {data.jobsByStatus.length === 0 ? (
            <p className="text-muted-foreground">No jobs yet.</p>
          ) : (
            data.jobsByStatus.map((item) => (
              <div key={item.status} className="flex items-center justify-between">
                <span className="capitalize text-muted-foreground">{item.status}</span>
                <span className="font-medium">{item.count}</span>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Applications by Status</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {data.applicationsByStatus.length === 0 ? (
            <p className="text-muted-foreground">No applications yet.</p>
          ) : (
            data.applicationsByStatus.map((item) => (
              <div key={item.status} className="flex items-center justify-between">
                <span className="capitalize text-muted-foreground">{item.status}</span>
                <span className="font-medium">{item.count}</span>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card className="md:col-span-2">
        <CardHeader>
          <CardTitle>Queue Snapshot</CardTitle>
          <CardDescription>{data.queue.connected ? "Connected" : "Disconnected"}</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-3 text-sm md:grid-cols-3">
          <div><span className="text-muted-foreground">Waiting</span><p className="font-medium">{data.queue.counts.waiting}</p></div>
          <div><span className="text-muted-foreground">Active</span><p className="font-medium">{data.queue.counts.active}</p></div>
          <div><span className="text-muted-foreground">Completed</span><p className="font-medium">{data.queue.counts.completed}</p></div>
          <div><span className="text-muted-foreground">Failed</span><p className="font-medium">{data.queue.counts.failed}</p></div>
          <div><span className="text-muted-foreground">Delayed</span><p className="font-medium">{data.queue.counts.delayed}</p></div>
          <div><span className="text-muted-foreground">Paused</span><p className="font-medium">{data.queue.counts.paused}</p></div>
          <div className="col-span-2 md:col-span-3">
            <span className="text-muted-foreground">Oldest waiting age:</span>{" "}
            <span className="font-medium">
              {data.queue.oldestWaitingAgeSeconds === null ? "-" : `${data.queue.oldestWaitingAgeSeconds}s`}
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

