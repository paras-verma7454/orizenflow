"use client";

import { useEffect } from "react";

export function HeightReporter() {
  useEffect(() => {
    const reportHeight = () => {
      const height = document.documentElement.scrollHeight;

      window.parent.postMessage(
        {
          type: "EMBED_HEIGHT",
          height,
        },
        "*",
      );
    };

    reportHeight();

    const observer = new MutationObserver(reportHeight);
    observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
      attributes: true,
    });

    window.addEventListener("resize", reportHeight);

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", reportHeight);
    };
  }, []);

  return null;
}
