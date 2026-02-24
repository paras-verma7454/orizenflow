"use client"

import { useQuery } from "@tanstack/react-query"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { apiClient } from "@/lib/api/client"

type HealthData = {
  status: "ok" | "degraded"
  environment: string
  version: string
  checks: {
    db: "ok" | "down"
    redis: "ok" | "down" | "not_configured"
    queue: "ok" | "down" | "not_configured"
  }
}

export default function AdminHealthPage() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["admin-health"],
    queryFn: async () => {
      const response = await apiClient.v1.admin.health.$get()
      if (!response.ok) throw new Error("Failed to load health")
      const json = await response.json()
      return json.data as HealthData
    },
    refetchInterval: 15_000,
  })

  if (isLoading) return <Skeleton className="h-56 w-full" />

  if (isError || !data) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Health unavailable</CardTitle>
          <CardDescription>Unable to load system health.</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>System Health</CardTitle>
        <CardDescription>
          Status: <span className="font-medium capitalize">{data.status}</span>
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        <p><span className="text-muted-foreground">Environment:</span> {data.environment}</p>
        <p><span className="text-muted-foreground">Version:</span> {data.version}</p>
        <p><span className="text-muted-foreground">Database:</span> {data.checks.db}</p>
        <p><span className="text-muted-foreground">Redis:</span> {data.checks.redis}</p>
        <p><span className="text-muted-foreground">Queue:</span> {data.checks.queue}</p>
      </CardContent>
    </Card>
  )
}

