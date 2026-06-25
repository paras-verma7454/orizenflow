"use client"

import { RiBuildingLine, RiGlobalLine, RiLinkedinBoxLine, RiLoader4Line, RiSaveLine, RiUserLine } from "@remixicon/react"
import { useForm } from "@tanstack/react-form"
import { useMutation, useQuery } from "@tanstack/react-query"
import { useEffect } from "react"
import { toast } from "sonner"
import { z } from "zod"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { apiClient } from "@/lib/api/client"

const profileSchema = z
  .object({
    name: z.string().min(1, "Organization name is required").max(120),
    websiteUrl: z.string(),
    linkedinUrl: z.string(),
    tagline: z.string().max(180),
    about: z.string().max(2000),
  })
  .superRefine((value, ctx) => {
    const website = value.websiteUrl.trim()
    const linkedin = value.linkedinUrl.trim()

    if (!website && !linkedin) {
      ctx.addIssue({ code: "custom", message: "Provide website URL or LinkedIn URL", path: ["websiteUrl"] })
    }

    if (website && !z.url().safeParse(website).success) {
      ctx.addIssue({ code: "custom", message: "Enter a valid website URL", path: ["websiteUrl"] })
    }

    if (linkedin && !z.url().safeParse(linkedin).success) {
      ctx.addIssue({ code: "custom", message: "Enter a valid LinkedIn URL", path: ["linkedinUrl"] })
    }
  })

const userNameSchema = z.object({
  name: z.string().min(1, "Name is required").max(120),
})

type ProfileData = {
  id: string
  slug: string
  name: string
  websiteUrl: string | null
  linkedinUrl: string | null
  tagline: string | null
  about: string | null
}

type UserData = {
  id: string
  name: string
  email: string
  image: string | null
}

