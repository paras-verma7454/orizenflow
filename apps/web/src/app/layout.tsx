import type { Metadata } from "next";

import { existsSync } from "fs";
import { join } from "path";

import { InnerProvider, OuterProvider } from "@/app/providers";
import { Navbar } from "@/components/navbar/home";
import { config } from "@/lib/config";
import "@/app/globals.css";

function getOgImagePath(): string {
  const staticOgPath = join(process.cwd(), "public", "og", "home.png");
  if (existsSync(staticOgPath)) {
    return "/og/home.png";
  }
  return "/api/og/home";
}

const ogImagePath = getOgImagePath();

export async function generateMetadata(): Promise<Metadata> {
  const ogImageUrl = `${config.app.url}${ogImagePath}`;

  return {
    title: {
      default: "Orizen Flow - Evidence-based hiring CRM",
      template: "%s | Orizen Flow",
    },
    description:
      "Automatically analyze resumes, portfolios, and GitHub to identify the strongest candidates with technical precision.",
    openGraph: {
      type: "website",
      siteName: "Orizen Flow",
      url: config.app.url,
      images: [
        {
          url: ogImageUrl,
          width: 1200,
          height: 630,
          alt: "Orizen Flow - Evidence-based hiring CRM",
        },
      ],
    },
    other: {
      "og:logo": `${config.app.url}/favicon.ico`,
    },
    twitter: {
      card: "summary_large_image",
      images: [ogImageUrl],
    },
  };
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <OuterProvider>
      <html lang="en" suppressHydrationWarning>
        <head>
          <script
            defer
            src="https://cloud.umami.is/script.js"
            data-website-id="84a24c98-3a01-4b2f-b984-5e790123aee9"
          />
        </head>
        <body className="min-h-dvh antialiased">
          <InnerProvider>
            <Navbar />
            {children}
          </InnerProvider>
        </body>
      </html>
    </OuterProvider>
  );
}
