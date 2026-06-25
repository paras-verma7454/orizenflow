import { Footer } from "@/components/Footer";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy | Orizen Flow",
  description:
    "Privacy Policy for Orizen Flow describing how we collect, use, and protect your personal information.",
};

export default function PrivacyPolicyPage() {
  return (
    <div className="flex flex-col min-h-screen">
      <main className="flex-1 w-full max-w-4xl mx-auto px-6 py-12 md:py-20 text-foreground">
        <h1 className="text-4xl md:text-5xl font-bold mb-8 md:mb-12 tracking-tight">
          Privacy Policy
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
            <h2 className="text-2xl font-semibold mb-4">1. Introduction</h2>
            <p>
              Welcome to Orizen Flow ("we," "our," or "us"). We create
              evidence-based hiring solutions designed to help companies
              identify the best candidates. We are committed to protecting your
              personal information and your right to privacy. If you have any
              questions or concerns about this privacy notice or our practices
              with regard to your personal information, please contact us at{" "}
              <a
                href="mailto:paras@orizenflow.luffytaro.me"
                className="text-primary hover:underline"
              >
                paras@orizenflow.luffytaro.me
              </a>
              .
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">
              2. Information We Collect
            </h2>
            <p className="mb-4">
              We collect personal information that you voluntarily provide to us
              when you register on the website, express an interest in obtaining
              information about us or our products and services, when you
              participate in activities on the website, or otherwise when you
              contact us.
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>
                <strong>Personal Information Provided by You:</strong> We
                collect names; email addresses; job titles; contact preferences;
                and other similar information.
              </li>
              <li>
                <strong>Credentials:</strong> We collect passwords, password
                hints, and similar security information used for authentication
                and account access.
              </li>
              <li>
                <strong>Candidate Data:</strong> If you use our services to
                analyze candidates, we process the resume data, portfolio links,
                and other candidate information you upload or provide access to.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">
              3. How We Use Your Information
            </h2>
            <p className="mb-4">
              We use personal information collected via our website for a
              variety of business purposes described below. We process your
              personal information for these purposes in reliance on our
              legitimate business interests, in order to enter into or perform a
              contract with you, with your consent, and/or for compliance with
              our legal obligations.
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>To facilitate account creation and logon process.</li>
              <li>To send you marketing and promotional communications.</li>
              <li>To fulfill and manage your orders and subscription.</li>
              <li>
                To deliver and facilitate delivery of services to the user.
              </li>
              <li>To improve our services and user experience.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">
              4. Data Sharing and Disclosure
            </h2>
            <p>
              We only share information with your consent, to comply with laws,
              to provide you with services, to protect your rights, or to
              fulfill business obligations. We may process or share your data
              that we hold based on the following legal basis:
            </p>
            <ul className="list-disc pl-6 space-y-2 mt-4">
              <li>
                <strong>Consent:</strong> We may process your data if you have
                given us specific consent to use your personal information for a
                specific purpose.
              </li>
              <li>
                <strong>Legitimate Interests:</strong> We may process your data
                when it is reasonably necessary to achieve our legitimate
                business interests.
              </li>
              <li>
                <strong>Service Providers:</strong> We may share your data with
                third-party vendors, service providers, contractors, or agents
                who perform services for us or on our behalf.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">5. Data Retention</h2>
            <p>
              We will only keep your personal information for as long as it is
              necessary for the purposes set out in this privacy notice, unless
              a longer retention period is required or permitted by law (such as
              tax, accounting, or other legal requirements). No purpose in this
              notice will require us keeping your personal information for
              longer than the period of time in which users have an account with
              us.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">6. Your Rights</h2>
            <p className="mb-4">
              Depending on your location, you may have certain rights regarding
              your personal information, such as:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>
                The right to request access and obtain a copy of your personal
                information.
              </li>
              <li>The right to request rectification or erasure.</li>
              <li>
                The right to restrict the processing of your personal
                information.
              </li>
              <li>The right to data portability.</li>
            </ul>
            <p className="mt-4">
              To exercise these rights, please contact us at{" "}
              <a
                href="mailto:paras@orizenflow.luffytaro.me"
                className="text-primary hover:underline"
              >
                paras@orizenflow.luffytaro.me
              </a>
              .
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">
              7. Costs and Payments
            </h2>
            <p>
              We use third-party payment processors to handle secure payments.
              We do not store your credit card details. Payment information is
              handled directly by our payment providers in accordance with their
              privacy policies.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">8. Contact Us</h2>
            <p>
              If you have questions or comments about this policy, you may email
              us at{" "}
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
