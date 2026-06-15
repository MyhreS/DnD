import {
  doc,
  getDoc,
  setDoc,
  deleteDoc,
  collection,
  getDocs,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { isSuperAdmin, type Identity } from "@/config";
import type { AccessRole, AllowlistMember, PlayerType } from "@/types";

const allowlistCol = collection(db, "allowlist");

function normalize(email: string): string {
  return email.trim().toLowerCase();
}

function toMember(id: string, data: Record<string, unknown>): AllowlistMember {
  return {
    email: (data.email as string) ?? id,
    firstName: (data.firstName as string) ?? "",
    lastName: (data.lastName as string) ?? "",
    accessRole: (data.accessRole as AccessRole) ?? "user",
    playerType: (data.playerType as PlayerType) ?? "player",
    addedBy: (data.addedBy as string) ?? "",
    addedAt: (data.addedAt as number) ?? 0,
  };
}

export interface Access {
  allowed: boolean;
  identity: Identity;
  member: AllowlistMember | null;
}

/** Resolve whether an email may use the app, and their identity (roles). */
export async function resolveAccess(email: string | null): Promise<Access> {
  if (!email) {
    return { allowed: false, identity: { accessRole: "user", playerType: "player" }, member: null };
  }
  const superAdmin = isSuperAdmin(email);
  try {
    const snap = await getDoc(doc(allowlistCol, normalize(email)));
    if (snap.exists()) {
      const member = toMember(snap.id, snap.data());
      return {
        allowed: true,
        identity: { accessRole: member.accessRole, playerType: member.playerType },
        member,
      };
    }
  } catch (err) {
    console.error("Allowlist check failed", err);
  }
  // Super-admin is allowed even without a doc (bootstrap).
  return superAdmin
    ? { allowed: true, identity: { accessRole: "admin", playerType: "player" }, member: null }
    : { allowed: false, identity: { accessRole: "user", playerType: "player" }, member: null };
}

/** Ensure the super-admin has their own allowlist entry (uniformity). */
export async function ensureSuperAdminEntry(email: string): Promise<void> {
  if (!isSuperAdmin(email)) return;
  const key = normalize(email);
  const ref = doc(allowlistCol, key);
  try {
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      await setDoc(ref, {
        email: key,
        firstName: "Simon",
        lastName: "Myhre",
        accessRole: "admin",
        playerType: "player",
        addedBy: "bootstrap",
        addedAt: Date.now(),
      });
    }
  } catch (err) {
    console.warn("Could not seed super-admin allowlist entry", err);
  }
}

/** Staff only (enforced by rules). List everyone with access. */
export async function listAllowlist(): Promise<AllowlistMember[]> {
  const snap = await getDocs(allowlistCol);
  return snap.docs
    .map((d) => toMember(d.id, d.data()))
    .sort((a, b) => a.firstName.localeCompare(b.firstName));
}

export interface NewMember {
  email: string;
  firstName: string;
  lastName: string;
  accessRole: AccessRole;
  playerType: PlayerType;
}

export async function addToAllowlist(member: NewMember, addedBy: string): Promise<void> {
  const key = normalize(member.email);
  await setDoc(doc(allowlistCol, key), {
    email: key,
    firstName: member.firstName.trim(),
    lastName: member.lastName.trim(),
    accessRole: member.accessRole,
    playerType: member.playerType,
    addedBy,
    addedAt: Date.now(),
  });
}

export async function removeFromAllowlist(email: string): Promise<void> {
  await deleteDoc(doc(allowlistCol, normalize(email)));
}
