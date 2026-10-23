import { ShieldX } from "lucide-react";
import type { ReactNode } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

/**
 * UI gating only. The backend re-checks the permission on every call;
 * this state exists so a direct URL visit explains itself instead of
 * showing an empty page.
 */
export function PermissionDenied({
  title = "You do not have access to this page",
  description = "Your account is missing the permission this screen requires. Ask a platform administrator to review your access.",
  action,
}: {
  title?: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <Card className="mx-auto max-w-xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ShieldX aria-hidden="true" className="size-5 text-muted-foreground" />
          {title}
        </CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      {action && <CardContent>{action}</CardContent>}
    </Card>
  );
}
