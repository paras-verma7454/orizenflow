import { notFound, redirect } from "next/navigation"

import { db, jobApplications } from "@/lib/db"
import { auth } from "@/lib/auth"
import { headers } from "next/headers"
import { eq } from "drizzle-orm"

type Props = {
  params: Promise<{ id: string }>
}

export default async function ResumePage({ params }: Props) {
  const { id } = await params
  const session = await auth.api.getSession({ headers: (await headers()) })
  if (!session?.user) redirect("/")

  const [application] = await db
    .select({
      name: jobApplications.name,
      email: jobApplications.email,
      resumeText: jobApplications.resumeText,
    })
    .from(jobApplications)
    .where(eq(jobApplications.id, id))

  if (!application || !application.resumeText) notFound()

  const { name, email, resumeText } = application

  return (
    <div className="mx-auto max-w-4xl px-6 py-12 print:px-0 print:py-0">
      <div className="rounded-xl border-2 border-slate-200 bg-white p-8 shadow-sm print:border-none print:shadow-none dark:border-slate-700 dark:bg-transparent sm:p-12">
        {/* Header */}
        <div className="mb-8 border-b-2 border-slate-200 pb-6 dark:border-slate-700">
          <h1 className="text-3xl font-bold tracking-tight">{name}</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">{email}</p>
        </div>

        {/* Resume Content */}
        <div className="text-sm leading-relaxed">
          {resumeText.split("\n").map((line, i) => {
            const trimmed = line.trim()
            if (!trimmed) {
              return <div key={i} className="h-3" />
            }

            const isMajorHeading =
              /^[A-Z\s]{3,}$/.test(trimmed) ||
              /^(education|experience|skills|projects|work\s*experience|summary|objective|profile|certifications|languages|interests|publications|courses|training)/i.test(
                trimmed,
              )

            if (isMajorHeading) {
              return (
                <h2
                  key={i}
                  className="mb-2 mt-6 text-lg font-bold text-foreground first:mt-0"
                >
                  {trimmed}
                </h2>
              )
            }

            const isSubHeading =
              /^[A-Za-z].*\d{4}/.test(trimmed) ||
              /^(•|-|\*)\s*[A-Z]/.test(trimmed) ||
              trimmed.startsWith("•") ||
              trimmed.startsWith("-") ||
              trimmed.startsWith("*")

            if (isSubHeading && trimmed.startsWith("•")) {
              return (
                <p key={i} className="ml-4 text-muted-foreground">
                  {trimmed.slice(1).trim()}
                </p>
              )
            }

            if (isSubHeading && (trimmed.startsWith("-") || trimmed.startsWith("*"))) {
              return (
                <p key={i} className="ml-4 text-muted-foreground">
                  {trimmed.slice(1).trim()}
                </p>
              )
            }

            if (isSubHeading) {
              return (
                <p key={i} className="font-semibold text-foreground">
                  {trimmed}
                </p>
              )
            }

            return (
              <p key={i} className="text-muted-foreground">
                {trimmed}
              </p>
            )
          })}
        </div>
      </div>
    </div>
  )
}
