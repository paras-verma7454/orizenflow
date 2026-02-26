import { findIp } from "@arcjet/ip"
import { db, waitlist } from "@packages/db"
import { EmailService } from "@packages/email"
import { env } from "@packages/env/api-hono"
import { Hono } from "hono"
import { describeRoute, resolver } from "hono-openapi"
import { z } from "zod"

const emailService =
  env.RESEND_API_KEY && env.RESEND_FROM_EMAIL
    ? new EmailService({ apiKey: env.RESEND_API_KEY, from: env.RESEND_FROM_EMAIL })
    : null

export const waitlistRouter = new Hono()
  .post(
    "/join",
    describeRoute({
      tags: ["waitlist"],
      description: "Join the waitlist",
      responses: {
        200: {
          description: "Successfully joined waitlist",
          content: {
            "application/json": {
              schema: resolver(z.object({ success: z.boolean(), message: z.string() })),
            },
          },
        },
        400: {
          description: "Invalid email or already on waitlist",
        },
      },
    }),
    async (c) => {
      const { email } = await c.req.json<{ email: string }>()

      if (!email || !z.string().email().safeParse(email).success) {
        return c.json({ success: false, message: "Invalid email" }, 400)
      }

      const ip = findIp(c.req.raw) || undefined

      try {
        const [inserted] = await db
          .insert(waitlist)
          .values({ email, ip })
          .onConflictDoNothing()
          .returning({ id: waitlist.id })

        if (inserted && emailService) {
          emailService.sendWelcomeEmail(email).catch((err) => {
            console.error("[waitlist] Failed to send welcome email:", err)
          })
        }

        return c.json({ success: true, message: "Welcome to the waitlist!" })
      } catch (error) {
        return c.json({ success: false, message: "Something went wrong" }, 500)
      }
    },
  )
