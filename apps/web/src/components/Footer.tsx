"use client";

import { useRef } from "react";

import {
  AnimatedGithub,
  type GithubIconHandle,
} from "@/components/icons/animated-github";
import {
  AnimatedLinkedin,
  type LinkedinIconHandle,
} from "@/components/icons/animated-linkedin";

export function Footer() {
  const linkedinRef = useRef<LinkedinIconHandle>(null);
  const githubRef = useRef<GithubIconHandle>(null);

  const socialLinks = [
    {
      label: "Twitter",
      href: "https://x.com/ParasVerma7454",
      icon: (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="currentColor"
        >
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
        </svg>
      ),
    },
    {
      label: "GitHub",
      href: "https://github.com/paras-verma7454/orizenflow",
      icon: <AnimatedGithub ref={githubRef} className="size-4.5" size={18} />,
      iconRef: githubRef,
    },
    {
      label: "LinkedIn",
      href: "https://www.linkedin.com/in/paras-vermaa",
      icon: (
        <AnimatedLinkedin ref={linkedinRef} className="size-4.5" size={18} />
      ),
      iconRef: linkedinRef,
    },
    {
      label: "Email",
      href: "mailto:paras@orizenflow.luffytaro.me",
      icon: (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <rect width="20" height="16" x="2" y="4" rx="2" />
          <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
        </svg>
      ),
    },
  ];

  return (
    <footer className="border-t border-border bg-zinc-50 dark:bg-neutral-950">
      <div className="mx-auto max-w-6xl px-6">
        <div className="flex flex-col items-center justify-between gap-10 py-14 md:flex-row md:items-start">
          <div className="flex flex-col items-center gap-3 md:items-start">
            <div className="flex items-center gap-3">
              <div className="h-5 w-1 rounded-full bg-emerald-500" />
              <span className="text-xl font-bold tracking-tight text-foreground">
                Orizen Flow
              </span>
            </div>
            <p className="text-sm font-light italic text-muted-foreground">
              Evidence-based hiring CRM
            </p>
          </div>

          <div className="flex flex-col items-center gap-4 md:items-end">
            <span className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
              Connect
            </span>
            <div className="flex items-center gap-3">
              {socialLinks.map((link) => (
                <a
                  key={link.label}
                  href={link.href}
                  aria-label={link.label}
                  className="flex size-9 items-center justify-center rounded-lg border border-neutral-200 text-muted-foreground transition-all duration-200 hover:-translate-y-0.5 hover:border-neutral-300 hover:text-foreground hover:shadow-[0_4px_12px_rgba(0,0,0,0.08)] dark:border-neutral-800 dark:hover:border-neutral-700 dark:hover:text-white dark:hover:shadow-[0_4px_12px_rgba(0,0,0,0.4)]"
                  onMouseEnter={() => link.iconRef?.current?.startAnimation?.()}
                  onMouseLeave={() => link.iconRef?.current?.stopAnimation?.()}
                >
                  {link.icon}
                </a>
              ))}
            </div>
          </div>
        </div>

        <div className="flex flex-col items-center justify-between gap-4 border-t border-border py-6 md:flex-row">
          <span className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} Orizen Flow. All rights reserved.
          </span>
          <a
            href="/privacy"
            className="text-xs text-muted-foreground transition-colors duration-200 hover:text-foreground"
          >
            Privacy Policy
          </a>
        </div>
      </div>
    </footer>
  );
}
