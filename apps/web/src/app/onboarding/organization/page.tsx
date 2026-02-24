"use client"

import { useForm } from "@tanstack/react-form"
import { useMutation } from "@tanstack/react-query"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { z } from "zod"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { apiClient } from "@/lib/api/client"

const formSchema = z
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
      ctx.addIssue({
        code: "custom",
        message: "Provide website URL or LinkedIn URL",
        path: ["websiteUrl"],
      })
    }

    if (website && !z.url().safeParse(website).success) {
      ctx.addIssue({
        code: "custom",
        message: "Enter a valid website URL",
        path: ["websiteUrl"],
      })
    }

    if (linkedin && !z.url().safeParse(linkedin).success) {
      ctx.addIssue({
        code: "custom",
        message: "Enter a valid LinkedIn URL",
        path: ["linkedinUrl"],
      })
    }
  })

export default function OrganizationOnboardingPage() {
  const router = useRouter()

  const mutation = useMutation({
    mutationFn: async (values: z.infer<typeof formSchema>) => {
      const websiteUrl = values.websiteUrl?.trim()
      const linkedinUrl = values.linkedinUrl?.trim()
      const tagline = values.tagline?.trim()
      const about = values.about?.trim()

      const res = await apiClient.v1.organization.bootstrap.$post({
        json: {
          name: values.name.trim(),
          websiteUrl: websiteUrl && websiteUrl.length > 0 ? websiteUrl : undefined,
          linkedinUrl: linkedinUrl && linkedinUrl.length > 0 ? linkedinUrl : undefined,
          tagline: tagline && tagline.length > 0 ? tagline : undefined,
          about: about && about.length > 0 ? about : undefined,
        },
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error((err as { error?: { message?: string } }).error?.message ?? "Failed to set up organization")
      }
    },
    onSuccess: () => {
      toast.success("Organization setup complete")
      router.push("/dashboard/jobs/new")
    },
    onError: (err) => {
      toast.error(err.message)
    },
  })

  const form = useForm({
    defaultValues: {
      name: "",
      websiteUrl: "",
      linkedinUrl: "",
      tagline: "",
      about: "",
    },
    validators: {
      onSubmit: formSchema,
    },
    onSubmit: async ({ value }) => {
      await mutation.mutateAsync(value)
    },
  })

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-2xl items-center px-6 py-10">
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Set up your organization</CardTitle>
          <p className="text-sm text-muted-foreground">
            Organization name is required. Add at least one public link: website or LinkedIn.
          </p>
        </CardHeader>
        <CardContent>
          <form
            className="space-y-5"
            onSubmit={(e) => {
              e.preventDefault()
              form.handleSubmit()
            }}
          >
            <FieldGroup>
              <form.Field name="name">
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
                        placeholder="Acme Labs"
                      />
                      {isInvalid && <FieldError errors={field.state.meta.errors} />}
                    </Field>
                  )
                }}
              </form.Field>

              <form.Field name="websiteUrl">
                {(field) => {
                  const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid
                  return (
                    <Field data-invalid={isInvalid}>
                      <FieldLabel htmlFor={field.name}>Website URL (required if LinkedIn is empty)</FieldLabel>
                      <Input
                        id={field.name}
                        type="url"
                        value={field.state.value}
                        onBlur={field.handleBlur}
                        onChange={(e) => field.handleChange(e.target.value)}
                        placeholder="https://company.com"
                      />
                      <FieldDescription>Provide website URL or LinkedIn URL.</FieldDescription>
                      {isInvalid && <FieldError errors={field.state.meta.errors} />}
                    </Field>
                  )
                }}
              </form.Field>

              <form.Field name="linkedinUrl">
                {(field) => {
                  const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid
                  return (
                    <Field data-invalid={isInvalid}>
                      <FieldLabel htmlFor={field.name}>LinkedIn URL (required if Website is empty)</FieldLabel>
                      <Input
                        id={field.name}
                        type="url"
                        value={field.state.value}
                        onBlur={field.handleBlur}
                        onChange={(e) => field.handleChange(e.target.value)}
                        placeholder="https://linkedin.com/company/acme"
                      />
                      {isInvalid && <FieldError errors={field.state.meta.errors} />}
                    </Field>
                  )
                }}
              </form.Field>

              <form.Field name="tagline">
                {(field) => (
                  <Field>
                    <FieldLabel htmlFor={field.name}>Tagline (optional)</FieldLabel>
                    <Input
                      id={field.name}
                      value={field.state.value}
                      onChange={(e) => field.handleChange(e.target.value)}
                      placeholder="Building developer-first products"
                    />
                  </Field>
                )}
              </form.Field>

              <form.Field name="about">
                {(field) => (
                  <Field>
                    <FieldLabel htmlFor={field.name}>About company (optional)</FieldLabel>
                    <Textarea
                      id={field.name}
                      rows={5}
                      value={field.state.value}
                      onChange={(e) => field.handleChange(e.target.value)}
                      placeholder="Write a short summary candidates will see on the application page."
                    />
                  </Field>
                )}
              </form.Field>
            </FieldGroup>

            <Button type="submit" className="cursor-pointer" disabled={mutation.isPending}>
              {mutation.isPending ? "Saving..." : "Continue"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}