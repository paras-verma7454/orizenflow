"use client";

import { cn } from "@/lib/utils";

interface Props {
  steps: string[];
  currentStep: number;
  selectedStep?: number | null;
  onStepClick?: (index: number) => void;
  baseClassName?: string;
  activeClassName?: string;
  completedClassName?: string;
  selectedClassName?: string;
}

export function PipelineStepper({
  steps,
  currentStep,
  selectedStep = null,
  onStepClick,
  baseClassName,
  activeClassName,
  completedClassName,
  selectedClassName,
}: Props) {
  return (
    <div className="flex items-center gap-0 overflow-x-auto rounded-[40px]">
      {steps.map((step, index) => {
        const isActive = index === currentStep;
        const isCompleted = index < currentStep;
        const isSelected = selectedStep === index;

        return (
          <button
            key={step}
            type="button"
            onClick={() => onStepClick?.(index)}
            className={cn(
              "relative flex h-12 items-center justify-center whitespace-nowrap border-none px-10 text-sm font-medium text-slate-300 transition duration-200 cursor-pointer",
              baseClassName ?? "bg-slate-700 hover:brightness-110",
              "[clip-path:polygon(0_0,calc(100%-24px)_0,100%_50%,calc(100%-24px)_100%,0_100%,24px_50%)]",
              index === 0 &&
                "ml-0 rounded-l-[40px] pl-7 [clip-path:polygon(0_0,calc(100%-24px)_0,100%_50%,calc(100%-24px)_100%,0_100%)]",
              index > 0 && "-ml-5",
              index === steps.length - 1 &&
                "rounded-r-[40px] [clip-path:polygon(0_0,100%_0,100%_100%,0_100%,24px_50%)]",
              isCompleted && (completedClassName ?? "bg-green-600 text-white"),
              isActive &&
                (activeClassName ??
                  "bg-gradient-to-br from-blue-900 to-blue-600 text-white"),
              isSelected &&
                (selectedClassName ??
                  "bg-sky-700 text-white ring-2 ring-sky-300/70 ring-inset"),
            )}
            style={{ zIndex: steps.length - index }}
          >
            {step}
          </button>
        );
      })}
    </div>
  );
}
