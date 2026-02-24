"use client"

import { useQuery } from "@tanstack/react-query"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { apiClient } from "@/lib/api/client"

type QueueData = {
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
}

export default function AdminQueuePage() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["admin-queue"],
    queryFn: async () => {
      const response = await apiClient.v1.admin.queue.$get()
      if (!response.ok) throw new Error("Failed to load queue")
      const json = await response.json()
      return json.data as QueueData
    },
    refetchInterval: 10_000,
  })

  if (isLoading) return <Skeleton className="h-64 w-full" />

  if (isError || !data) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Queue unavailable</CardTitle>
          <CardDescription>Unable to load queue metrics.</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Queue Monitoring</CardTitle>
        <CardDescription>{data.connected ? "Queue connected" : "Queue disconnected"}</CardDescription>
      </CardHeader>
      <CardContent className="grid grid-cols-2 gap-4 text-sm md:grid-cols-3">
        <div><span className="text-muted-foreground">Waiting</span><p className="text-lg font-semibold">{data.counts.waiting}</p></div>
        <div><span className="text-muted-foreground">Active</span><p className="text-lg font-semibold">{data.counts.active}</p></div>
        <div><span className="text-muted-foreground">Completed</span><p className="text-lg font-semibold">{data.counts.completed}</p></div>
        <div><span className="text-muted-foreground">Failed</span><p className="text-lg font-semibold">{data.counts.failed}</p></div>
        <div><span className="text-muted-foreground">Delayed</span><p className="text-lg font-semibold">{data.counts.delayed}</p></div>
        <div><span className="text-muted-foreground">Paused</span><p className="text-lg font-semibold">{data.counts.paused}</p></div>
        <div className="col-span-2 text-muted-foreground md:col-span-3">
          Oldest waiting job age: {data.oldestWaitingAgeSeconds === null ? "-" : `${data.oldestWaitingAgeSeconds}s`}
        </div>
      </CardContent>
    </Card>
  )
}

