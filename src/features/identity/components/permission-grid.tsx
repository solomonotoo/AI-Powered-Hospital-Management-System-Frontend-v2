"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { humanizeCode } from "@/lib/format";
import { groupPermissions } from "../schemas/admin";
import type { PermissionView } from "../types/admin";

/**
 * Permission grid grouped by module (blueprint 8.6). Selection is an
 * array of codes, which is exactly what the role create/update request
 * accepts; no synthetic ids or client-side hierarchy are introduced.
 */
export function PermissionGrid({
  permissions,
  value,
  onChange,
  disabled = false,
}: {
  permissions: PermissionView[];
  value: string[];
  onChange: (next: string[]) => void;
  disabled?: boolean;
}) {
  const [filter, setFilter] = useState("");
  const selected = useMemo(() => new Set(value), [value]);

  const filtered = useMemo(() => {
    const needle = filter.trim().toLowerCase();
    if (!needle) return permissions;
    return permissions.filter(
      (permission) =>
        permission.code.toLowerCase().includes(needle) ||
        permission.description.toLowerCase().includes(needle),
    );
  }, [filter, permissions]);

  const groups = useMemo(() => groupPermissions(filtered), [filtered]);

  const toggle = (code: string, checked: boolean) => {
    if (checked) {
      if (selected.has(code)) return;
      onChange([...value, code]);
      return;
    }
    onChange(value.filter((candidate) => candidate !== code));
  };

  const toggleGroup = (codes: string[], checked: boolean) => {
    if (checked) {
      const additions = codes.filter((code) => !selected.has(code));
      if (additions.length > 0) onChange([...value, ...additions]);
      return;
    }
    const remove = new Set(codes);
    onChange(value.filter((code) => !remove.has(code)));
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-sm">
          <Search
            aria-hidden="true"
            className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            value={filter}
            onChange={(event) => setFilter(event.target.value)}
            placeholder="Filter permissions"
            className="pl-8"
            aria-label="Filter permissions"
            disabled={disabled}
          />
        </div>
        <p className="text-xs text-muted-foreground">
          {value.length} permission{value.length === 1 ? "" : "s"} selected
        </p>
      </div>

      {groups.length === 0 ? (
        <p className="rounded-lg border border-dashed px-3 py-6 text-center text-sm text-muted-foreground">
          No permissions match this filter.
        </p>
      ) : (
        <div className="space-y-4">
          {groups.map((group) => {
            const allSelected = group.permissions.every((permission) =>
              selected.has(permission.code),
            );
            return (
              <fieldset key={group.module} className="rounded-lg border p-3">
                <legend className="px-1 text-sm font-medium">
                  {humanizeCode(group.module)}
                </legend>
                <div className="mb-2 flex items-center gap-2">
                  <Checkbox
                    id={`permission-group-${group.module}`}
                    checked={allSelected}
                    onCheckedChange={(checked) =>
                      toggleGroup(
                        group.permissions.map(
                          (permission) => permission.code,
                        ),
                        checked === true,
                      )
                    }
                    disabled={disabled}
                  />
                  <Label
                    htmlFor={`permission-group-${group.module}`}
                    className="text-xs text-muted-foreground"
                  >
                    Select all in this module
                  </Label>
                </div>
                <div className="grid gap-2 md:grid-cols-2">
                  {group.permissions.map((permission) => (
                    <div
                      key={permission.code}
                      className="flex items-start gap-2 rounded-md px-1 py-1.5"
                    >
                      <Checkbox
                        id={`permission-${permission.code}`}
                        checked={selected.has(permission.code)}
                        onCheckedChange={(checked) =>
                          toggle(permission.code, checked === true)
                        }
                        disabled={disabled}
                      />
                      <div className="min-w-0 space-y-0.5">
                        <Label
                          htmlFor={`permission-${permission.code}`}
                          className="font-mono text-xs"
                        >
                          {permission.code}
                        </Label>
                        <p className="text-xs text-muted-foreground">
                          {permission.description}
                        </p>
                        <div className="flex flex-wrap gap-1">
                          {permission.sensitivity === "PRIVILEGED" && (
                            <Badge variant="destructive">Privileged</Badge>
                          )}
                          {permission.sensitivity === "SENSITIVE" && (
                            <Badge variant="outline">Sensitive</Badge>
                          )}
                          {permission.requiresReason && (
                            <Badge variant="outline">Reason required</Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </fieldset>
            );
          })}
        </div>
      )}
    </div>
  );
}
