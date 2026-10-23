"use client";

import { Loader2, Sparkles } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useApplyUnitTemplate } from "../hooks/use-facilities";
import { problemOf } from "@/lib/http";

/**
 * ApplyUnitTemplate (blueprint 8.6): seeds the standard unit skeleton.
 *
 * The backend is idempotent — existing codes are skipped — so this is
 * safe to run after the facility has customised its tree. It never
 * deactivates or removes an existing unit.
 */
export function ApplyTemplateDialog() {
  const [open, setOpen] = useState(false);
  const applyTemplate = useApplyUnitTemplate();

  const apply = async () => {
    try {
      await applyTemplate.mutateAsync();
      toast.success("Standard unit template applied");
      setOpen(false);
    } catch (error) {
      toast.error(problemOf(error).message ?? "Could not apply the unit template");
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Sparkles aria-hidden="true" />
          Apply standard template
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Apply the standard unit template?</DialogTitle>
          <DialogDescription>
            Adds any missing standard units (OPD, consultation, laboratory, pharmacy,
            cashier, records and wards). Existing unit codes are skipped, and no
            existing unit is renamed, deactivated or deleted.
          </DialogDescription>
        </DialogHeader>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            disabled={applyTemplate.isPending}
            onClick={() => setOpen(false)}
          >
            Cancel
          </Button>
          <Button type="button" disabled={applyTemplate.isPending} onClick={apply}>
            {applyTemplate.isPending && (
              <Loader2 aria-hidden="true" className="animate-spin" />
            )}
            {applyTemplate.isPending ? "Applying…" : "Apply template"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
