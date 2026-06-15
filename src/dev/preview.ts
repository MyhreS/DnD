import type { User } from "firebase/auth";
import { capabilities, type Identity } from "@/config";
import type { AccessRole, AllowlistMember, PlayerType } from "@/types";

// Dev-only "preview mode": run the app locally as any role WITHOUT Google
// sign-in, so the UI (and an AI driving Playwright) can move between pages for
// each role. Activate with `?preview=admin.dm` (or `moderator`, `user.player`,
// `dm`, …). The choice is persisted to localStorage so navigation keeps it.
// Disable with `?preview=off`. Data calls still hit Firestore and may show empty
// states — this is for inspecting layout & role-gated UI, not real data.

const STORAGE_KEY = "cs-preview";

function parseIdentity(raw: string | null): Identity {
  let accessRole: AccessRole = "user";
  let playerType: PlayerType = "player";
  for (const token of (raw ?? "").toLowerCase().split(/[.,\s/]+/)) {
    if (token === "user" || token === "moderator" || token === "admin") accessRole = token;
    if (token === "player" || token === "dm") playerType = token;
  }
  return { accessRole, playerType };
}

export function readPreviewRaw(): string | null {
  if (!import.meta.env.DEV) return null;
  const param = new URLSearchParams(window.location.search).get("preview");
  if (param === "off") {
    localStorage.removeItem(STORAGE_KEY);
    return null;
  }
  if (param) {
    localStorage.setItem(STORAGE_KEY, param);
    return param;
  }
  return localStorage.getItem(STORAGE_KEY);
}

export interface PreviewSession {
  user: User;
  identity: Identity;
  member: AllowlistMember;
}

export function maybePreview(): PreviewSession | null {
  const raw = readPreviewRaw();
  if (raw === null) return null;
  const identity = parseIdentity(raw);
  const user = {
    uid: "preview-uid",
    email: "preview@local.dev",
    displayName: "Preview Hunter",
    photoURL: null,
  } as unknown as User;
  const member: AllowlistMember = {
    email: "preview@local.dev",
    firstName: "Preview",
    lastName: "Hunter",
    accessRole: identity.accessRole,
    playerType: identity.playerType,
    addedBy: "preview",
    addedAt: Date.now(),
  };
  console.info("[preview] running as", identity, capabilities(identity));
  return { user, identity, member };
}

export function isPreviewActive(): boolean {
  return import.meta.env.DEV && readPreviewRaw() !== null;
}

/** A sample hunter card so the Character/Party views render in preview mode. */
export function previewCard(uid: string): import("@/types").HunterCard {
  const now = Date.now();
  return {
    uid,
    ownerEmail: "preview@local.dev",
    ownerName: "Preview Hunter",
    name: "Eileen the Crow",
    classId: "scout",
    background: "Plague Doctor",
    level: 3,
    abilities: { str: 12, dex: 15, con: 13, int: 10, wis: 12, cha: 8 },
    skillProficiencies: ["Stealth", "Perception", "Survival"],
    mainArmorId: "hunter-leather-coat",
    currentHp: 9,
    madness: 2,
    transform: 1,
    notes: "Hunts the beasts that were once hunters.",
    createdAt: now,
    updatedAt: now,
  };
}
