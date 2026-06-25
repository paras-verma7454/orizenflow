import { Resend } from "resend"
import { env } from "@/lib/env"
import { welcomeEmailTemplate, liveNowEmailTemplate } from "./templates"

export class EmailService {
  private resend: Resend
  private from: string

  constructor() {
    if (!env.RESEND_API_KEY) {
      throw new Error("RESEND_API_KEY is not set")
    }
    this.resend = new Resend(env.RESEND_API_KEY)
    this.from = env.RESEND_FROM_EMAIL
  }

  async sendWelcomeEmail(to: string, name?: string) {
    return this.resend.emails.send({
      from: this.from,
      to,
      subject: "Welcome to Orizen Flow — You're on the list!",
      html: welcomeEmailTemplate(name),
    })
  }

  async sendLiveNowEmail(to: string) {
    return this.resend.emails.send({
      from: this.from,
      to,
      subject: "Orizen Flow is now LIVE! 🚀",
      html: liveNowEmailTemplate(),
    })
  }
}
