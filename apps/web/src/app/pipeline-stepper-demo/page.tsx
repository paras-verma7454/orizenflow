"use client";

import { useState } from "react";

import { PipelineStepper } from "@/components/pipeline-stepper";

const candidateSteps = [
  "Applied",
  "Screening",
  "Interview",
  "Offer",
  "Hired",
  "Rejected",
];

const crmSteps = [
  "Needs Analysis",
  "Value Proposition",
  "Id. Decision Makers",
  "Perception Analysis",
  "Proposal/Price Quote",
  "Negotiation/Review",
  "Closed",
];

export default function PipelineStepperDemoPage() {
  const [candidateStep, setCandidateStep] = useState(2);

  const [crmStep, setCrmStep] = useState(1);

  return (
    <main className="min-h-screen bg-[#0b1220] p-6 text-slate-100">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-8">
        <section className="space-y-2">
          <h1 className="text-xl font-semibold">PipelineStepper Demo</h1>
          <p className="text-sm text-slate-300">
            CRM-style connected chevron pipeline with active/completed/inactive
            states.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-sm font-medium text-slate-300">
            Candidate Pipeline
          </h2>
          <PipelineStepper
            steps={candidateSteps}
            currentStep={candidateStep}
            onStepClick={setCandidateStep}
          />
        </section>

        <section className="space-y-2">
          <h2 className="text-sm font-medium text-slate-300">CRM Pipeline</h2>
          <PipelineStepper
            steps={crmSteps}
            currentStep={crmStep}
            onStepClick={setCrmStep}
          />
        </section>
      </div>
    </main>
  );
}
