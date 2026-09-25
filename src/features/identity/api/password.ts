import { api } from "@/lib/http";

// Password writes (all authenticated). Policy (min length, history)
// is enforced server-side; the client mirrors the minimum length only
// for fast feedback — the server is authoritative.
export async function changePassword(
  currentPassword: string,
  newPassword: string,
): Promise<void> {
  await api.post("/api/v1/auth/change-password", { currentPassword, newPassword });
}
