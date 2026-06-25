import { Footer } from "@/components/Footer";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service | Orizen Flow",
  description:
    "Terms of Service for using Orizen Flow's hiring and candidate analysis platform.",
};

export default function TermsOfServicePage() {
  return (
    <div className="flex flex-col min-h-screen">
      <main className="flex-1 w-full max-w-4xl mx-auto px-6 py-12 md:py-20 text-foreground">
        <h1 className="text-4xl md:text-5xl font-bold mb-8 md:mb-12 tracking-tight">
          Terms of Service
        </h1>

        <div className="prose prose-neutral dark:prose-invert max-w-none space-y-8">
          <p className="text-lg text-muted-foreground">
            Last updated:{" "}
            {new Date().toLocaleDateString("en-US", {
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </p>

          <section>
            <h2 className="text-2xl font-semibold mb-4">
              1. Acceptance of Terms
            </h2>
            <p>
              By accessing and using Orizen Flow ("Service"), you accept and
              agree to be bound by the terms and provision of this agreement. In
              addition, when using these particular services, you shall be
              subject to any posted guidelines or rules applicable to such
              services.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">
              2. Description of Service
            </h2>
            <p>
              Orizen Flow provides an evidence-based hiring platform designed to
              help companies identify top candidates by analyzing resumes,
              GitHub profiles, and portfolios ("Service"). You understand and
              agree that the Service is provided "AS-IS" and that Orizen Flow
              assumes no responsibility for the timeliness, deletion,
              mis-delivery or failure to store any user communications or
              personalization settings.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">3. User Accounts</h2>
            <p>
              To access certain features of the Service, you may be required to
              register for an account. You agree to provide true, accurate,
              current and complete information about yourself as prompted by the
              Service's registration form. If you provide any information that
              is untrue, inaccurate, not current or incomplete, Orizen Flow has
              the right to suspend or terminate your account and refuse any and
              all current or future use of the Service.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">4. Privacy Policy</h2>
            <p>
              Your use of the Service is also subject to our Privacy Policy.
              Please review our Privacy Policy, which also governs the Service
              and informs users of our data collection practices.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">
              5. Intellectual Property
            </h2>
            <p>
              All content included as part of the Service, such as text,
              graphics, logos, images, as well as the compilation thereof, and
              any software used on the Service, is the property of Orizen Flow
              or its suppliers and protected by copyright and other laws that
              protect intellectual property and proprietary rights.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">6. Termination</h2>
            <p>
              We may terminate your access to the Service, without cause or
              notice, which may result in the forfeiture and destruction of all
              information associated with you. All provisions of this Agreement
              that by their nature should survive termination shall survive
              termination, including, without limitation, ownership provisions,
              warranty disclaimers, indemnity, and limitations of liability.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">
              7. Disclaimer of Warranties
            </h2>
            <p>
              The Service is provided on an "as is" and "as available" basis.
              Orizen Flow makes no representations or warranties of any kind,
              whether express, implied, statutory or otherwise, regarding the
              Service, including any warranty that the Service will be
              uninterrupted, error-free or free of harmful components.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">
              8. Limitation of Liability
            </h2>
            <p>
              In no event shall Orizen Flow, nor its directors, employees,
              partners, agents, suppliers, or affiliates, be liable for any
              indirect, incidental, special, consequential or punitive damages,
              including without limitation, loss of profits, data, use,
              goodwill, or other intangible losses, resulting from your access
              to or use of or inability to access or use the Service.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">
              9. Contact Information
            </h2>
            <p>
              If you have any questions about these Terms, please contact us at{" "}
              <a
                href="mailto:paras@orizenflow.luffytaro.me"
                className="text-primary hover:underline"
              >
                paras@orizenflow.luffytaro.me
              </a>
              .
            </p>
          </section>
        </div>
      </main>
      <Footer />
    </div>
  );
}
