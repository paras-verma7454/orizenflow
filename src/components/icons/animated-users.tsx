"use client";

import { Users } from "lucide-react";
import type { Transition, Variants } from "motion/react";
import { motion, useAnimation } from "motion/react";
import type { HTMLAttributes } from "react";
import { forwardRef, useCallback, useImperativeHandle, useRef } from "react";

import { cn } from "@/lib/utils";

export interface AnimatedUsersHandle {
  startAnimation: () => void;
  stopAnimation: () => void;
}

interface AnimatedUsersProps extends HTMLAttributes<HTMLDivElement> {
  size?: number;
}

const USERS_TRANSITION: Transition = {
  duration: 0.6,
  ease: [0.4, 0, 0.2, 1],
};

const USERS_VARIANTS: Variants = {
  normal: {
    y: 0,
    opacity: 1,
  },
  animate: {
    y: [0, -4, 0],
    opacity: [1, 0.8, 1],
  },
};

const AnimatedUsers = forwardRef<AnimatedUsersHandle, AnimatedUsersProps>(
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
      <div
        className={cn("inline-flex", className)}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        {...props}
      >
        <motion.div
          animate={controls}
          initial="normal"
          transition={USERS_TRANSITION}
          variants={USERS_VARIANTS}
        >
          <Users size={size} />
        </motion.div>
      </div>
    );
  },
);

AnimatedUsers.displayName = "AnimatedUsers";

export { AnimatedUsers };
