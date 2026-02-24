"use client";

import { useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { PointerHighlight } from "@/components/ui/pointer-highlight";

const steps = [
  {
    step: "01",
    label: "Initialization",
    title: "Create Job",
    description: "Define stack, seniority, and role-specific expectations with objective criteria.",
  },
  {
    step: "02",
    label: "Acquisition",
    title: "Collect Applications",
    description: "Candidates submit resume and high-signal evidence links from GitHub or portfolios.",
  },
  {
    step: "03",
    label: "Verification",
    title: "Evaluate with AI",
    description: "Orizen Flow prioritizes strongest technical matches using verifiable evidence.",
  },
];

export function HowItWorksSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start 75%", "end 35%"],
  });
  const lineScaleY = useTransform(scrollYProgress, [0, 1], [0, 1]);

  return (
    <section
      ref={sectionRef}
      id="how-it-works"
      className="border-b border-border bg-neutral-50 py-32 dark:bg-zinc-950 overflow-x-hidden"
    >
      <div className="mx-auto max-w-6xl px-6">
        <div className="mb-24 text-center">
          <PointerHighlight
            containerClassName="mb-6 md:mx-auto"
            rectangleClassName="bg-amber-100 dark:bg-amber-900 border-amber-300 dark:border-amber-700 leading-loose"
            pointerClassName="text-amber-500 h-3 w-3"
          >
            <span className="relative z-10 inline-block px-2 text-sm font-bold tracking-widest uppercase text-foreground md:text-base">
              The Process
            </span>
          </PointerHighlight>
          <h2 className="text-balance font-serif text-5xl font-medium tracking-tight text-neutral-900 dark:text-neutral-50 md:text-7xl">
            From application to shortlist.
          </h2>
        </div>

        <div className="relative mx-auto max-w-4xl">
          {/* Vertical Progress Line */}
          <div className="absolute left-4 top-0 h-full w-[2px] bg-neutral-200 dark:bg-neutral-800 md:left-1/2 md:-ml-[1px]" />
          <motion.div
            className="absolute left-4 top-0 h-full w-[2px] origin-top bg-amber-500 md:left-1/2 md:-ml-[1px]"
            style={{ scaleY: lineScaleY }}
          />

          <div className="space-y-24 md:space-y-32">
            {steps.map((item, index) => {
              const isEven = index % 2 === 0;
              return (
                <div key={item.title} className="relative">
                  {/* Connection Dot - Positioned relative to the line */}
                  <div className="absolute left-[9px] top-10 z-20 size-[14px] rounded-full border-[3px] border-neutral-50 bg-amber-500 shadow-sm dark:border-zinc-950 md:left-1/2 md:-ml-[7px]" />

                  <div className={`flex flex-col md:flex-row ${isEven ? "md:flex-row" : "md:flex-row-reverse"}`}>
                    <div className="flex-1 pb-4 pl-12 md:pb-0 md:pl-0">
                      <div className={`relative flex flex-col ${isEven ? "md:items-end md:pr-8 md:text-right" : "md:items-start md:pl-8 md:text-left"}`}>
                        {/* Large background number */}
                        <motion.span 
                          initial={{ opacity: 0, scale: 0.9 }}
                          whileInView={{ opacity: 1, scale: 1 }}
                          viewport={{ once: true }}
                          transition={{ duration: 1, ease: "easeOut" }}
                          className={`absolute -top-1 z-0 pointer-events-none select-none font-mono text-[8rem] font-bold leading-none text-neutral-200/80 dark:text-neutral-800/40 md:text-[10rem] ${isEven ? "right-0 md:-left-24 md:right-auto" : "right-10 md:-right-24"}`}
                        >
                          {item.step}
                        </motion.span>

                        <div className="relative z-10">
                          <div className="mb-4 font-mono text-xs font-bold uppercase tracking-widest text-amber-600 dark:text-amber-500">
                            {item.label}
                          </div>
                          
                          <h3 className="mb-4 text-3xl font-bold text-neutral-900 dark:text-neutral-100 md:text-4xl">
                            {item.title}
                          </h3>
                          
                          <p className="max-w-md text-lg leading-relaxed text-neutral-600 dark:text-neutral-400">
                            {item.description}
                          </p>
                        </div>
                      </div>
                    </div>
                    {/* Empty spacer for the other side of the line on desktop */}
                    <div className="hidden flex-1 md:block" />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
