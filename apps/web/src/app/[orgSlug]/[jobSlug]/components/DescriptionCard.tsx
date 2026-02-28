"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Highlight } from "@/components/ui/hero-highlight";
import { Separator } from "@/components/ui/separator";

interface DescriptionCardProps {
  description: string;
}

export function DescriptionCard({ description }: DescriptionCardProps) {
  return (
    <Card className="border-2 border-slate-300/80 dark:border-slate-700/80">
      <CardHeader>
        <CardTitle>
          <Highlight className="text-foreground font-semibold from-amber-200 to-amber-300 dark:from-amber-500/30 dark:to-amber-600/30">
            Job description
          </Highlight>
        </CardTitle>
      </CardHeader>
      <Separator />
      <CardContent>
        <div className="space-y-3 text-sm leading-7 text-foreground/90">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              h1: ({ children }) => (
                <h1 className="text-xl font-semibold text-foreground">
                  {children}
                </h1>
              ),
              h2: ({ children }) => (
                <h2 className="text-lg font-semibold text-foreground">
                  {children}
                </h2>
              ),
              h3: ({ children }) => (
                <h3 className="text-base font-semibold text-foreground">
                  {children}
                </h3>
              ),
              p: ({ children }) => (
                <p className="text-sm leading-7 text-foreground/90">
                  {children}
                </p>
              ),
              ul: ({ children }) => (
                <ul className="list-disc space-y-1 pl-5">{children}</ul>
              ),
              ol: ({ children }) => (
                <ol className="list-decimal space-y-1 pl-5">{children}</ol>
              ),
              li: ({ children }) => (
                <li className="text-sm leading-7">{children}</li>
              ),
              a: ({ href, children }) => (
                <a
                  href={href}
                  target="_blank"
                  rel="noreferrer"
                  className="text-accent underline underline-offset-2"
                >
                  {children}
                </a>
              ),
              code: ({ children }) => (
                <code className="rounded bg-muted px-1 py-0.5 font-mono text-xs text-foreground">
                  {children}
                </code>
              ),
            }}
          >
            {description}
          </ReactMarkdown>
        </div>
      </CardContent>
    </Card>
  );
}
