"use client";

import { Check, Copy, KeyRound } from "lucide-react";
import { useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

/**
 * One-time token display for invite and admin password-reset flows.
 * The token is shown in the page, never stored in localStorage. Once the
 * notification module lands the backend will deliver it instead.
 */
export function TokenReveal({
  token,
  title,
  description,
}: {
  token: string;
  title: string;
  description: string;
}) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(token);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  return (
    <Alert>
      <KeyRound aria-hidden="true" />
      <AlertTitle>{title}</AlertTitle>
      <AlertDescription>
        <p>{description}</p>
        <code className="mt-2 block rounded-md bg-muted px-2 py-1.5 text-xs break-all">
          {token}
        </code>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="mt-3"
          onClick={copy}
        >
          {copied ? (
            <Check aria-hidden="true" />
          ) : (
            <Copy aria-hidden="true" />
          )}
          {copied ? "Copied" : "Copy token"}
        </Button>
      </AlertDescription>
    </Alert>
  );
}
