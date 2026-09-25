import { z } from "zod";

// Login form schema: presence only. Password POLICY (min length,
// history) is enforced server-side on set-password paths — the login
// form must accept any string to avoid leaking policy details to
// unauthenticated callers.
export const loginSchema = z.object({
  username: z.string().trim().min(1, "Enter your username or email"),
  password: z.string().min(1, "Enter your password"),
});

export type LoginFormValues = z.infer<typeof loginSchema>;
