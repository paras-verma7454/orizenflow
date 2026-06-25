"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider as NextThemesProvider } from "next-themes";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Toaster } from "sonner";

export function OuterProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

export function InnerProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isEmbedRoute = pathname?.startsWith("/embed/");

  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
      forcedTheme={isEmbedRoute ? "light" : undefined}
    >
      {children}
      <Toaster richColors />
    </NextThemesProvider>
  );
}
