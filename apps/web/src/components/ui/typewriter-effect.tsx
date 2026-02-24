"use client";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { motion, useInView } from "framer-motion";
import { cn } from "@/lib/utils";

export const TypewriterEffect = ({
  words,
  className,
  cursorClassName,
}: {
  words: {
    text: string;
    className?: string;
  }[];
  className?: string;
  cursorClassName?: string;
}) => {
  // split text into characters
  const wordsArray = words.map((word) => {
    return {
      ...word,
      text: word.text.split(""),
    };
  });

  const scope = useRef<HTMLDivElement>(null);
  const isInView = useInView(scope, { once: true });
  const totalChars = useMemo(
    () => wordsArray.reduce((sum, word) => sum + word.text.length, 0),
    [wordsArray]
  );
  const [typedChars, setTypedChars] = useState(0);

  useEffect(() => {
    if (!isInView) return;

    const timer = setInterval(() => {
      setTypedChars((prev) => {
        if (prev >= totalChars) {
          clearInterval(timer);
          return prev;
        }
        return prev + 1;
      });
    }, 55);

    return () => clearInterval(timer);
  }, [isInView, totalChars]);

  const renderWords = () => {
    let consumed = 0;

    return (
      <div ref={scope} className="inline">
        {wordsArray.map((word, idx) => {
          const visibleChars = Math.max(
            0,
            Math.min(word.text.length, typedChars - consumed)
          );
          consumed += word.text.length;

          if (visibleChars === 0) return null;

          return (
            <span key={`word-${idx}`} className="inline-block whitespace-nowrap mr-[0.25em]">
              {word.text.slice(0, visibleChars).map((char, index) => (
                <span key={`char-${index}`} className={cn("char text-foreground", word.className)}>
                  {char}
                </span>
              ))}
            </span>
          );
        })}
      </div>
    );
  };

  return (
    <div
      className={cn(
        "text-center leading-tight min-h-[7.5rem]", // Added min-h to prevent layout shift
        className
      )}
    >
      <span className="inline">
        {renderWords()}
        <motion.span
          animate={{
            opacity: [1, 0, 1],
          }}
          transition={{
            duration: 1,
            repeat: Infinity,
            repeatType: "loop",
            ease: "linear",
            times: [0, 0.5, 1],
          }}
          className={cn(
            "inline-block rounded-sm w-[3px] h-[0.9em] align-middle bg-foreground ml-1",
            cursorClassName
          )}
        />
      </span>
    </div>
  );
};
