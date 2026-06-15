// App-wide constants.

export const APP_NAME = "Catacombs & Starspawns";
export const APP_SHORT = "C&S Hunters";

/**
 * Super-admins are always allowed in (no allowlist entry required) and can
 * manage who else gets access. This bootstraps the very first user so nobody
 * ever has to hand-edit Firestore. Keep this in sync with firestore.rules.
 */
export const SUPER_ADMIN_EMAILS = ["simonmyhre1@gmail.com"];

export function isSuperAdmin(email: string | null | undefined): boolean {
  if (!email) return false;
  return SUPER_ADMIN_EMAILS.includes(email.toLowerCase());
}

import type { MemberRole } from "./types";

/** Admins and the Dungeon Master — they run sessions and oversee the party. */
export function isStaffRole(role: MemberRole | null | undefined): boolean {
  return role === "admin" || role === "dm";
}
