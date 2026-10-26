// A staff record is created before the account link can be attempted.
// Keeping only the returned id (never names or other staff data) lets the
// setup card recover after a reload instead of offering to create a second
// record. The key is scoped to the account and facility because the same
// browser may be shared by multiple staff accounts.

const STORAGE_PREFIX = "hms.pending-staff-link";

function storageKey(userId: string, facilityId: string | null): string {
  return `${STORAGE_PREFIX}:${userId}:${facilityId ?? "none"}`;
}

function storage(): Storage | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage;
  } catch {
    // Storage can be disabled (private mode / policy). The create/link
    // sequence still works; only reload recovery is lost.
    return null;
  }
}

export function readPendingStaffLink(
  userId: string,
  facilityId: string | null,
): string | null {
  if (!userId) return null;
  try {
    const value = storage()?.getItem(storageKey(userId, facilityId));
    return value && value.trim().length > 0 ? value : null;
  } catch {
    return null;
  }
}

export function savePendingStaffLink(
  userId: string,
  facilityId: string | null,
  staffId: string,
): void {
  if (!userId || !staffId) return;
  try {
    storage()?.setItem(storageKey(userId, facilityId), staffId);
  } catch {
    // See storage().
  }
}

export function clearPendingStaffLink(
  userId: string,
  facilityId: string | null,
): void {
  if (!userId) return;
  try {
    storage()?.removeItem(storageKey(userId, facilityId));
  } catch {
    // See storage().
  }
}
