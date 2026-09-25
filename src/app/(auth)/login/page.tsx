import { Suspense } from "react";
import { LoginForm } from "./login-form";

// useSearchParams() inside the form needs a Suspense boundary for
// prerendering: without it the static build fails (Next requires the
// hook to suspend).
export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
