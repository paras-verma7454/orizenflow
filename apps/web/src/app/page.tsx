"use client";

import { Footer } from "@/components/Footer"
import { HowItWorksSection } from "@/components/HowItWorksSection"
import { Waitlist } from "@/components/Waitlist"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { PointerHighlight } from "@/components/ui/pointer-highlight"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import React from "react";
import { apiClient } from "@/lib/api/client";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { TypewriterEffect } from "@/components/ui/typewriter-effect";
import { MovingBorderInput } from "@/components/ui/moving-border-input";
import { Highlight } from "@/components/ui/hero-highlight";
import { Boxes } from "@/components/ui/background-boxes";

const words = [
  { text: "Evidence-based" },
  { text: "hiring," },
  { text: "not resume", className: "text-muted-foreground/60 line-through" },
  { text: "guessing.", className: "text-foreground" },
];

const problemCards = [
  {
    title: "Resume Noise",
    description: "Hundreds of applications hide high-signal candidates behind generic wording.",
  },
  {
    title: "Scattered Evidence",
    description: "Portfolio quality and GitHub proof are disconnected from resume review flow.",
  },
  {
    title: "Manual Overhead",
    description: "Teams spend hours triaging before technical interview quality improves.",
  },
]

const solutionCards = [
  {
    title: "Unified Evidence Layer",
    description: "Resume context, portfolio depth, and code contribution quality in one profile.",
  },
  {
    title: "Role-fit Ranking",
    description: "Score candidates against technical requirements with transparent criteria.",
  },
  {
    title: "Explainable Insights",
    description: "Strengths, concerns, and recommendation rationale are visible to hiring teams.",
  },
]

const features = [
  {
    title: "AI Evaluation",
    description: "Consistent candidate scoring based on technical evidence. Every profile is measured against the same rubric so no candidate slips through the cracks.",
    className: "md:col-span-2",
  },
  {
    title: "Multi-source Analysis",
    description: "Combine resume, portfolio, and repository insights.",
    className: "md:col-span-1",
  },
  {
    title: "Pipeline Dashboard",
    description: "Reduce screening noise and surface high-intent candidates.",
    className: "md:col-span-1",
  },
  {
    title: "Evidence Insights",
    description: "Understand candidate fit before scheduling engineering interviews. Surface strengths, flag concerns, and get actionable recommendations.",
    className: "md:col-span-2",
  },
]

