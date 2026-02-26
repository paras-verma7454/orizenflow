export function Footer() {
  const socialLinks = [
    {
      label: "Twitter",
      href: "https://x.com",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
      ),
    },
    {
      label: "LinkedIn",
      href: "https://www.linkedin.com/in/paras-vermaa",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
      ),
    },
    {
      label: "Email",
      href: "mailto:paras@orizenflow.luffytaro.me",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>
      ),
    },
  ]

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
  )
}