export default function AccountPage() {
  const userQuery = useQuery({
    queryKey: ["current-user"],
    queryFn: async () => {
      const res = await apiClient.v1.user.$get()
      if (!res.ok) throw new Error("Failed to load user profile")
      const json = (await res.json()) as { data: UserData }
      return json.data
    },
  })

  const profileQuery = useQuery({
    queryKey: ["organization-profile"],
    queryFn: async () => {
      const res = await apiClient.v1.organization.profile.$get()
      if (!res.ok) throw new Error("Failed to load profile")
      const json = (await res.json()) as { data: ProfileData }
      return json.data
    },
  })

  const updateMutation = useMutation({
    mutationFn: async (value: z.infer<typeof profileSchema>) => {
      const res = await apiClient.v1.organization.profile.$put({
        json: {
          name: value.name.trim(),
          websiteUrl: value.websiteUrl.trim() || undefined,
          linkedinUrl: value.linkedinUrl.trim() || undefined,
          tagline: value.tagline.trim() || undefined,
          about: value.about.trim() || undefined,
        },
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error((err as { error?: { message?: string } }).error?.message ?? "Failed to update profile")
      }
    },
    onSuccess: () => {
      toast.success("Profile updated")
      profileQuery.refetch()
    },
    onError: (err) => toast.error(err.message),
  })

  const nameMutation = useMutation({
    mutationFn: async (value: z.infer<typeof userNameSchema>) => {
      const res = await apiClient.v1.user.$patch({
        json: {
          name: value.name.trim(),
        },
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error((err as { error?: { message?: string } }).error?.message ?? "Failed to update name")
      }
      const json = (await res.json()) as { data: UserData }
      return json.data
    },
    onSuccess: () => {
      toast.success("Name updated")
      userQuery.refetch()
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Failed to update name"),
  })

  const profileForm = useForm({
    defaultValues: {
      name: "",
      websiteUrl: "",
      linkedinUrl: "",
      tagline: "",
      about: "",
    },
    validators: {
      onSubmit: profileSchema,
    },
    onSubmit: async ({ value }) => {
      await updateMutation.mutateAsync(value)
    },
  })

  const accountForm = useForm({
    defaultValues: {
      name: "",
    },
    validators: {
      onSubmit: userNameSchema,
    },
    onSubmit: async ({ value }) => {
      await nameMutation.mutateAsync(value)
    },
  })

  useEffect(() => {
    if (!profileQuery.data) return
    profileForm.setFieldValue("name", profileQuery.data.name as never)
    profileForm.setFieldValue("websiteUrl", (profileQuery.data.websiteUrl ?? "") as never)
    profileForm.setFieldValue("linkedinUrl", (profileQuery.data.linkedinUrl ?? "") as never)
    profileForm.setFieldValue("tagline", (profileQuery.data.tagline ?? "") as never)
    profileForm.setFieldValue("about", (profileQuery.data.about ?? "") as never)
  }, [profileQuery.data, profileForm])

  useEffect(() => {
    if (!userQuery.data) return
    accountForm.setFieldValue("name", userQuery.data.name as never)
  }, [userQuery.data, accountForm])

  if (profileQuery.isLoading || userQuery.isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center pt-14">
        <RiLoader4Line className="size-5 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (profileQuery.isError || !profileQuery.data || userQuery.isError || !userQuery.data) {
    return (
      <div className="flex flex-1 items-center justify-center pt-14 text-sm text-muted-foreground">
        Unable to load organization profile.
      </div>
    )
  }

  const profile = profileQuery.data
  const user = userQuery.data
  const hasPublicLink = Boolean(profile.websiteUrl || profile.linkedinUrl)
  const profileCompleteness = [profile.name, profile.websiteUrl, profile.linkedinUrl, profile.tagline, profile.about].filter(Boolean).length

  return (
    <div className="flex flex-1 flex-col gap-6 bg-background p-4 pt-12 sm:p-6 sm:pt-14">
      <div className="relative overflow-hidden rounded-2xl border bg-card/90 p-5 shadow-sm sm:p-6">
        <div className="relative space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="border-border bg-muted text-foreground">
              Account
            </Badge>
            <Badge variant={hasPublicLink ? "secondary" : "destructive"}>{hasPublicLink ? "Public links set" : "Public links missing"}</Badge>
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Organization Identity</h1>
            <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">
              Shape how candidates and partners discover your team. Keep account details consistent and your public profile sharp.
            </p>
          </div>
          <div className="grid gap-2 sm:grid-cols-3">
            <div className="rounded-lg border bg-background/75 px-3 py-2">
              <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Owner</p>
              <p className="truncate text-sm font-medium">{user.name}</p>
            </div>
            <div className="rounded-lg border bg-background/75 px-3 py-2">
              <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Organization</p>
              <p className="truncate text-sm font-medium">{profile.name}</p>
            </div>
            <div className="rounded-lg border bg-background/75 px-3 py-2">
              <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Profile Health</p>
              <p className="text-sm font-medium">{profileCompleteness}/5 fields completed</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_340px]">
        <div className="space-y-6">
        <Card className="border-dashed bg-card/70 backdrop-blur">
          <CardHeader>
            <CardTitle>Your account</CardTitle>
          </CardHeader>
          <Separator />
          <CardContent className="pt-4">
            <form
              className="space-y-5"
              onSubmit={(e) => {
                e.preventDefault()
                accountForm.handleSubmit()
              }}
            >
              <FieldGroup>
                <accountForm.Field name="name">
                  {(field) => {
                    const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid
                    return (
                      <Field data-invalid={isInvalid}>
                        <FieldLabel htmlFor={field.name}>Name</FieldLabel>
                        <Input
                          id={field.name}
                          value={field.state.value}
                          onBlur={field.handleBlur}
                          onChange={(e) => field.handleChange(e.target.value)}
                        />
                        {isInvalid && <FieldError errors={field.state.meta.errors} />}
                      </Field>
                    )
                  }}
                </accountForm.Field>
              </FieldGroup>
              <Field>
                <FieldLabel>Email</FieldLabel>
                <Input value={user.email} readOnly disabled className="bg-muted/30" />
              </Field>
              <div className="flex items-center gap-3">
                <Button type="submit" disabled={nameMutation.isPending}>
                  <RiSaveLine />
                  {nameMutation.isPending ? "Saving..." : "Update name"}
                </Button>
                <p className="text-xs text-muted-foreground">Email can't be changed here.</p>
              </div>
            </form>
          </CardContent>
        </Card>

        <Card className="bg-card/90 shadow-sm">
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <CardTitle>Public organization details</CardTitle>
              <Badge variant={hasPublicLink ? "secondary" : "destructive"}>
                {hasPublicLink ? "Visible" : "Incomplete"}
              </Badge>
            </div>
          </CardHeader>
          <Separator />
          <CardContent className="pt-4">
            <form
              className="space-y-5"
              onSubmit={(e) => {
                e.preventDefault()
                profileForm.handleSubmit()
              }}
            >
              <FieldGroup>
                <profileForm.Field name="name">
                  {(field) => {
                    const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid
                    return (
                      <Field data-invalid={isInvalid}>
                        <FieldLabel htmlFor={field.name}>Organization name (required)</FieldLabel>
                        <Input
                          id={field.name}
                          value={field.state.value}
                          onBlur={field.handleBlur}
                          onChange={(e) => field.handleChange(e.target.value)}
                        />
                        {isInvalid && <FieldError errors={field.state.meta.errors} />}
                      </Field>
                    )
                  }}
                </profileForm.Field>

                <div className="grid gap-4 md:grid-cols-2">
                  <profileForm.Field name="websiteUrl">
                    {(field) => {
                      const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid
                      return (
                        <Field data-invalid={isInvalid}>
                          <FieldLabel htmlFor={field.name}>Website URL (or LinkedIn)</FieldLabel>
                          <Input
                            id={field.name}
                            type="url"
                            value={field.state.value}
                            onBlur={field.handleBlur}
                            onChange={(e) => field.handleChange(e.target.value)}
                            placeholder="https://company.com"
                          />
                          {isInvalid && <FieldError errors={field.state.meta.errors} />}
                        </Field>
                      )
                    }}
                  </profileForm.Field>

                  <profileForm.Field name="linkedinUrl">
                    {(field) => {
                      const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid
                      return (
                        <Field data-invalid={isInvalid}>
                          <FieldLabel htmlFor={field.name}>LinkedIn URL (or Website)</FieldLabel>
                          <Input
                            id={field.name}
                            type="url"
                            value={field.state.value}
                            onBlur={field.handleBlur}
                            onChange={(e) => field.handleChange(e.target.value)}
                            placeholder="https://linkedin.com/company/company-name"
                          />
                          {isInvalid && <FieldError errors={field.state.meta.errors} />}
                        </Field>
                      )
                    }}
                  </profileForm.Field>
                </div>

                <profileForm.Field name="tagline">
                  {(field) => (
                    <Field>
                      <FieldLabel htmlFor={field.name}>Tagline (optional)</FieldLabel>
                      <Input
                        id={field.name}
                        value={field.state.value}
                        onChange={(e) => field.handleChange(e.target.value)}
                        placeholder="Designing tools for focused engineering teams"
                      />
                    </Field>
                  )}
                </profileForm.Field>

                <profileForm.Field name="about">
                  {(field) => (
                    <Field>
                      <FieldLabel htmlFor={field.name}>About company (optional)</FieldLabel>
                      <Textarea
                        id={field.name}
                        rows={6}
                        value={field.state.value}
                        onChange={(e) => field.handleChange(e.target.value)}
                      />
                    </Field>
                  )}
                </profileForm.Field>
              </FieldGroup>

              <Button type="submit" className="cursor-pointer" disabled={updateMutation.isPending}>
                <RiSaveLine />
                {updateMutation.isPending ? "Saving..." : "Save Changes"}
              </Button>
            </form>
          </CardContent>
        </Card>
        </div>

        <Card className="h-fit bg-card/85 shadow-sm">
          <CardHeader>
            <CardTitle>Quick info</CardTitle>
          </CardHeader>
          <Separator />
          <CardContent className="space-y-4 pt-4 text-sm">
            <div className="rounded-lg border bg-muted/30 p-3">
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Status</p>
              <p className="mt-1 font-medium">{hasPublicLink ? "Ready for discovery" : "Needs public links"}</p>
            </div>
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-muted-foreground">
                <RiBuildingLine className="size-4" />
                <span>{profile.name}</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <RiUserLine className="size-4" />
                <span>Slug: {profile.slug}</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <RiUserLine className="size-4" />
                <span>{user.name}</span>
              </div>
            </div>
            {profile.websiteUrl && (
              <a
                href={profile.websiteUrl}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-2 rounded-md border border-transparent px-2 py-1 text-muted-foreground transition hover:border-border hover:bg-muted/40 hover:text-foreground"
              >
                <RiGlobalLine className="size-4" />
                Website
              </a>
            )}
            {profile.linkedinUrl && (
              <a
                href={profile.linkedinUrl}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-2 rounded-md border border-transparent px-2 py-1 text-muted-foreground transition hover:border-border hover:bg-muted/40 hover:text-foreground"
              >
                <RiLinkedinBoxLine className="size-4" />
                LinkedIn
              </a>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
