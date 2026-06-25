"use client";

import { ShieldUser } from "lucide-react";
import type { Transition, Variants } from "motion/react";
import { motion, useAnimation } from "motion/react";
import type { HTMLAttributes } from "react";
import { forwardRef, useCallback, useImperativeHandle, useRef } from "react";

import { cn } from "@/lib/utils";

export interface AnimatedLayoutDashboardHandle {
  startAnimation: () => void;
  stopAnimation: () => void;
}

export interface AnimatedUserHandle {
  startAnimation: () => void;
  stopAnimation: () => void;
}

export interface AnimatedShieldUserHandle {
  startAnimation: () => void;
  stopAnimation: () => void;
}

interface AnimatedLayoutDashboardProps extends HTMLAttributes<HTMLDivElement> {
  size?: number;
}

interface AnimatedUserProps extends HTMLAttributes<HTMLDivElement> {
  size?: number;
}

interface AnimatedShieldUserProps extends HTMLAttributes<HTMLDivElement> {
  size?: number;
}

const DASHBOARD_VARIANTS = {
  rect1: {
    normal: { opacity: 1, translateY: 0 },
    animate: {
      opacity: [0, 1],
      translateY: [-5, 0],
      transition: {
        opacity: { duration: 0.5, times: [0.2, 1] },
        duration: 0.5,
      },
    },
  },
  rect2: {
    normal: { opacity: 1, translateX: 0 },
    animate: {
      opacity: [0, 1],
      translateX: [-10, 0],
      transition: {
        opacity: { duration: 0.7, times: [0.5, 1] },
        translateX: { delay: 0.3 },
        duration: 0.5,
      },
    },
  },
  rect3: {
    normal: { opacity: 1, translateX: 0 },
    animate: {
      opacity: [0, 1],
      translateX: [10, 0],
      transition: {
        opacity: { duration: 0.8, times: [0.5, 1] },
        translateX: { delay: 0.4 },
        duration: 0.5,
      },
    },
  },
};

const USER_PATH_VARIANT: Variants = {
  normal: { pathLength: 1, opacity: 1, pathOffset: 0 },
  animate: {
    pathLength: [0, 1],
    opacity: [0, 1],
    pathOffset: [1, 0],
  },
};

const USER_CIRCLE_VARIANT: Variants = {
  normal: {
    pathLength: 1,
    pathOffset: 0,
    scale: 1,
  },
  animate: {
    pathLength: [0, 1],
    pathOffset: [1, 0],
    scale: [0.5, 1],
  },
};

const SHIELD_TRANSITION: Transition = {
  duration: 0.6,
  ease: [0.4, 0, 0.2, 1],
};

const SHIELD_VARIANTS: Variants = {
  normal: {
    y: 0,
  },
  animate: {
    y: [0, -3, 0],
  },
};

const AnimatedLayoutDashboard = forwardRef<
  AnimatedLayoutDashboardHandle,
  AnimatedLayoutDashboardProps
>(({ onMouseEnter, onMouseLeave, className, size = 28, ...props }, ref) => {
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
      <svg
        fill="none"
        height={size}
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
        viewBox="0 0 24 24"
        width={size}
        xmlns="http://www.w3.org/2000/svg"
      >
        <motion.rect
          animate={controls}
          height="7"
          initial="normal"
          rx="1"
          variants={DASHBOARD_VARIANTS.rect1}
          width="18"
          x="3"
          y="3"
        />
        <motion.rect
          animate={controls}
          height="7"
          initial="normal"
          rx="1"
          variants={DASHBOARD_VARIANTS.rect2}
          width="7"
          x="3"
          y="14"
        />
        <motion.rect
          animate={controls}
          height="7"
          initial="normal"
          rx="1"
          variants={DASHBOARD_VARIANTS.rect3}
          width="7"
          x="14"
          y="14"
        />
      </svg>
    </div>
  );
});

AnimatedLayoutDashboard.displayName = "AnimatedLayoutDashboard";

const AnimatedUser = forwardRef<AnimatedUserHandle, AnimatedUserProps>(
  ({ onMouseEnter, onMouseLeave, className, size = 28, ...props }, ref) => {
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
        <svg
          fill="none"
          height={size}
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
          viewBox="0 0 24 24"
          width={size}
          xmlns="http://www.w3.org/2000/svg"
        >
          <motion.circle
            animate={controls}
            cx="12"
            cy="8"
            r="5"
            initial="normal"
            variants={USER_CIRCLE_VARIANT}
          />
          <motion.path
            animate={controls}
            d="M20 21a8 8 0 0 0-16 0"
            initial="normal"
            transition={{
              delay: 0.2,
              duration: 0.4,
            }}
            variants={USER_PATH_VARIANT}
          />
        </svg>
      </div>
    );
  },
);

AnimatedUser.displayName = "AnimatedUser";

const AnimatedShieldUser = forwardRef<
  AnimatedShieldUserHandle,
  AnimatedShieldUserProps
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
    <motion.div
      className={cn("inline-flex", className)}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      animate={controls}
      initial="normal"
      transition={SHIELD_TRANSITION}
      variants={SHIELD_VARIANTS}
    >
      <ShieldUser size={size} />
    </motion.div>
  );
});

AnimatedShieldUser.displayName = "AnimatedShieldUser";

export { AnimatedLayoutDashboard, AnimatedUser, AnimatedShieldUser };
