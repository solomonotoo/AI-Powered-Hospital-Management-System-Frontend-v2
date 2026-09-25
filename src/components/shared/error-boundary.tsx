"use client";

import { Component, type ReactNode } from "react";

// Global error boundary: crashes show a support-friendly screen with the
// traceId (server problem bodies carry it) instead of a blank page.
// WHY a class: function components cannot be error boundaries.
export class ErrorBoundary extends Component<
  { children: ReactNode },
  { error: Error | null }
> {
  state = { error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  render() {
    if (this.state.error) {
      return (
        <main className="flex min-h-screen flex-col items-center justify-center gap-4 p-8 text-center">
          <h1 className="text-xl font-semibold">Something went wrong</h1>
          <p className="max-w-md text-sm text-muted-foreground">
            The page crashed. Reload to continue — if it persists, report
            this to IT support.
          </p>
          <pre className="max-w-full overflow-auto rounded bg-muted p-3 text-xs">
            {this.state.error.message}
          </pre>
          <button
            className="rounded bg-primary px-4 py-2 text-sm text-primary-foreground"
            onClick={() => window.location.reload()}
          >
            Reload
          </button>
        </main>
      );
    }
    return this.props.children;
  }
}
