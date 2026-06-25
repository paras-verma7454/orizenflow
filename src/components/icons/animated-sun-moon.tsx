"use client";

import { Moon, Sun } from "lucide-react";
import type { Transition, Variants } from "motion/react";
import { motion, useAnimation } from "motion/react";
import type { HTMLAttributes } from "react";
import { forwardRef, useCallback, useImperativeHandle, useRef } from "react";

import { cn } from "@/lib/utils";

export interface AnimatedSunHandle {
  startAnimation: () => void;
  stopAnimation: () => void;
}

export interface AnimatedMoonHandle {
  startAnimation: () => void;
  stopAnimation: () => void;
}

interface AnimatedSunProps extends HTMLAttributes<HTMLDivElement> {
  size?: number;
}

interface AnimatedMoonProps extends HTMLAttributes<HTMLDivElement> {
  size?: number;
}

const SUN_TRANSITION: Transition = {
  duration: 0.6,
  ease: [0.4, 0, 0.2, 1],
};

const SUN_VARIANTS: Variants = {
  normal: {
    rotate: 0,
  },
  animate: {
    rotate: 360,
  },
};

const MOON_TRANSITION: Transition = {
  duration: 0.5,
  ease: "easeInOut",
};

const MOON_VARIANTS: Variants = {
  normal: {
    rotate: 0,
  },
  animate: {
    rotate: [0, 10, -10, 0],
  },
};

const AnimatedSun = forwardRef<AnimatedSunHandle, AnimatedSunProps>(
  ({ onMouseEnter, onMouseLeave, className, size = 24, ...props }, ref) => {
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
      <motion.div
        className={cn("inline-flex", className)}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        animate={controls}
        initial="normal"
        transition={SUN_TRANSITION}
        variants={SUN_VARIANTS}
      >
        <Sun size={size} />
      </motion.div>
    );
  },
);

AnimatedSun.displayName = "AnimatedSun";

const AnimatedMoon = forwardRef<AnimatedMoonHandle, AnimatedMoonProps>(
  ({ onMouseEnter, onMouseLeave, className, size = 24, ...props }, ref) => {
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
      <motion.div
        className={cn("inline-flex", className)}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        animate={controls}
        initial="normal"
        transition={MOON_TRANSITION}
        variants={MOON_VARIANTS}
      >
        <Moon size={size} />
      </motion.div>
    );
  },
);

AnimatedMoon.displayName = "AnimatedMoon";

export { AnimatedSun, AnimatedMoon };
