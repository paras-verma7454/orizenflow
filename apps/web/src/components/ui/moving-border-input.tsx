"use client";
import React from "react";
import { cn } from "@/lib/utils";
import { MovingBorder } from "./moving-border"; // Assuming moving-border is in the same directory
import { Input } from "./input"; // Assuming input is in the same directory

export function MovingBorderInput({
  borderRadius = "1.75rem",
  children,
  containerClassName,
  borderClassName,
  duration, // This duration is for the inner moving div
  movingBorderDuration, // New prop for the MovingBorder component
  className,
  inputClassName,
  ...inputProps // Props for the actual input element
}: {
  borderRadius?: string;
  children?: React.ReactNode;
  containerClassName?: string;
  borderClassName?: string;
  duration?: number;
  movingBorderDuration?: number; // New prop
  className?: string;
  inputClassName?: string;
  [key: string]: any;
}) {
  return (
    <div
      className={cn(
        "relative h-14 w-full overflow-hidden bg-muted p-[2px]", // Increased padding to 2px, changed bg to bg-muted for base border
        containerClassName,
      )}
      style={{
        borderRadius: borderRadius,
      }}
    >
      <div
        className="absolute inset-0"
        style={{ borderRadius: `calc(${borderRadius} * 0.96)` }}
      >
        <MovingBorder duration={movingBorderDuration || duration} rx="30%" ry="30%">
          <div
            className={cn(
              "h-20 w-20 bg-[radial-gradient(var(--moving-border-color,var(--primary))_40%,transparent_60%)] opacity-[1]", // Full opacity
              borderClassName,
            )}
          />
        </MovingBorder>
      </div>

      <div
        className={cn(
          "relative flex h-full w-full items-center justify-center bg-white dark:bg-zinc-950 text-sm text-neutral-900 dark:text-neutral-100 antialiased backdrop-blur-xl", // Explicit light/dark colors
          className,
        )}
        style={{
          borderRadius: `calc(${borderRadius} * 0.96)`,
        }}
      >
        {/* Render the actual Input component here */}
        <Input
          className={cn(
            "h-full w-full rounded-full border-none bg-transparent px-6 text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-500 dark:placeholder:text-neutral-400 outline-none ring-0 focus:ring-0 focus-visible:ring-0",
            inputClassName
          )}
          {...inputProps}
        />
        {children} {/* Render children if any, typically not for a single input */}
      </div>
    </div>
  );
}
