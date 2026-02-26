"use client"

import { useQuery } from "@tanstack/react-query"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { apiClient } from "@/lib/api/client"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { RiMailSendLine, RiDownloadLine, RiRefreshLine } from "@remixicon/react"

type WaitlistEntry = {
  id: string
  email: string
  status: string
  createdAt: string | null
}

export default function AdminWaitlistPage() {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["admin-waitlist"],
    queryFn: async () => {
      const response = await apiClient.v1.admin.waitlist.$get({
        query: { limit: "100", offset: "0" },
      })
      if (!response.ok) throw new Error("Failed to load waitlist")
      const json = await response.json()
      return {
        rows: (json.data ?? []) as WaitlistEntry[],
        total: json.pagination?.total ?? 0,
      }
    },
  })

  if (isLoading) return <Skeleton className="h-64 w-full" />

  if (isError || !data) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Waitlist unavailable</CardTitle>
          <CardDescription>Unable to load waitlist data.</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  const getStatusVariant = (status: string) => {
    switch (status.toLowerCase()) {
      case "pending": return "secondary"
      case "invited": return "default"
      case "joined": return "outline"
      default: return "outline"
    }
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold tracking-tight">Waitlist Management</h2>
          <p className="text-sm text-muted-foreground">{data.total} users waiting for platform access.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => refetch()} className="h-8 gap-2 text-xs font-semibold">
            <RiRefreshLine className="size-3.5" />
            Refresh
          </Button>
          <Button variant="outline" size="sm" className="h-8 gap-2 text-xs font-semibold">
            <RiDownloadLine className="size-3.5" />
            Export CSV
          </Button>
          <Button size="sm" className="h-8 gap-2 text-xs font-semibold shadow-sm">
            <RiMailSendLine className="size-3.5" />
            Bulk Invite
          </Button>
        </div>
      </div>

      <Card className="border-none shadow-none bg-transparent">
        <CardContent className="px-0">
          <div className="rounded-md border bg-card/50 backdrop-blur-sm shadow-sm overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30">
                  <TableHead className="font-semibold text-xs uppercase tracking-wider">Email Address</TableHead>
                  <TableHead className="font-semibold text-xs uppercase tracking-wider">Status</TableHead>
                  <TableHead className="font-semibold text-xs uppercase tracking-wider">Internal ID</TableHead>
                  <TableHead className="text-right font-semibold text-xs uppercase tracking-wider">Joined At</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                      No waitlist entries found.
                    </TableCell>
                  </TableRow>
                ) : (
                  data.rows.map((entry) => (
                    <TableRow key={entry.id} className="hover:bg-muted/20 transition-colors">
                      <TableCell className="font-medium text-sm">{entry.email}</TableCell>
                      <TableCell>
                        <Badge variant={getStatusVariant(entry.status)} className="capitalize px-2 py-0.5 text-[10px] font-bold tracking-wider">
                          {entry.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono text-[10px] text-muted-foreground">{entry.id}</TableCell>
                      <TableCell className="text-right text-[10px] font-mono text-muted-foreground">
                        {entry.createdAt
                          ? new Date(entry.createdAt).toLocaleDateString("en-US", {
                              year: "numeric",
                              month: "short",
                              day: "numeric",
                            })
                          : "-"}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

