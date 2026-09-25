"use client";

import { QueryClientProvider } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import { Toaster } from "@/components/ui/sonner";
import { createQueryClient } from "@/lib/query-client";
import { ErrorBoundary } from "@/components/shared/error-boundary";

// Root providers: query client + toasts. IdleTimeout + lock screen mount
// inside authenticated layouts (Slice 2), not globally — the login page
// must never lock itself.
export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(createQueryClient);
  return (
    <QueryClientProvider client={queryClient}>
      <ErrorBoundary>{children}</ErrorBoundary>
      <Toaster richColors position="top-right" />
    </QueryClientProvider>
  );
}
