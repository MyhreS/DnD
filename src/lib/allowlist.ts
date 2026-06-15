import {
  doc,
  getDoc,
  setDoc,
  deleteDoc,
  collection,
  getDocs,
} from "firebase/firestore";
import { db } from "./firebase";
import { isSuperAdmin } from "@/config";
import type { AllowlistMember, MemberRole } from "@/types";

const allowlistCol = collection(db, "allowlist");

function normalize(email: string): string {
  return email.trim().toLowerCase();
}

export interface Access {
  allowed: boolean;
  role: MemberRole;
}

/** Resolve whether an email may use the app and what role they have. */
export async function resolveAccess(email: string | null): Promise<Access> {
  if (!email) return { allowed: false, role: "player" };
  const superAdmin = isSuperAdmin(email);
  try {
    const snap = await getDoc(doc(allowlistCol, normalize(email)));
    if (snap.exists()) {
      const role = (snap.data().role as MemberRole) ?? "player";
      return { allowed: true, role };
    }
  } catch (err) {
    console.error("Allowlist check failed", err);
  }
  // Super-admin is allowed even without a doc (bootstrap).
  return superAdmin
    ? { allowed: true, role: "admin" }
    : { allowed: false, role: "player" };
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
        role: "admin",
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
    .map((d) => {
      const data = d.data();
      return {
        email: (data.email as string) ?? d.id,
        role: (data.role as MemberRole) ?? "player",
        addedBy: (data.addedBy as string) ?? "",
        addedAt: (data.addedAt as number) ?? 0,
      } satisfies AllowlistMember;
    })
    .sort((a, b) => a.email.localeCompare(b.email));
}

export async function addToAllowlist(
  email: string,
  addedBy: string,
  role: MemberRole = "player",
): Promise<void> {
  const key = normalize(email);
  await setDoc(doc(allowlistCol, key), {
    email: key,
    role,
    addedBy,
    addedAt: Date.now(),
  });
}

export async function removeFromAllowlist(email: string): Promise<void> {
  await deleteDoc(doc(allowlistCol, normalize(email)));
}
