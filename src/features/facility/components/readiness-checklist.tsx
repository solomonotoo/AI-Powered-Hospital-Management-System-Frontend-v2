import { AlertTriangle, CheckCircle2, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { ReadinessItem } from "@/features/facility/types";
import { cn } from "@/lib/utils";

/**
 * Renders the backend's readiness items verbatim: each line already
 * carries the human-readable gap, so there is no client-side catalogue
 * to drift from the server rules.
 */
export function ReadinessChecklist({ items }: { items: ReadinessItem[] }) {
  if (items.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        The readiness check returned no items.
      </p>
    );
  }

  const passed = items.filter((item) => item.passed).length;
  const complete = passed === items.length;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          {passed} of {items.length} checks passing
        </p>
        <Badge
          variant={complete ? "default" : "secondary"}
          className={cn(
            complete &&
              "bg-emerald-600 text-white hover:bg-emerald-600/90 dark:bg-emerald-600",
          )}
        >
          {complete ? "Ready for go-live" : "Not ready"}
        </Badge>
      </div>

      <ul className="space-y-2">
        {items.map((item) => (
          <li
            key={item.item}
            className={cn(
              "flex items-start gap-3 rounded-lg border p-3",
              item.passed
                ? "border-border bg-background"
                : "border-amber-200 bg-amber-50/60 dark:border-amber-900 dark:bg-amber-950/30",
            )}
          >
            {item.passed ? (
              <CheckCircle2
                aria-hidden="true"
                className="mt-0.5 size-4 shrink-0 text-emerald-600 dark:text-emerald-400"
              />
            ) : (
              <XCircle
                aria-hidden="true"
                className="mt-0.5 size-4 shrink-0 text-amber-600 dark:text-amber-400"
              />
            )}
            <div className="space-y-0.5">
              <p className="text-sm font-medium">
                {item.item}
                <span className="sr-only">
                  {item.passed ? " — passing" : " — not passing"}
                </span>
              </p>
              <p className="text-sm text-muted-foreground">{item.detail}</p>
            </div>
          </li>
        ))}
      </ul>

      {!complete && (
        <p className="flex items-start gap-2 text-xs text-muted-foreground">
          <AlertTriangle aria-hidden="true" className="mt-0.5 size-3.5 shrink-0" />
          Go-live stays blocked until every check passes. The backend re-runs this
          check when the go-live command is issued.
        </p>
      )}
    </div>
  );
}
