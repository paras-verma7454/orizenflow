"use client";

import { Briefcase } from "lucide-react";
import type { Transition, Variants } from "motion/react";
import { motion, useAnimation } from "motion/react";
import type { HTMLAttributes } from "react";
import { forwardRef, useCallback, useImperativeHandle, useRef } from "react";

import { cn } from "@/lib/utils";

export interface AnimatedBriefcaseHandle {
  startAnimation: () => void;
  stopAnimation: () => void;
}

interface AnimatedBriefcaseProps extends HTMLAttributes<HTMLDivElement> {
  size?: number;
}

const BRIEFCASE_TRANSITION: Transition = {
  duration: 0.5,
  ease: [0.4, 0, 0.2, 1],
};

const BRIEFCASE_VARIANTS: Variants = {
  normal: {
    rotate: 0,
    scale: 1,
  },
  animate: {
    rotate: [0, -5, 5, 0],
    scale: [1, 1.05, 1],
  },
};

const AnimatedBriefcase = forwardRef<
  AnimatedBriefcaseHandle,
  AnimatedBriefcaseProps
>(({ onMouseEnter, onMouseLeave, className, size = 24, ...props }, ref) => {
  const controls = useAnimation();
  const isControlledRef = useRef(false);

  useImperativeHandle(ref, () => {
    isControlledRef.current = true;

    return {
      startAnimation: () => controls.start("animate"),
      stopAnimation: () => controls.start("normal"),
    };
  });

  const handleMouseEnter = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (isControlledRef.current) {
        onMouseEnter?.(e);
      } else {
        controls.start("animate");
      }
    },
    [controls, onMouseEnter],
  );

  const handleMouseLeave = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (isControlledRef.current) {
        onMouseLeave?.(e);
      } else {
        controls.start("normal");
      }
    },
    [controls, onMouseLeave],
  );

  return (
    <div
      className={cn("inline-flex", className)}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      {...props}
    >
      <motion.div
        animate={controls}
        initial="normal"
        transition={BRIEFCASE_TRANSITION}
        variants={BRIEFCASE_VARIANTS}
      >
        <Briefcase size={size} />
      </motion.div>
    </div>
  );
});

AnimatedBriefcase.displayName = "AnimatedBriefcase";

export { AnimatedBriefcase };
