import { api } from "@/lib/http";

// Invitation + self-service reset API. All responses are silent by
// design (unknown emails, spent links) — the UI shows the same
// confirmation regardless; the server never confirms or denies.

export async function acceptInvite(token: string, password: string): Promise<void> {
  await api.post("/api/v1/auth/accept-invite", { token, password });
}

export async function forgotPassword(username: string): Promise<void> {
  await api.post("/api/v1/auth/forgot-password", { username });
}

export async function resetPassword(token: string, newPassword: string): Promise<void> {
  await api.post("/api/v1/auth/reset-password", { token, newPassword });
}
