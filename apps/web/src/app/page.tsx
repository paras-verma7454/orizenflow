"use client";

import { Footer } from "@/components/Footer";
import { HowItWorksSection } from "@/components/HowItWorksSection";
import { ProductPreviewSection } from "@/components/ProductPreviewSection";
import { PointerHighlight } from "@/components/ui/pointer-highlight";
import React from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { TypewriterEffect } from "@/components/ui/typewriter-effect";
import { Highlight } from "@/components/ui/hero-highlight";
import { Boxes } from "@/components/ui/background-boxes";

const words = [
  { text: "Post jobs," },
  { text: "hire better." },
  { text: "AI-scored" },
  { text: "candidates.", className: "text-foreground" },
];

const problemCards = [
  {
    title: "Screening Takes Forever",
    description:
      "Hours spent reading resumes to find one qualified candidate. Most hiring happens through gut feel, not evidence.",
  },
  {
    title: "Missing The Right People",
    description:
      "Great candidates with strong portfolios or GitHub profiles get lost in the pile of generic applications.",
  },
  {
    title: "No Visibility Into Skills",
    description:
      "You can't quickly see technical abilities, relevant projects, or actual contribution quality before scheduling interviews.",
  },
];

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col bg-background">
      <section className="relative w-full border-b border-border bg-background pt-20 md:pt-24 overflow-hidden">
        {/* Interactive Boxes Background */}
        <div className="absolute inset-0 z-0 h-full w-full mask-[radial-gradient(black,transparent_80%)]">
          <Boxes />
        </div>
        <div className="relative z-10 mx-auto flex max-w-6xl flex-col items-center px-6 pb-32 pt-20 sm:pt-28 md:pt-30 text-center pointer-events-none">
          <div className="mt-6 max-w-3xl md:mt-10 pointer-events-auto">
            <div className="animate-fade-in-up">
              <TypewriterEffect
                words={words}
                className="mb-8 text-4xl font-bold tracking-tight md:text-6xl"
              />
            </div>

            <p className="mx-auto mb-12 max-w-2xl text-lg font-light leading-relaxed text-muted-foreground/80 md:text-xl animate-fade-in-up [animation-delay:200ms]">
              Post better jobs. Get smarter candidates. AI automatically scores
              applications so you{" "}
              <Highlight className="text-foreground font-medium">
                find top talent
              </Highlight>{" "}
              in minutes, not weeks.
            </p>

            <div className="mx-auto flex flex-col sm:flex-row gap-3 justify-center items-center animate-fade-in-up [animation-delay:400ms]">
              <Link
                href="/dashboard"
                className="h-14 inline-flex items-center justify-center rounded-full bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 px-10 font-semibold tracking-tight transition-all hover:bg-zinc-800 hover:dark:bg-zinc-100 shadow-xl"
              >
                Start Hiring Free
              </Link>
              <Button
                size="xl"
                variant="outline"
                className="h-14 rounded-full px-10 font-semibold tracking-tight border-2 border-zinc-200 dark:border-zinc-700 hover:!bg-zinc-100 hover:dark:!bg-zinc-800"
                onClick={() =>
                  document
                    .getElementById("how-it-works")
                    ?.scrollIntoView({ behavior: "smooth" })
                }
              >
                See How It Works
              </Button>
            </div>
            <p className="mt-6 text-sm text-muted-foreground/70 animate-fade-in-up [animation-delay:600ms]">
              Built for teams hiring engineers and digital roles.
            </p>
            <p className="mt-2 text-xs text-muted-foreground/50 animate-fade-in-up [animation-delay:700ms]">
              No credit card required. Start in minutes.
            </p>
          </div>
        </div>
      </section>

      <section
        id="problem"
        className="border-b border-border bg-zinc-50 py-24 dark:bg-zinc-950"
      >
        <div className="mx-auto max-w-6xl px-6">
          <div className="grid grid-cols-1 gap-10 md:grid-cols-[0.8fr_1.2fr] md:items-start">
            <div className="text-left">
              <PointerHighlight
                containerClassName="mb-5"
                rectangleClassName="bg-blue-100 dark:bg-blue-900 border-blue-300 dark:border-blue-700 leading-loose"
                pointerClassName="text-blue-500 h-3 w-3"
              >
                <span className="relative z-10 inline-block px-2 text-sm font-bold tracking-wide text-foreground md:text-base">
                  The Challenge
                </span>
              </PointerHighlight>
              <h2 className="text-balance text-4xl font-bold tracking-tight md:text-6xl">
                Hiring is slow and unreliable.
              </h2>
            </div>
            <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
              {problemCards.map((card) => (
                <div
                  key={card.title}
                  className="group relative border-2 border-dashed border-neutral-400 bg-neutral-50 p-6 transition-all hover:border-neutral-500 hover:bg-neutral-100 dark:border-neutral-700 dark:bg-neutral-900/50 dark:hover:border-neutral-600 dark:hover:bg-neutral-900"
                >
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

      <section
        id="solution"
        className="relative border-b border-border bg-white py-32 dark:bg-zinc-950 overflow-hidden"
      >
        <div className="absolute inset-0 bg-linear-to-b from-white to-neutral-50 dark:from-zinc-950 dark:to-zinc-900/50" />

        <div className="mx-auto max-w-6xl px-6 relative z-10">
          <div className="mb-24 md:text-center max-w-3xl mx-auto">
            <PointerHighlight
              containerClassName="mb-6 md:mx-auto"
              rectangleClassName="bg-indigo-100 dark:bg-indigo-900 border-indigo-300 dark:border-indigo-700 leading-loose"
              pointerClassName="text-indigo-500 h-3 w-3"
            >
              <span className="relative z-10 inline-block px-2 text-sm font-bold tracking-wide text-foreground md:text-base font-mono">
                THE PROCESS
              </span>
            </PointerHighlight>
            <h2 className="text-balance font-bold text-4xl md:text-6xl tracking-tight mt-6 leading-tight">
              Hire better engineers.
              <br />
              <span className="text-neutral-400 dark:text-neutral-600">
                Without the guesswork.
              </span>
            </h2>
          </div>

          <div className="relative space-y-24 md:space-y-32">
            {/* Connecting Line */}
            <div className="absolute left-4 md:left-1/2 top-4 bottom-4 w-px bg-linear-to-b from-transparent via-neutral-200 to-transparent dark:via-neutral-800 hidden md:block" />

            {/* Step 1: Post & Collect */}
            <div className="relative grid md:grid-cols-2 gap-12 md:gap-24 items-center">
              <div className="md:text-right">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 font-mono font-bold text-lg mb-6 shadow-xs border border-orange-200 dark:border-orange-800/50">
                  01
                </div>
                <h3 className="text-3xl font-bold tracking-tight mb-4">
                  Centralize Everything
                </h3>
                <p className="text-lg text-neutral-600 dark:text-neutral-400 leading-relaxed">
                  Forget scattered emails and spreadsheets. Create a beautiful
                  job post, collect resumes, GitHub profiles, and portfolios in
                  one unified dashboard.
                </p>
              </div>

              <div className="relative">
                <div className="absolute left-0 top-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-white border-4 border-orange-500 z-20 hidden md:block shadow-[0_0_0_4px_rgba(255,255,255,1)] dark:bg-zinc-950 dark:shadow-[0_0_0_4px_rgba(9,9,11,1)]" />
                <motion.div
                  initial={{ opacity: 0, x: 50 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true, margin: "-100px" }}
                  transition={{ duration: 0.7 }}
                  className="relative rounded-2xl border border-neutral-200 bg-white/50 p-2 shadow-2xl backdrop-blur-xl dark:border-neutral-800 dark:bg-neutral-900/50"
                >
                  <div className="absolute -top-10 -right-10 w-40 h-40 bg-orange-500/10 rounded-full blur-3xl -z-10" />
                  <div className="rounded-xl border border-neutral-100 bg-white overflow-hidden dark:border-neutral-800 dark:bg-neutral-950">
                    <div className="flex items-center gap-2 border-b border-neutral-100 bg-neutral-50/50 px-4 py-3 dark:border-neutral-800 dark:bg-neutral-900">
                      <div className="flex gap-1.5">
                        <div className="w-2.5 h-2.5 rounded-full bg-red-400/80" />
                        <div className="w-2.5 h-2.5 rounded-full bg-yellow-400/80" />
                        <div className="w-2.5 h-2.5 rounded-full bg-green-400/80" />
                      </div>
                      <div className="mx-auto h-2 w-32 rounded-full bg-neutral-200 dark:bg-neutral-800" />
                    </div>
                    <div className="p-6 space-y-4">
                      {["Sarah J.", "David K.", "Alex M."].map((name, i) => (
                        <motion.div
                          key={name}
                          initial={{ opacity: 0, y: 10 }}
                          whileInView={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.2 + i * 0.1 }}
                          className="flex items-center gap-4 rounded-lg border border-neutral-100 p-3 shadow-xs dark:border-neutral-800 dark:bg-neutral-900/50"
                        >
                          <div
                            className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                              i === 0
                                ? "bg-orange-100 text-orange-700"
                                : i === 1
                                  ? "bg-blue-100 text-blue-700"
                                  : "bg-purple-100 text-purple-700"
                            }`}
                          >
                            {name[0]}
                          </div>
                          <div className="space-y-1.5 flex-1">
                            <div className="h-2 w-24 rounded-full bg-neutral-200 dark:bg-neutral-800" />
                            <div className="h-1.5 w-16 rounded-full bg-neutral-100 dark:bg-neutral-800" />
                          </div>
                          <div className="w-16 h-6 rounded-md bg-neutral-100 flex items-center justify-center text-[10px] font-mono text-neutral-500 dark:bg-neutral-800">
                            APPLIED
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                </motion.div>
              </div>
            </div>

            {/* Step 2: AI Scoring */}
            <div className="relative grid md:grid-cols-2 gap-12 md:gap-24 items-center">
              <div className="relative order-2 md:order-1">
                <div className="absolute right-0 top-1/2 -translate-x-[-50%] -translate-y-1/2 w-4 h-4 rounded-full bg-white border-4 border-violet-500 z-20 hidden md:block shadow-[0_0_0_4px_rgba(255,255,255,1)] dark:bg-zinc-950 dark:shadow-[0_0_0_4px_rgba(9,9,11,1)]" />
                <motion.div
                  initial={{ opacity: 0, x: -50 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true, margin: "-100px" }}
                  transition={{ duration: 0.7 }}
                  className="relative rounded-2xl border border-neutral-200 bg-white/50 p-2 shadow-2xl backdrop-blur-xl dark:border-neutral-800 dark:bg-neutral-900/50"
                >
                  <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-violet-500/10 rounded-full blur-3xl -z-10" />
                  <div className="rounded-xl border border-neutral-100 bg-white overflow-hidden dark:border-neutral-800 dark:bg-neutral-950 p-6 md:p-8">
                    <div className="flex items-start justify-between mb-8">
                      <div className="flex gap-4">
                        <div className="w-12 h-12 rounded-full bg-neutral-100 dark:bg-neutral-800" />
                        <div className="space-y-2">
                          <div className="h-3 w-32 rounded-full bg-neutral-200 dark:bg-neutral-800" />
                          <div className="h-2 w-20 rounded-full bg-neutral-100 dark:bg-neutral-800" />
                        </div>
                      </div>
                      <div className="flex flex-col items-end">
                        <span className="text-3xl font-bold text-violet-600 font-mono">
                          85%
                        </span>
                        <span className="text-xs font-bold text-violet-400 tracking-wider">
                          MATCH SCORE
                        </span>
                      </div>
                    </div>

                    <div className="space-y-4">
                      {/* Skills match with job */}
                      <div className="space-y-2">
                        <div className="flex justify-between text-xs font-semibold text-neutral-500">
                          <span>Skills match with job</span>
                          <span>20/30</span>
                        </div>
                        <div className="h-2 w-full bg-neutral-100 rounded-full overflow-hidden dark:bg-neutral-800">
                          <motion.div
                            initial={{ width: 0 }}
                            whileInView={{ width: "66%" }}
                            transition={{ duration: 1, delay: 0.5 }}
                            className="h-full bg-violet-500"
                          />
                        </div>
                      </div>

                      {/* Project complexity */}
                      <div className="space-y-2">
                        <div className="flex justify-between text-xs font-semibold text-neutral-500">
                          <span>Project complexity</span>
                          <span>20/25</span>
                        </div>
                        <div className="h-2 w-full bg-neutral-100 rounded-full overflow-hidden dark:bg-neutral-800">
                          <motion.div
                            initial={{ width: 0 }}
                            whileInView={{ width: "80%" }}
                            transition={{ duration: 1, delay: 0.6 }}
                            className="h-full bg-violet-400"
                          />
                        </div>
                      </div>

                      {/* Real-world impact */}
                      <div className="space-y-2">
                        <div className="flex justify-between text-xs font-semibold text-neutral-500">
                          <span>Real-world impact</span>
                          <span>20/20</span>
                        </div>
                        <div className="h-2 w-full bg-neutral-100 rounded-full overflow-hidden dark:bg-neutral-800">
                          <motion.div
                            initial={{ width: 0 }}
                            whileInView={{ width: "100%" }}
                            transition={{ duration: 1, delay: 0.7 }}
                            className="h-full bg-violet-300"
                          />
                        </div>
                      </div>

                      {/* GitHub quality */}
                      <div className="space-y-2">
                        <div className="flex justify-between text-xs font-semibold text-neutral-500">
                          <span>GitHub quality</span>
                          <span>15/15</span>
                        </div>
                        <div className="h-2 w-full bg-neutral-100 rounded-full overflow-hidden dark:bg-neutral-800">
                          <motion.div
                            initial={{ width: 0 }}
                            whileInView={{ width: "100%" }}
                            transition={{ duration: 1, delay: 0.8 }}
                            className="h-full bg-violet-200"
                          />
                        </div>
                      </div>

                      {/* Resume clarity */}
                      <div className="space-y-2">
                        <div className="flex justify-between text-xs font-semibold text-neutral-500">
                          <span>Resume clarity</span>
                          <span>10/10</span>
                        </div>
                        <div className="h-2 w-full bg-neutral-100 rounded-full overflow-hidden dark:bg-neutral-800">
                          <motion.div
                            initial={{ width: 0 }}
                            whileInView={{ width: "100%" }}
                            transition={{ duration: 1, delay: 0.9 }}
                            className="h-full bg-violet-100"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              </div>

              <div className="order-1 md:order-2">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400 font-mono font-bold text-lg mb-6 shadow-xs border border-violet-200 dark:border-violet-800/50">
                  02
                </div>
                <h3 className="text-3xl font-bold tracking-tight mb-4">
                  Instant AI Analysis
                </h3>
                <p className="text-lg text-neutral-600 dark:text-neutral-400 leading-relaxed">
                  Every application is automatically analyzed. We score
                  candidates from 0-100 based on your job requirements,
                  identifying key strengths and missing skills instantly.
                </p>
              </div>
            </div>

            {/* Step 3: Match & Hire */}
            <div className="relative grid md:grid-cols-2 gap-12 md:gap-24 items-center">
              <div className="md:text-right">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 font-mono font-bold text-lg mb-6 shadow-xs border border-emerald-200 dark:border-emerald-800/50">
                  03
                </div>
                <h3 className="text-3xl font-bold tracking-tight mb-4">
                  Fast-Track Hiring
                </h3>
                <p className="text-lg text-neutral-600 dark:text-neutral-400 leading-relaxed">
                  Focus only on the top 5% of candidates. Filter by score,
                  skills, or experience. Move candidates through your pipeline
                  in minutes, not days.
                </p>
              </div>

              <div className="relative">
                <div className="absolute left-0 top-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-white border-4 border-emerald-500 z-20 hidden md:block shadow-[0_0_0_4px_rgba(255,255,255,1)] dark:bg-zinc-950 dark:shadow-[0_0_0_4px_rgba(9,9,11,1)]" />
                <motion.div
                  initial={{ opacity: 0, x: 50 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true, margin: "-100px" }}
                  transition={{ duration: 0.7 }}
                  className="relative rounded-2xl border border-neutral-200 bg-white/50 p-2 shadow-2xl backdrop-blur-xl dark:border-neutral-800 dark:bg-neutral-900/50"
                >
                  <div className="absolute -top-10 -left-10 w-40 h-40 bg-emerald-500/10 rounded-full blur-3xl -z-10" />
                  <div className="rounded-xl border border-neutral-100 bg-white overflow-hidden dark:border-neutral-800 dark:bg-neutral-950 p-1">
                    <div className="grid gap-1">
                      {[1, 2, 3].map((_, i) => (
                        <div
                          key={i}
                          className={`flex items-center justify-between p-3 rounded-lg ${i === 0 ? "bg-emerald-50/50 border border-emerald-100 dark:bg-emerald-900/10 dark:border-emerald-900/30" : "opacity-40 grayscale"}`}
                        >
                          <div className="flex items-center gap-3">
                            <div className="h-4 w-4 rounded border border-neutral-200 dark:border-neutral-700" />
                            <div className="h-2 w-24 rounded-full bg-neutral-200 dark:bg-neutral-800" />
                          </div>
                          <div
                            className={`px-2 py-1 rounded text-[10px] font-bold ${i === 0 ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-400" : "bg-neutral-100 text-neutral-400"}`}
                          >
                            {i === 0 ? "HIRED" : "REJECTED"}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </motion.div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <HowItWorksSection />

      {/* Differentiation Section */}
      <section className="relative border-b border-border bg-white py-32 dark:bg-zinc-950 overflow-hidden">
        <div className="absolute inset-0 bg-linear-to-b from-white via-neutral-50/30 to-white dark:from-zinc-950 dark:via-zinc-900/30 dark:to-zinc-950" />

        <div className="mx-auto max-w-5xl px-6 relative z-10">
          <div className="mb-16 text-center max-w-2xl mx-auto">
            <PointerHighlight
              containerClassName="mb-6 mx-auto"
              rectangleClassName="bg-rose-100 dark:bg-rose-900 border-rose-300 dark:border-rose-700 leading-loose"
              pointerClassName="text-rose-500 h-3 w-3"
            >
              <span className="relative z-10 inline-block px-2 text-sm font-bold tracking-wide text-foreground md:text-base font-mono">
                WHY ORIZENFLOW
              </span>
            </PointerHighlight>
            <h2 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">
              Hiring, evolved.
            </h2>
            <p className="text-lg text-neutral-600 dark:text-neutral-400">
              See the difference evidence-based hiring makes.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-neutral-200 dark:border-neutral-800">
                  <th className="text-left py-6 px-6 text-neutral-500 dark:text-neutral-400 font-medium text-sm">
                    Capability
                  </th>
                  <th className="text-center py-6 px-6 text-neutral-400 dark:text-neutral-500 font-medium text-sm">
                    Traditional Hiring
                  </th>
                  <th className="text-center py-6 px-6 bg-blue-50 dark:bg-blue-900/20 rounded-t-xl">
                    <span className="text-blue-700 dark:text-blue-400 font-bold text-sm">
                      OrizenFlow
                    </span>
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-neutral-100 dark:border-neutral-800/50">
                  <td className="py-5 px-6 text-neutral-700 dark:text-neutral-300 font-medium">
                    Candidate Evidence
                  </td>
                  <td className="py-5 px-6 text-center text-neutral-500 dark:text-neutral-400">
                    Resume only
                  </td>
                  <td className="py-5 px-6 text-center bg-blue-50/50 dark:bg-blue-900/10">
                    <span className="inline-flex items-center gap-1.5 text-blue-700 dark:text-blue-400 font-semibold text-sm">
                      <svg
                        className="w-4 h-4"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                      Resume + GitHub + Portfolio
                    </span>
                  </td>
                </tr>
                <tr className="border-b border-neutral-100 dark:border-neutral-800/50">
                  <td className="py-5 px-6 text-neutral-700 dark:text-neutral-300 font-medium">
                    Screening
                  </td>
                  <td className="py-5 px-6 text-center text-neutral-500 dark:text-neutral-400">
                    Manual review
                  </td>
                  <td className="py-5 px-6 text-center bg-blue-50/50 dark:bg-blue-900/10">
                    <span className="inline-flex items-center gap-1.5 text-blue-700 dark:text-blue-400 font-semibold text-sm">
                      <svg
                        className="w-4 h-4"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                      AI auto-scored
                    </span>
                  </td>
                </tr>
                <tr className="border-b border-neutral-100 dark:border-neutral-800/50">
                  <td className="py-5 px-6 text-neutral-700 dark:text-neutral-300 font-medium">
                    Candidate Ranking
                  </td>
                  <td className="py-5 px-6 text-center text-neutral-500 dark:text-neutral-400">
                    By application date
                  </td>
                  <td className="py-5 px-6 text-center bg-blue-50/50 dark:bg-blue-900/10">
                    <span className="inline-flex items-center gap-1.5 text-blue-700 dark:text-blue-400 font-semibold text-sm">
                      <svg
                        className="w-4 h-4"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                      By job fit score
                    </span>
                  </td>
                </tr>
                <tr className="border-b border-neutral-100 dark:border-neutral-800/50">
                  <td className="py-5 px-6 text-neutral-700 dark:text-neutral-300 font-medium">
                    Insights
                  </td>
                  <td className="py-5 px-6 text-center text-neutral-500 dark:text-neutral-400">
                    Basic contact info
                  </td>
                  <td className="py-5 px-6 text-center bg-blue-50/40 dark:bg-blue-900/10 rounded-b-xl">
                    <span className="inline-flex items-center gap-1.5 text-blue-700 dark:text-blue-400 font-semibold text-sm">
                      <svg
                        className="w-4 h-4"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                      Skills, strengths, weaknesses
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section
        id="features"
        className="relative border-b border-border bg-neutral-50/50 py-32 dark:bg-zinc-950/50 overflow-hidden"
      >
        <div className="mx-auto max-w-7xl px-6 relative z-10">
          <div className="mb-20 max-w-3xl">
            <PointerHighlight
              containerClassName="mb-6"
              rectangleClassName="bg-violet-100 dark:bg-violet-900 border-violet-300 dark:border-violet-700 leading-loose"
              pointerClassName="text-violet-500 h-3 w-3"
            >
              <span className="relative z-10 inline-block px-2 text-sm font-bold tracking-wide text-foreground md:text-base font-mono">
                WHAT YOU GET
              </span>
            </PointerHighlight>
            <h2 className="text-balance text-4xl font-bold tracking-tight md:text-6xl mt-4 mb-6">
              The complete hiring OS.
            </h2>
            <p className="text-xl text-neutral-600 dark:text-neutral-400 max-w-2xl leading-relaxed">
              Replace your scattered spreadsheets and email chains with one
              powerful command center.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-6 gap-6">
            {/* Feature 1: The Command Center (Dashboard) */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="md:col-span-4 group relative overflow-hidden rounded-3xl border border-neutral-200 bg-white p-8 shadow-sm dark:border-neutral-800 dark:bg-zinc-900"
            >
              <div className="absolute top-0 right-0 w-64 h-64 bg-violet-100/50 rounded-full blur-3xl -z-10 dark:bg-violet-900/10" />

              <div className="flex flex-col h-full justify-between">
                <div className="mb-8">
                  <h3 className="text-2xl font-bold mb-2">Command Center</h3>
                  <p className="text-neutral-500 dark:text-neutral-400">
                    Manage all your open roles and active candidates in one
                    high-density view.
                  </p>
                </div>

                {/* Micro-UI: Dashboard Table */}
                <div className="relative rounded-xl border border-neutral-200 bg-neutral-50 overflow-hidden shadow-sm dark:border-neutral-800 dark:bg-neutral-950/50">
                  <div className="flex items-center gap-2 border-b border-neutral-200 bg-white px-4 py-3 dark:border-neutral-800 dark:bg-neutral-900">
                    <div className="h-2.5 w-2.5 rounded-full bg-red-400/80" />
                    <div className="h-2.5 w-2.5 rounded-full bg-yellow-400/80" />
                    <div className="h-2.5 w-2.5 rounded-full bg-green-400/80" />
                  </div>
                  <div className="p-4 space-y-3">
                    {[
                      {
                        role: "Senior Frontend Engineer",
                        count: 124,
                        status: "Active",
                      },
                      { role: "Product Designer", count: 48, status: "Review" },
                      { role: "Backend Developer", count: 12, status: "Draft" },
                    ].map((job, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between p-3 bg-white rounded-lg border border-neutral-100 shadow-xs dark:bg-neutral-900 dark:border-neutral-800"
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-2 h-2 rounded-full ${i === 0 ? "bg-green-500" : i === 1 ? "bg-green-500" : "bg-neutral-300"}`}
                          />
                          <span className="font-semibold text-sm">
                            {job.role}
                          </span>
                        </div>
                        <div className="flex items-center gap-4">
                          <span className="text-xs text-neutral-500 font-mono bg-neutral-100 px-2 py-1 rounded dark:bg-neutral-800">
                            {job.count} Applications
                          </span>
                          <div className="w-6 h-6 rounded-full border border-neutral-200 flex items-center justify-center text-neutral-400 dark:border-neutral-700">
                            <svg
                              className="w-3 h-3"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M9 5l7 7-7 7"
                              />
                            </svg>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Feature 2: Smart Filters */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="md:col-span-2 group relative overflow-hidden rounded-3xl border border-neutral-200 bg-white p-8 shadow-sm dark:border-neutral-800 dark:bg-zinc-900"
            >
              <div className="flex flex-col h-full">
                <div className="mb-6">
                  <h3 className="text-xl font-bold mb-2">Smart Filters</h3>
                  <p className="text-neutral-500 text-sm dark:text-neutral-400">
                    Drill down to the perfect match instantly.
                  </p>
                </div>

                {/* Micro-UI: Filter Chips */}
                <div className="flex-1 flex flex-col gap-3">
                  <div className="flex flex-wrap gap-2">
                    <div className="px-3 py-1.5 rounded-full bg-violet-100 text-violet-700 text-xs font-bold border border-violet-200 dark:bg-violet-900/30 dark:text-violet-300 dark:border-violet-800">
                      Score &gt; 90%
                    </div>
                    <div className="px-3 py-1.5 rounded-full bg-neutral-100 text-neutral-600 text-xs font-medium border border-neutral-200 dark:bg-neutral-800 dark:text-neutral-400 dark:border-neutral-700">
                      Remote
                    </div>
                  </div>
                  <div className="bg-neutral-50 border border-neutral-200 rounded-lg p-3 flex items-center gap-2 text-sm text-neutral-400 dark:bg-neutral-900 dark:border-neutral-800">
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                      />
                    </svg>
                    <span>React + Node.js...</span>
                  </div>
                  <div className="mt-auto">
                    <div className="flex items-center gap-3 p-2 rounded-lg bg-emerald-50 border border-emerald-100 dark:bg-emerald-900/20 dark:border-emerald-800">
                      <div className="w-8 h-8 rounded-full bg-emerald-200 flex items-center justify-center text-emerald-700 font-bold text-xs">
                        A
                      </div>
                      <div>
                        <div className="text-xs font-bold text-emerald-900 dark:text-emerald-400">
                          Alex M.
                        </div>
                        <div className="text-[10px] text-emerald-700 dark:text-emerald-500">
                          98% Match
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Feature 3: Action Pipeline */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
              className="md:col-span-2 group relative overflow-hidden rounded-3xl border border-neutral-200 bg-white p-8 shadow-sm dark:border-neutral-800 dark:bg-zinc-900"
            >
              <div className="absolute top-0 right-0 w-full h-full bg-linear-to-br from-violet-500/10 to-transparent dark:from-violet-600/20 pointer-events-none" />

              <div className="relative z-10 flex flex-col h-full">
                <div className="mb-6">
                  <h3 className="text-xl font-bold mb-2">Track Pipeline</h3>
                  <p className="text-neutral-500 text-sm dark:text-neutral-400">
                    Keep candidates organized across hiring stages.
                  </p>
                </div>

                {/* Micro-UI: Kanban Column */}
                <div className="flex-1 rounded-xl border border-neutral-200 bg-neutral-50 p-3 flex flex-col gap-2 dark:border-neutral-800 dark:bg-neutral-950/60">
                  <div className="text-[10px] font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider mb-1">
                    In Review
                  </div>
                  {[1, 2].map((_, i) => (
                    <div
                      key={i}
                      className="rounded-lg border border-neutral-200 bg-white p-3 shadow-sm flex items-center justify-between dark:border-neutral-800 dark:bg-neutral-900"
                    >
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-neutral-200 text-neutral-700 dark:bg-neutral-700 dark:text-neutral-200 flex items-center justify-center text-[10px]">
                          {i === 0 ? "JD" : "MK"}
                        </div>
                        <div className="h-1.5 w-12 rounded-full bg-neutral-200 dark:bg-neutral-700" />
                      </div>
                      <div
                        className={`w-2 h-2 rounded-full ${i === 0 ? "bg-violet-500" : "bg-orange-500"}`}
                      />
                    </div>
                  ))}
                  <div className="mt-2 rounded-lg border-2 border-dashed border-neutral-300 bg-white/60 p-2 text-center text-[10px] text-neutral-500 dark:border-neutral-700 dark:bg-neutral-900/40">
                    Next stage
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Feature 4: Custom Forms */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.3 }}
              className="md:col-span-4 group relative overflow-hidden rounded-3xl border border-neutral-200 bg-white p-8 shadow-sm dark:border-neutral-800 dark:bg-zinc-900"
            >
              <div className="grid md:grid-cols-2 gap-8 items-center h-full">
                <div>
                  <h3 className="text-2xl font-bold mb-4">Embed Anywhere</h3>
                  <p className="text-neutral-500 dark:text-neutral-400 mb-6 leading-relaxed">
                    Copy one line of code and get a fully functional, branded
                    application form on your existing careers page. No backend
                    required.
                  </p>

                  <div className="rounded-lg bg-zinc-950 p-4 font-mono text-xs text-neutral-400 border border-neutral-800 flex items-center justify-between shadow-inner">
                    <span>
                      <span className="text-violet-400">&lt;iframe</span>{" "}
                      <span className="text-neutral-300">src=</span>
                      <span className="text-green-400">"..."</span>{" "}
                      <span className="text-violet-400">/&gt;</span>
                    </span>
                    <span className="text-xs uppercase tracking-wider text-neutral-600 font-bold cursor-pointer hover:text-white transition-colors">
                      Copy
                    </span>
                  </div>
                </div>

                {/* Micro-UI: Form Preview */}
                <div className="relative h-48 md:h-full min-h-[200px] bg-neutral-50 rounded-xl border border-neutral-200 p-4 flex flex-col gap-3 shadow-sm dark:bg-neutral-900 dark:border-neutral-800">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-8 h-8 rounded bg-neutral-200 dark:bg-neutral-800" />
                    <div>
                      <div className="h-2 w-24 bg-neutral-200 rounded dark:bg-neutral-800 mb-1" />
                      <div className="h-1.5 w-16 bg-neutral-100 rounded dark:bg-neutral-800" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="h-8 w-full bg-white border border-neutral-200 rounded px-2 flex items-center text-xs text-neutral-300 dark:bg-neutral-950 dark:border-neutral-800">
                      Full Name
                    </div>
                    <div className="h-8 w-full bg-white border border-neutral-200 rounded px-2 flex items-center text-xs text-neutral-300 dark:bg-neutral-950 dark:border-neutral-800">
                      Email Address
                    </div>
                    <div className="h-20 w-full bg-white border border-neutral-200 rounded px-2 pt-2 text-xs text-neutral-300 dark:bg-neutral-950 dark:border-neutral-800">
                      Resume/CV
                    </div>
                  </div>
                  <div className="mt-auto h-8 w-full bg-black rounded text-white text-xs font-bold flex items-center justify-center dark:bg-white dark:text-black">
                    Submit Application
                  </div>

                  {/* Floating badge */}
                  <div className="absolute -top-3 -right-3 bg-green-100 text-green-700 text-[10px] font-bold px-2 py-1 rounded-full border border-green-200 shadow-sm dark:bg-green-900/30 dark:text-green-400 dark:border-green-800">
                    Active
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* 8-Card Features Section */}
      <section className="relative border-b border-border bg-neutral-50 py-24 dark:bg-zinc-950">
        <div className="mx-auto max-w-7xl px-6">
          <div className="mb-16 text-center max-w-3xl mx-auto">
            <PointerHighlight
              containerClassName="mb-6 mx-auto"
              rectangleClassName="bg-blue-100 dark:bg-blue-900 border-blue-300 dark:border-blue-700 leading-loose"
              pointerClassName="text-blue-500 h-3 w-3"
            >
              <span className="relative z-10 inline-block px-2 text-sm font-bold tracking-wide text-foreground md:text-base font-mono">
                FEATURES
              </span>
            </PointerHighlight>
            <h2 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">
              Everything you need to hire better.
            </h2>
            <p className="text-lg text-neutral-600 dark:text-neutral-400">
              Powerful features designed for technical hiring.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                icon: (
                  <svg
                    className="w-6 h-6"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                ),
                title: "Evidence-Based Evaluation",
                description:
                  "AI scores candidates based on skills, projects, and real-world impact—not just keywords.",
              },
              {
                icon: (
                  <svg
                    className="w-6 h-6"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                ),
                title: "Resume Parsing",
                description:
                  "Automatically extract skills, experience, and education from any resume format.",
              },
              {
                icon: (
                  <svg
                    className="w-6 h-6"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                    />
                  </svg>
                ),
                title: "AI Job Descriptions",
                description:
                  "Generate compelling job descriptions that attract the right candidates.",
              },
              {
                icon: (
                  <svg
                    className="w-6 h-6"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13 10V3L4 14h7v7l9-11h-7z"
                    />
                  </svg>
                ),
                title: "Candidate Intelligence",
                description:
                  "Enrich profiles with GitHub, LinkedIn, and portfolio data automatically.",
              },
              {
                icon: (
                  <svg
                    className="w-6 h-6"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                    />
                  </svg>
                ),
                title: "Hiring Recommendations",
                description:
                  "Get AI-powered suggestions on who to interview, reject, or advance.",
              },
              {
                icon: (
                  <svg
                    className="w-6 h-6"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"
                    />
                  </svg>
                ),
                title: "Candidate Ranking",
                description:
                  "Sort and filter candidates by match score, skills, and experience.",
              },
              {
                icon: (
                  <svg
                    className="w-6 h-6"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                ),
                title: "CSV Export",
                description:
                  "Export candidate data and scores to CSV for external analysis.",
              },
              {
                icon: (
                  <svg
                    className="w-6 h-6"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
                    />
                  </svg>
                ),
                title: "Frictionless Apply",
                description:
                  "One-click apply experience that increases candidate conversion rates.",
              },
            ].map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.05 }}
                className="group relative overflow-hidden rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm transition-all hover:shadow-md hover:border-neutral-300 dark:border-neutral-800 dark:bg-zinc-900"
              >
                <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
                  {feature.icon}
                </div>
                <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
                <p className="text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed">
                  {feature.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* <section className="border-b border-border bg-white py-24 dark:bg-zinc-950">
        <div className="mx-auto max-w-6xl px-6">
          <div className="mb-16">
            <PointerHighlight
              containerClassName="mb-5"
              rectangleClassName="bg-blue-100 dark:bg-blue-900 border-blue-300 dark:border-blue-700 leading-loose"
              pointerClassName="text-blue-500 h-3 w-3"
            >
              <span className="relative z-10 inline-block px-2 text-sm font-bold tracking-wide text-foreground md:text-base">
                Seamless Integration
              </span>
            </PointerHighlight>
            <h2 className="text-balance text-5xl font-bold tracking-tight md:text-6xl mt-4">
              Embed on your careers page.
            </h2>
            <p className="mt-6 max-w-2xl text-lg text-neutral-600 dark:text-neutral-400">
              Get the application form working on your website in seconds. Copy, paste, done.
            </p>
          </div>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-40px" }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="mx-auto max-w-2xl"
          >
            <div className="mx-auto w-full max-w-3xl px-3 py-4 sm:px-4">
              <div className="flex items-center justify-between mb-2">
                <div />
                <a
                  href={process.env.NEXT_PUBLIC_APP_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
                >
                  Powered by <span className="font-semibold">Orizen Flow</span>
                </a>
              </div>
              <Card className="border-2 border-slate-300/80 dark:border-slate-700/80">
                <CardHeader>
                  <CardTitle>
                    <Highlight className="text-foreground font-semibold from-emerald-200 to-emerald-300 dark:from-emerald-500/30 dark:to-emerald-600/30">
                      Apply for Senior Software Engineer
                    </Highlight>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <form className="space-y-8 rounded-xl bg-white p-6 dark:bg-muted/10 sm:p-8">
                   
                    <div className="space-y-6">
                      <div>
                        <h3 className="text-base font-semibold text-foreground">
                          Basic Information
                        </h3>
                        <p className="mt-1 text-sm text-muted-foreground">
                          Required fields to get started
                        </p>
                      </div>

                      <div className="space-y-4">
                        <div className="space-y-2">
                          <label className="block text-sm font-medium text-foreground">
                            Full name *
                          </label>
                          <input
                            type="text"
                            disabled
                            value="Sarah Johnson"
                            className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-700 rounded-lg bg-neutral-50 dark:bg-neutral-900 text-neutral-600 dark:text-neutral-400 text-sm"
                          />
                        </div>

                        <div className="space-y-2">
                          <label className="block text-sm font-medium text-foreground">
                            Email *
                          </label>
                          <input
                            type="email"
                            disabled
                            value="sarah.johnson@example.com"
                            className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-700 rounded-lg bg-neutral-50 dark:bg-neutral-900 text-neutral-600 dark:text-neutral-400 text-sm"
                          />
                        </div>

                        <div className="space-y-2">
                          <label className="block text-sm font-medium text-foreground">
                            Resume URL *
                          </label>
                          <input
                            type="text"
                            disabled
                            value="https://drive.google.com/file/d/1a2b3c4d5e6f7g8h9i0j/view"
                            className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-700 rounded-lg bg-neutral-50 dark:bg-neutral-900 text-neutral-600 dark:text-neutral-400 text-sm"
                          />
                          <p className="text-xs text-muted-foreground">
                            For Google Drive, set sharing to Anyone with link - Viewer.
                          </p>
                        </div>
                      </div>
                    </div>

                   
                    <div className="border-t-2 border-slate-200 dark:border-slate-700" />

                    
                    <div className="space-y-6">
                      <div>
                        <h3 className="text-base font-semibold text-foreground">
                          Additional Links
                        </h3>
                        <p className="mt-1 text-sm text-muted-foreground">
                          Optional - Help us learn more about your work
                        </p>
                      </div>

                      <div className="space-y-4">
                        <div className="grid gap-4 sm:grid-cols-2">
                          <div className="space-y-2">
                            <label className="block text-sm font-medium text-foreground">
                              LinkedIn
                            </label>
                            <input
                              type="text"
                              disabled
                              value="https://linkedin.com/in/sarahjohnson"
                              className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-700 rounded-lg bg-neutral-50 dark:bg-neutral-900 text-neutral-600 dark:text-neutral-400 text-sm"
                            />
                          </div>

                          <div className="space-y-2">
                            <label className="block text-sm font-medium text-foreground">
                              GitHub
                            </label>
                            <input
                              type="text"
                              disabled
                              value="https://github.com/sarahjohnson"
                              className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-700 rounded-lg bg-neutral-50 dark:bg-neutral-900 text-neutral-600 dark:text-neutral-400 text-sm"
                            />
                          </div>
                        </div>

                        <div className="space-y-2">
                          <label className="block text-sm font-medium text-foreground">
                            Portfolio / Website
                          </label>
                          <input
                            type="text"
                            disabled
                            value="https://sarahjohnson.dev"
                            className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-700 rounded-lg bg-neutral-50 dark:bg-neutral-900 text-neutral-600 dark:text-neutral-400 text-sm"
                          />
                        </div>
                      </div>
                    </div>

                    
                    <div className="border-t-2 border-slate-200 dark:border-slate-700" />

                   
                    <div className="space-y-6">
                      <div>
                        <h3 className="text-base font-semibold text-foreground">
                          Cover Letter
                        </h3>
                        <p className="mt-1 text-sm text-muted-foreground">
                          Optional - Tell us why you're interested
                        </p>
                      </div>

                      <div className="space-y-2">
                        <textarea
                          disabled
                          value="I'm passionate about building scalable systems and have 5+ years of experience with TypeScript and React. Your company's mission to revolutionize hiring resonates deeply with me, and I'm excited about the opportunity to contribute to your team."
                          className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-700 rounded-lg bg-neutral-50 dark:bg-neutral-900 text-neutral-600 dark:text-neutral-400 text-sm resize-none"
                          rows={6}
                        />
                      </div>
                    </div>

                  
                    <Button
                      disabled
                      className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-medium py-2 rounded-lg transition-colors cursor-not-allowed"
                    >
                      Submit Application
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </div>
          </motion.div>
        </div>
      </section> */}

      <ProductPreviewSection />

      <Footer />
    </main>
  );
}
