"use client";

import { Ban, Network, Pencil, Plus, RefreshCw } from "lucide-react";
import { useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useCurrentFacilityUnits } from "../hooks/use-facilities";
import { UNIT_TYPE_LABELS, type UnitView } from "../types";
import { ApplyTemplateDialog } from "./apply-template-dialog";
import { DeactivateUnitDialog } from "./deactivate-unit-dialog";
import { UnitDialog } from "./unit-dialog";

type UnitsByParent = Map<string | null, UnitView[]>;

/**
 * Build the tree without trusting the server's row order. A parent id
 * that is missing from this facility's list is treated as a top-level
 * unit so a dangling reference can never hide a row.
 */
function buildTree(units: UnitView[]): UnitsByParent {
  const ids = new Set(units.map((unit) => unit.id));
  const byParent: UnitsByParent = new Map();

  for (const unit of units) {
    const parent =
      unit.parentUnitId !== null && ids.has(unit.parentUnitId)
        ? unit.parentUnitId
        : null;
    const siblings = byParent.get(parent) ?? [];
    siblings.push(unit);
    byParent.set(parent, siblings);
  }

  for (const siblings of byParent.values()) {
    siblings.sort((a, b) => a.name.localeCompare(b.name));
  }

  return byParent;
}

function UnitNode({
  unit,
  depth,
  byParent,
  onEdit,
  onDeactivate,
}: {
  unit: UnitView;
  depth: number;
  byParent: UnitsByParent;
  onEdit: (unit: UnitView) => void;
  onDeactivate: (unit: UnitView) => void;
}) {
  const children = byParent.get(unit.id) ?? [];

  return (
    <li>
      <div
        className={cn(
          "rounded-lg border bg-card",
          !unit.active && "bg-muted/40 opacity-80",
        )}
      >
        <div className="flex flex-col gap-2 p-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-start gap-2">
            <Network
              aria-hidden="true"
              className="mt-0.5 size-4 shrink-0 text-muted-foreground"
            />
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="truncate font-medium">{unit.name}</span>
                <span className="font-mono text-xs text-muted-foreground">
                  {unit.code}
                </span>
                <Badge variant="outline">{UNIT_TYPE_LABELS[unit.type]}</Badge>
                {!unit.active && <Badge variant="secondary">Inactive</Badge>}
              </div>
              {depth > 0 && (
                <p className="text-xs text-muted-foreground">
                  Nested unit · level {depth + 1}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1 sm:shrink-0">
            {unit.active ? (
              <>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  aria-label={`Rename ${unit.name}`}
                  onClick={() => onEdit(unit)}
                >
                  <Pencil aria-hidden="true" />
                  Edit
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  aria-label={`Deactivate ${unit.name}`}
                  onClick={() => onDeactivate(unit)}
                >
                  <Ban aria-hidden="true" />
                  Deactivate
                </Button>
              </>
            ) : (
              <span className="pr-2 text-xs text-muted-foreground">
                Historical unit
              </span>
            )}
          </div>
        </div>
      </div>

      {children.length > 0 && (
        <ul className="mt-2 space-y-2 border-l pl-3 sm:pl-4">
          {children.map((child) => (
            <UnitNode
              key={child.id}
              unit={child}
              depth={depth + 1}
              byParent={byParent}
              onEdit={onEdit}
              onDeactivate={onDeactivate}
            />
          ))}
        </ul>
      )}
    </li>
  );
}

/**
 * Unit tree editor (blueprint 8.6 /admin/units).
 *
 * Reads and writes only the caller's facility: the API surface is
 * /facilities/current/units, so no facility id is ever supplied by the
 * browser. Deactivation keeps the row and its history.
 */
export function UnitTree() {
  const unitsQuery = useCurrentFacilityUnits();
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<UnitView | null>(null);
  const [deactivating, setDeactivating] = useState<UnitView | null>(null);

  if (unitsQuery.isPending) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-96" />
        </CardHeader>
        <CardContent className="space-y-2">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (unitsQuery.isError) {
    return (
      <Alert variant="destructive">
        <AlertTitle>Could not load the unit tree</AlertTitle>
        <AlertDescription className="space-y-2">
          <p>
            {unitsQuery.error instanceof Error
              ? unitsQuery.error.message
              : "The facility units are unavailable."}
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={unitsQuery.isFetching}
            onClick={() => void unitsQuery.refetch()}
          >
            <RefreshCw aria-hidden="true" />
            Retry
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  const units = unitsQuery.data;
  const byParent = buildTree(units);
  const roots = byParent.get(null) ?? [];

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-1">
              <CardTitle>Organization units</CardTitle>
              <CardDescription>
                Departments, clinics, wards and service points. Units are scoped to
                this facility and are deactivated, never deleted.
              </CardDescription>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <ApplyTemplateDialog />
              <Button type="button" onClick={() => setCreateOpen(true)}>
                <Plus aria-hidden="true" />
                Add unit
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {units.length === 0 ? (
            <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed p-8 text-center">
              <Network aria-hidden="true" className="size-8 text-muted-foreground" />
              <div className="space-y-1">
                <p className="font-medium">No units yet</p>
                <p className="text-sm text-muted-foreground">
                  Apply the standard template to start with OPD, laboratory,
                  pharmacy, cashier, records and wards, or add a unit manually.
                </p>
              </div>
              <div className="flex flex-wrap justify-center gap-2">
                <ApplyTemplateDialog />
                <Button type="button" onClick={() => setCreateOpen(true)}>
                  <Plus aria-hidden="true" />
                  Add unit
                </Button>
              </div>
            </div>
          ) : (
            <ul className="space-y-2">
              {roots.map((unit) => (
                <UnitNode
                  key={unit.id}
                  unit={unit}
                  depth={0}
                  byParent={byParent}
                  onEdit={setEditing}
                  onDeactivate={setDeactivating}
                />
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <UnitDialog
        mode="create"
        units={units}
        open={createOpen}
        onOpenChange={setCreateOpen}
      />

      {editing && (
        <UnitDialog
          mode="edit"
          unit={editing}
          units={units}
          open
          onOpenChange={(open) => {
            if (!open) setEditing(null);
          }}
        />
      )}

      {deactivating && (
        <DeactivateUnitDialog
          unit={deactivating}
          open
          onOpenChange={(open) => {
            if (!open) setDeactivating(null);
          }}
        />
      )}
    </div>
  );
}
