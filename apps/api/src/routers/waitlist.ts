import { findIp } from "@arcjet/ip"
import { db, waitlist } from "@packages/db"
import { env } from "@packages/env/api-hono"
import { Hono } from "hono"
import { describeRoute, resolver } from "hono-openapi"
import { Resend } from "resend"
import { z } from "zod"

const resend = env.RESEND_API_KEY ? new Resend(env.RESEND_API_KEY) : null

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

        if (inserted && resend) {
          resend.emails
            .send({
              from: env.RESEND_FROM_EMAIL,
              to: [email],
              subject: "Welcome to Orizen Flow — You're on the list!",
              html: `
                <div style="font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif; max-width: 560px; margin: 0 auto; padding: 40px 24px; color: #0F172A;">
                  <div style="margin-bottom: 32px;">
                    <h1 style="font-size: 20px; font-weight: 700; margin: 0 0 4px;">Orizen Flow</h1>
                    <p style="font-size: 13px; color: #64748B; margin: 0;">Evidence-based hiring CRM</p>
                  </div>
                  <p style="font-size: 15px; line-height: 1.6; margin: 0 0 16px;">Thanks for joining our early access waitlist.</p>
                  <p style="font-size: 15px; line-height: 1.6; margin: 0 0 16px;">We're building a new way to evaluate candidates — using real technical evidence from resumes, portfolios, and GitHub contributions instead of keyword matching.</p>
                  <p style="font-size: 15px; line-height: 1.6; margin: 0 0 24px;">We'll reach out when your spot is ready.</p>
                  <hr style="border: none; border-top: 1px solid #E5E7EB; margin: 24px 0;" />
                  <p style="font-size: 12px; color: #94A3B8; margin: 0;">Orizen Flow · Evidence-based hiring</p>
                </div>
              `,
            })
            .catch((err) => {
              console.error("[waitlist] Failed to send welcome email:", err)
            })
        }

        return c.json({ success: true, message: "Welcome to the waitlist!" })
      } catch (error) {
        return c.json({ success: false, message: "Something went wrong" }, 500)
      }
    },
  )
