import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  FACILITY_STATUS_LABELS,
  type FacilityStatus,
} from "@/features/facility/types";

// Status is lifecycle, not decoration: the backend enforces the
// transition table, this badge only makes the current state readable.
const STATUS_STYLES: Record<FacilityStatus, string> = {
  PROVISIONING:
    "border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-900 dark:bg-sky-950 dark:text-sky-300",
  CONFIGURED:
    "border-indigo-200 bg-indigo-50 text-indigo-700 dark:border-indigo-900 dark:bg-indigo-950 dark:text-indigo-300",
  LIVE:
    "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-300",
  SUSPENDED:
    "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-300",
  DECOMMISSIONED: "border-border bg-muted text-muted-foreground",
};

export function FacilityStatusBadge({ status }: { status: FacilityStatus }) {
  return (
    <Badge
      variant="outline"
      title={status}
      className={cn("font-medium", STATUS_STYLES[status])}
    >
      {FACILITY_STATUS_LABELS[status] ?? status}
    </Badge>
  );
}
