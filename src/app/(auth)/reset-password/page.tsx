import { Suspense } from "react";
import { ResetPasswordForm } from "./reset-password-form";

// Suspense boundary: the form reads ?forced=1 via useSearchParams,
// which suspends during prerender (same pattern as /login).
export default function ResetPasswordPage() {
  return (
    <Suspense>
      <ResetPasswordForm />
    </Suspense>
  );
}
