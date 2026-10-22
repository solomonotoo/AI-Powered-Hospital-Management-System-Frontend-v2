"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

// Route-level boundary: catches render/data errors inside the app so a
// single page failure does not blank the whole shell. The digest is the
// server correlation id — quote it to IT support, never a stack trace.
export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Server logs already capture the stack; the browser console keeps
    // support usable without exposing internals in the UI.
    console.error(error);
  }, [error]);

  return (
    <main className="flex min-h-[60vh] flex-col items-center justify-center gap-4 p-8 text-center">
      <h1 className="font-heading text-xl font-semibold">This page could not load</h1>
      <p className="max-w-md text-sm text-muted-foreground">
        Nothing was saved by the failed action. Try again — if the problem persists, report the
        reference below to IT support.
      </p>
      {error.digest && (
        <p className="rounded bg-muted px-3 py-1 font-mono text-xs text-muted-foreground">
          Ref: {error.digest}
        </p>
      )}
      <Button onClick={reset}>Try again</Button>
    </main>
  );
}
