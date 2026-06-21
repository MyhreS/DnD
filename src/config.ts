import type { AccessRole, PlayerType, AllowlistMember } from "./types";

// App-wide constants.

export const APP_NAME = "Catacombs & Starspawns";

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

/** Agent test accounts (agent-*@dandd-ea955.web.app) — hidden from real views. */
export function isTestEmail(email: string | null | undefined): boolean {
  return !!email && email.toLowerCase().endsWith("@dandd-ea955.web.app");
}

// --- Identity & capabilities -------------------------------------------------

export interface Identity {
  accessRole: AccessRole;
  playerType: PlayerType;
}

export const DEFAULT_IDENTITY: Identity = { accessRole: "user", playerType: "player" };

export interface Capabilities {
  /** Add/remove members and set their roles. */
  manageMembers: boolean;
  /** Create/edit/delete session dates. */
  manageSessions: boolean;
  /** Send invite & reminder emails. */
  email: boolean;
  /** See the party roster / DM oversight tools. */
  oversight: boolean;
  /** Start, run and end live games (the DM seat). */
  runGame: boolean;
}

export function capabilities({ accessRole, playerType }: Identity): Capabilities {
  const isAdmin = accessRole === "admin";
  const isMod = accessRole === "moderator" || isAdmin;
  const isDM = playerType === "dm";
  return {
    manageMembers: isAdmin,
    manageSessions: isMod || isDM,
    email: isAdmin || isDM, // admin and the DM can send emails
    oversight: isMod || isDM,
    runGame: isMod || isDM,
  };
}

/** "Staff" = anyone who runs things (not a plain user/player). */
export function isStaff(identity: Identity): boolean {
  const c = capabilities(identity);
  return c.oversight || c.email || c.manageSessions;
}

/** Players bring a character; the DM does not. */
export function needsCharacter(identity: Identity): boolean {
  return identity.playerType === "player";
}

// --- Display names -----------------------------------------------------------

export function fullName(m: { firstName?: string; lastName?: string; email?: string }): string {
  const name = [m.firstName, m.lastName].filter(Boolean).join(" ").trim();
  return name || m.email || "Hunter";
}

/**
 * Show just the first name, unless another member shares it — then disambiguate
 * with the last name.
 */
export function displayName(
  member: Pick<AllowlistMember, "firstName" | "lastName" | "email">,
  all: Pick<AllowlistMember, "firstName" | "lastName">[],
): string {
  const first = member.firstName?.trim();
  if (!first) return member.email ?? "Hunter";
  const clash = all.filter(
    (m) => m.firstName && m.firstName.trim().toLowerCase() === first.toLowerCase(),
  ).length;
  return clash > 1 && member.lastName ? `${first} ${member.lastName}` : first;
}
