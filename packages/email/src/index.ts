import { Resend } from "resend";
import { welcomeEmailTemplate, liveNowEmailTemplate } from "./templates";

export interface EmailOptions {
  apiKey: string;
  from: string;
}

export class EmailService {
  private resend: Resend;
  private from: string;

  constructor(options: EmailOptions) {
    this.resend = new Resend(options.apiKey);
    this.from = options.from;
  }

  async sendWelcomeEmail(to: string, name?: string) {
    return this.resend.emails.send({
      from: this.from,
      to,
      subject: "Welcome to Orizen Flow — You're on the list!",
      html: welcomeEmailTemplate(name),
    });
  }

  async sendLiveNowEmail(to: string) {
    return this.resend.emails.send({
      from: this.from,
      to,
      subject: "Orizen Flow is now LIVE! 🚀",
      html: liveNowEmailTemplate(),
    });
  }
}
