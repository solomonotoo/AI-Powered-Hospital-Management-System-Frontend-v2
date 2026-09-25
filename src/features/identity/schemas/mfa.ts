import { z } from "zod";

// Six digits, but recovery codes are 8 letters — the VERIFY field
// accepts both (server tries TOTP then recovery), so the schema only
// requires non-empty; strictness would block legitimate recovery.
export const mfaCodeSchema = z.object({
  code: z.string().trim().min(1, "Enter the code from your app (or a recovery code)"),
});

export type MfaCodeFormValues = z.infer<typeof mfaCodeSchema>;

// Invitation claim: token rides the URL (?token=), password follows the
// same minimum as change-password (server authoritative).
export const acceptInviteSchema = z
  .object({
    password: z.string().min(10, "At least 10 characters"),
    confirmPassword: z.string().min(1, "Repeat the password"),
  })
  .refine((values) => values.password === values.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export type AcceptInviteFormValues = z.infer<typeof acceptInviteSchema>;

// Forgot form asks username only — and the success screen is IDENTICAL
// whether the account exists (anti-enumeration, server-enforced).
export const forgotPasswordSchema = z.object({
  username: z.string().trim().min(1, "Enter your username or email"),
});

export type ForgotPasswordFormValues = z.infer<typeof forgotPasswordSchema>;

// Reset via emailed link: token from URL, password rules as invite.
export const resetViaLinkSchema = acceptInviteSchema;

export type ResetViaLinkFormValues = z.infer<typeof resetViaLinkSchema>;
