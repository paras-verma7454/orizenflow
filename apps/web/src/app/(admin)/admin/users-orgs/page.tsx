"use client"

import { useQuery } from "@tanstack/react-query"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { apiClient } from "@/lib/api/client"

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
  const { data, isLoading, isError } = useQuery({
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
    <Card>
      <CardHeader>
        <CardTitle>Users & Organizations</CardTitle>
        <CardDescription>{data.total} memberships</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Organization</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Created</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-muted-foreground">
                  No memberships found.
                </TableCell>
              </TableRow>
            ) : (
              data.rows.map((item) => (
                <TableRow key={item.membershipId}>
                  <TableCell>{item.user.name}</TableCell>
                  <TableCell>{item.user.email}</TableCell>
                  <TableCell>{item.organization.name}</TableCell>
                  <TableCell className="capitalize">{item.role}</TableCell>
                  <TableCell>
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
      </CardContent>
    </Card>
  )
}

