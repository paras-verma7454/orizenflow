"use client"

import { useQuery } from "@tanstack/react-query"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { apiClient } from "@/lib/api/client"
import { Button } from "@/components/ui/button"
import { RiFilter2Line, RiRefreshLine } from "@remixicon/react"

type Membership = {
  membershipId: string
  role: string
  createdAt: string | null
  user: {
    id: string
    name: string
    email: string
    image: string | null
  }
  organization: {
    id: string
    name: string
    slug: string
  }
}

export default function AdminUsersOrgsPage() {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["admin-users-orgs"],
    queryFn: async () => {
      const response = await apiClient.v1.admin["users-orgs"].$get({
        query: { limit: "100", offset: "0" },
      })
      if (!response.ok) throw new Error("Failed to load users and organizations")
      const json = await response.json()
      return {
        rows: (json.data ?? []) as Membership[],
        total: json.pagination?.total ?? 0,
      }
    },
  })

  if (isLoading) return <Skeleton className="h-64 w-full" />

  if (isError || !data) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Users & Organizations unavailable</CardTitle>
          <CardDescription>Unable to load membership data.</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold tracking-tight">User Memberships</h2>
          <p className="text-sm text-muted-foreground">{data.total} total memberships found.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => refetch()} className="h-8 gap-2 text-xs font-semibold">
            <RiRefreshLine className="size-3.5" />
            Refresh
          </Button>
          <Button variant="outline" size="sm" className="h-8 gap-2 text-xs font-semibold">
            <RiFilter2Line className="size-3.5" />
            Filter
          </Button>
        </div>
      </div>
      <Card className="border-none shadow-none bg-transparent">
        <CardContent className="px-0">
          <div className="rounded-md border bg-card/50 backdrop-blur-sm shadow-sm overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30">
                  <TableHead className="font-semibold text-xs uppercase tracking-wider">User</TableHead>
                  <TableHead className="font-semibold text-xs uppercase tracking-wider">Email</TableHead>
                  <TableHead className="font-semibold text-xs uppercase tracking-wider">Organization</TableHead>
                  <TableHead className="font-semibold text-xs uppercase tracking-wider">Role</TableHead>
                  <TableHead className="font-semibold text-xs uppercase tracking-wider">Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                      No memberships found.
                    </TableCell>
                  </TableRow>
                ) : (
                  data.rows.map((item) => (
                    <TableRow key={item.membershipId} className="hover:bg-muted/20 transition-colors">
                      <TableCell className="font-medium">{item.user.name}</TableCell>
                      <TableCell>{item.user.email}</TableCell>
                      <TableCell>{item.organization.name}</TableCell>
                      <TableCell className="capitalize">{item.role}</TableCell>
                      <TableCell className="text-muted-foreground text-xs">
                        {item.createdAt
                          ? new Date(item.createdAt).toLocaleDateString("en-US", {
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