export default function Home() {
  const [email, setEmail] = React.useState("");
  const [status, setStatus] = React.useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = React.useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setStatus("loading");
    try {
      const res = await apiClient.waitlist.join.$post({
        json: { email },
      });
      const data = await res.json();

      if (res.ok) {
        setStatus("success");
        setMessage(data.message || "You're on the waitlist.");
        setEmail("");
      } else {
        setStatus("error");
        setMessage(data.message || "Failed to join waitlist");
      }
    } catch {
      setStatus("error");
      setMessage("Connection error. Please try again.");
    }
  };

  return (
    <main className="flex min-h-screen flex-col bg-background">
      <section className="relative w-full border-b border-border bg-background pt-20 md:pt-24 overflow-hidden">
        {/* Interactive Boxes Background */}
        <div className="absolute inset-0 z-0 h-full w-full [mask-image:radial-gradient(black,transparent_80%)]">
          <Boxes />
        </div>
        <div className="relative z-10 mx-auto flex max-w-6xl flex-col items-center px-6 pb-32 pt-20 sm:pt-28 md:pt-30 text-center pointer-events-none">
          <div className="mt-6 max-w-3xl md:mt-10 pointer-events-auto">
            <div className="animate-fade-in-up">
              <TypewriterEffect words={words} className="mb-8 text-4xl font-bold tracking-tight md:text-6xl" />
            </div>

            <p 
              className="mx-auto mb-12 max-w-2xl text-lg font-light leading-relaxed text-muted-foreground/80 md:text-xl animate-fade-in-up [animation-delay:200ms]"
            >
              Analyze resumes, portfolios, and technical contributions automatically.
              Identify top-tier engineering talent with <Highlight className="text-foreground font-medium">objective technical precision</Highlight>.
            </p>

            <form 
              onSubmit={handleSubmit} 
              className="mx-auto flex w-full max-w-xl flex-col gap-3 sm:flex-row animate-fade-in-up [animation-delay:400ms]"
            >
              <MovingBorderInput
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
                required
                containerClassName="flex-grow" // To make it take full width in sm:flex-row
                inputClassName="h-14 rounded-full" // Keep rounded-full for the inner input
                movingBorderDuration={6000}
                borderRadius="9999px"
              />
              <Button
                type="submit"
                size="xl"
                disabled={status === "loading"}
                className="h-14 rounded-full bg-foreground px-10 font-semibold tracking-tight text-background transition-all hover:bg-foreground/90"
              >
                {status === "loading" ? "Joining..." : "Join Waitlist"}
              </Button>
            </form>
            {(status === "success" || status === "error") && (
              <p className={`mt-4 text-sm font-medium animate-fade-in ${status === "success" ? "text-accent" : "text-destructive"}`}>
                {message}
              </p>
            )}
          </div>
        </div>
      </section>

      <section id="problem" className="border-b border-border bg-zinc-50 py-24 dark:bg-zinc-950">
        <div className="mx-auto max-w-6xl px-6">
          <div className="grid grid-cols-1 gap-10 md:grid-cols-[0.8fr_1.2fr] md:items-start">
            <div className="text-left">
              <PointerHighlight
                containerClassName="mb-5"
                rectangleClassName="bg-blue-100 dark:bg-blue-900 border-blue-300 dark:border-blue-700 leading-loose"
                pointerClassName="text-blue-500 h-3 w-3"
              >
                <span className="relative z-10 inline-block px-2 text-sm font-bold tracking-wide text-foreground md:text-base">
                  Problem
                </span>
              </PointerHighlight>
              <h2 className="text-balance text-4xl font-bold tracking-tight md:text-6xl">
                Hiring teams drown in resumes, not insight.
              </h2>
            </div>
                                                <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
                                                  {problemCards.map((card) => (
                                                    <div key={card.title} className="group relative border-2 border-dashed border-neutral-400 bg-neutral-50 p-6 transition-all hover:border-neutral-500 hover:bg-neutral-100 dark:border-neutral-700 dark:bg-neutral-900/50 dark:hover:border-neutral-600 dark:hover:bg-neutral-900">
                                                      <div className="mb-4 font-mono text-xs font-bold uppercase tracking-widest text-neutral-500 dark:text-neutral-400">
                                                        // Pain Point
                                                      </div>
                                                      <h3 className="mb-2 font-mono text-lg font-bold text-neutral-900 dark:text-neutral-100">
                                                        {card.title}
                                                      </h3>
                                                      <p className="text-sm leading-relaxed text-neutral-600 dark:text-neutral-400">
                                                        {card.description}
                                                      </p>
                                                    </div>
                                                  ))}
                                                </div>
                                              </div>
                                            </div>
                                          </section>
                                    
                                          <section id="solution" className="border-b border-border bg-white py-24 dark:bg-zinc-950">
                                            <div className="mx-auto max-w-6xl px-6">
                                              <div className="mb-16 text-center">
                                                <PointerHighlight
                                                  containerClassName="mb-5 md:mx-auto"
                                                  rectangleClassName="bg-emerald-100 dark:bg-emerald-900 border-emerald-300 dark:border-emerald-700 leading-loose"
                                                  pointerClassName="text-emerald-500 h-3 w-3"
                                                >
                                                  <span className="relative z-10 inline-block px-2 text-sm font-bold tracking-wide text-foreground md:text-base">
                                                    Solution
                                                  </span>
                                                </PointerHighlight>
                                                <h2 className="text-balance font-serif text-4xl font-semibold tracking-tight md:text-6xl">
                                                  Orizen Flow turns raw applications into ranked evidence.
                                                </h2>
                                              </div>
                                              <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
                                                {solutionCards.map((card, index) => (
                                                  <motion.div
                                                    key={card.title}
                                                    initial={{ opacity: 0, y: 24 }}
                                                    whileInView={{ opacity: 1, y: 0 }}
                                                    viewport={{ once: true, margin: "-60px" }}
                                                    transition={{ duration: 0.5, delay: index * 0.12, ease: "easeOut" }}
                                                    whileHover={{ y: -5 }}
                                                    className="group relative overflow-hidden rounded-2xl border border-emerald-200/80 bg-white p-8 shadow-[0_1px_3px_rgba(0,0,0,0.04)] transition-all duration-500 hover:border-emerald-400/40 hover:shadow-[0_20px_50px_-12px_rgba(16,185,129,0.15)] dark:border-emerald-900/30 dark:bg-zinc-900/60 dark:hover:border-emerald-500/30 dark:hover:shadow-[0_20px_50px_-12px_rgba(16,185,129,0.1)]"
                                                  >
                                                    <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/[0.06] via-transparent to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
                                                    <div className="relative z-10">
                                                      <h3 className="mb-3 text-xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100">
                                                        {card.title}
                                                      </h3>
                                                      <p className="text-[15px] leading-relaxed text-neutral-500 dark:text-neutral-400">
                                                        {card.description}
                                                      </p>
                                                    </div>
                                                  </motion.div>
                                                ))}
                                              </div>
                                            </div>
                                          </section>
                                    
                                          <HowItWorksSection />
                                    
                                          <section id="features" className="border-b border-border bg-neutral-50/50 py-24 dark:bg-zinc-900/20">
                                            <div className="mx-auto max-w-6xl px-6">
                                              <div className="mb-16 text-left md:text-center">
                                                <PointerHighlight
                                                  containerClassName="mb-5 md:mx-auto"
                                                  rectangleClassName="bg-violet-100 dark:bg-violet-900 border-violet-300 dark:border-violet-700 leading-loose"
                                                  pointerClassName="text-violet-500 h-3 w-3"
                                                >
                                                  <span className="relative z-10 inline-block px-2 text-sm font-bold tracking-wide text-foreground md:text-base">
                                                    Features
                                                  </span>
                                                </PointerHighlight>
                                                <h2 className="text-balance text-5xl font-bold tracking-tight md:text-7xl">
                                                  Built for technical hiring teams.
                                                </h2>
                                              </div>
                                              <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
                                                {features.map((feature, index) => (
                                                  <motion.div
                                                    key={feature.title}
                                                    initial={{ opacity: 0, y: 24 }}
                                                    whileInView={{ opacity: 1, y: 0 }}
                                                    viewport={{ once: true, margin: "-60px" }}
                                                    transition={{ duration: 0.5, delay: index * 0.1, ease: "easeOut" }}
                                                    whileHover={{ y: -6 }}
                                                    className={`${feature.className} group relative overflow-hidden rounded-2xl border border-violet-200/60 bg-white p-8 shadow-[0_1px_3px_rgba(0,0,0,0.04)] transition-all duration-500 hover:border-violet-400/50 hover:shadow-[0_20px_50px_-12px_rgba(139,92,246,0.15)] dark:border-violet-900/40 dark:bg-zinc-900/60 dark:hover:border-violet-500/40 dark:hover:shadow-[0_20px_50px_-12px_rgba(139,92,246,0.1)]`}
                                                  >
                                                    <div className="absolute inset-0 bg-gradient-to-br from-violet-500/[0.07] via-transparent to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
                                                    <div className="relative z-10">
                                                      <h3 className="mb-3 text-xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100">
                                                        {feature.title}
                                                      </h3>
                                                      <p className="text-[15px] leading-relaxed text-neutral-500 dark:text-neutral-400">
                                                        {feature.description}
                                                      </p>
                                                    </div>
                                                  </motion.div>
                                                ))}
                                              </div>
                                            </div>
                                          </section>
      <section id="product-preview" className="border-b border-border bg-zinc-100/60 py-24 dark:bg-zinc-950">
        <div className="mx-auto max-w-6xl px-6">
          <div className="mb-10 text-center">
            <PointerHighlight
              containerClassName="mb-5 md:mx-auto"
              rectangleClassName="bg-cyan-100 dark:bg-cyan-900 border-cyan-300 dark:border-cyan-700 leading-loose"
              pointerClassName="text-cyan-500 h-3 w-3"
            >
              <span className="relative z-10 inline-block px-2 text-sm font-bold tracking-wide text-foreground md:text-base">
                Product Preview
              </span>
            </PointerHighlight>
            <h2 className="text-balance text-4xl font-bold tracking-tight md:text-6xl">
              Reserved for upcoming dashboard build.
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-muted-foreground">
              This block is intentionally a placeholder and will be replaced with the real dashboard screenshot.
            </p>
          </div>
          <Card className="mx-auto max-w-5xl border-border/70 bg-card shadow-sm dark:shadow-none">
            <CardHeader>
              <CardTitle>Built for modern hiring teams</CardTitle>
              <CardDescription>Coming soon</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <Skeleton className="h-8 w-44" />
              <Separator />
              <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
                <Skeleton className="h-28 rounded-lg" />
                <Skeleton className="h-28 rounded-lg md:col-span-3" />
              </div>
              <Skeleton className="h-48 rounded-xl" />
            </CardContent>
          </Card>
        </div>
      </section>

      <Waitlist />
      <Footer />
    </main>
  )
}
