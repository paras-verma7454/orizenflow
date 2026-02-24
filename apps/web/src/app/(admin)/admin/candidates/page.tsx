"use client"

import Link from "next/link"
import { useState } from "react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"

export default function AdminCandidatesPage() {
  const [candidateId, setCandidateId] = useState("")

  const href = candidateId.trim() ? `/admin/candidates/${candidateId.trim()}` : ""

  return (
    <Card>
      <CardHeader>
        <CardTitle>Candidate Debug View</CardTitle>
        <CardDescription>Open raw AI payloads for a candidate application ID.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <Input
          placeholder="Enter candidate application ID"
          value={candidateId}
          onChange={(event) => setCandidateId(event.target.value)}
        />
        <Button disabled={!href} render={<Link href={href || "/admin/candidates"} />}>
          Open Debug Page
        </Button>
      </CardContent>
    </Card>
  )
}

