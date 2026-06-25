"use client";
import React from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

export const BoxesCore = ({ className, ...rest }: { className?: string }) => {
  const rows = new Array(30).fill(1);
  const cols = new Array(30).fill(1);
  let colors = [
    "rgba(255,165,0,0.6)", // Vibrant Orange
    "rgba(128,128,128,0.4)", // Visible Gray
    "rgba(255,165,0,0.4)",
    "rgba(59,130,246,0.4)", // Subtle Blue accent
  ];
  const getRandomColor = () => {
    return colors[Math.floor(Math.random() * colors.length)];
  };

  return (
    <div
      style={{
        transform: `translate(-50%,-50%) skewX(-48deg) skewY(14deg) scale(1) rotate(0deg) translateZ(0)`,
        willChange: "transform",
      }}
      className={cn(
        "absolute top-1/2 left-1/2 flex h-[200vh] w-[200vw] p-4",
        className,
      )}
      {...rest}
    >
      {rows.map((_, i) => (
        <motion.div
          key={`row` + i}
          className="relative h-40 w-80 border-l border-neutral-300 dark:border-neutral-700"
        >
          {cols.map((_, j) => (
            <motion.div
              whileHover={{
                backgroundColor: getRandomColor(),
                transition: { duration: 0 },
              }}
              animate={{
                transition: { duration: 1 },
              }}
              key={`col` + j}
              className="relative h-40 w-80 border-t border-r border-neutral-300 dark:border-neutral-700"
            >
              {j % 4 === 0 && i % 4 === 0 ? (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth="1.5"
                  stroke="currentColor"
                  className="pointer-events-none absolute -top-[14px] -left-[22px] h-6 w-10 stroke-[1px] text-neutral-400 dark:text-neutral-600"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 6v12m6-6H6"
                  />
                </svg>
              ) : null}
            </motion.div>
          ))}
        </motion.div>
      ))}
    </div>
  );
};

export const Boxes = React.memo(BoxesCore);
