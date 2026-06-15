import { create } from "zustand";
import {
  onAuthStateChanged,
  signInWithPopup,
  signOut as fbSignOut,
  type User,
} from "firebase/auth";
import { auth, googleProvider } from "@/lib/firebase";
import { resolveAccess, ensureSuperAdminEntry } from "@/lib/allowlist";
import { isSuperAdmin, isStaffRole } from "@/config";
import type { MemberRole } from "@/types";

export type AuthStatus =
  | "loading" // determining auth state on boot
  | "signedOut" // no user
  | "checking" // signed in, verifying allowlist
  | "allowed" // signed in + on allowlist
  | "denied"; // signed in but NOT on allowlist

interface AuthState {
  user: User | null;
  status: AuthStatus;
  role: MemberRole;
  isAdmin: boolean;
  isStaff: boolean;
  error: string | null;
  signingIn: boolean;
  /** Begin listening to auth changes. Returns an unsubscribe fn. */
  init: () => () => void;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  status: "loading",
  role: "player",
  isAdmin: false,
  isStaff: false,
  error: null,
  signingIn: false,

  init: () => {
    return onAuthStateChanged(auth, async (user) => {
      if (!user) {
        set({
          user: null,
          status: "signedOut",
          role: "player",
          isAdmin: false,
          isStaff: false,
          error: null,
        });
        return;
      }
      set({ user, status: "checking", error: null });
      // Make sure the super-admin shows up in the allowlist too.
      if (isSuperAdmin(user.email) && user.email) {
        void ensureSuperAdminEntry(user.email);
      }
      const { allowed, role } = await resolveAccess(user.email);
      set({
        status: allowed ? "allowed" : "denied",
        role,
        isAdmin: role === "admin",
        isStaff: isStaffRole(role),
      });
    });
  },

  signIn: async () => {
    set({ signingIn: true, error: null });
    try {
      await signInWithPopup(auth, googleProvider);
      // onAuthStateChanged takes over from here.
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code ?? "";
      if (code === "auth/popup-closed-by-user" || code === "auth/cancelled-popup-request") {
        // User dismissed the popup — not an error worth shouting about.
        set({ error: null });
      } else {
        set({ error: "Sign-in failed. Please try again." });
        console.error("Sign-in error", err);
      }
    } finally {
      set({ signingIn: false });
    }
  },

  signOut: async () => {
    await fbSignOut(auth);
    set({
      user: null,
      status: "signedOut",
      role: "player",
      isAdmin: false,
      isStaff: false,
      error: null,
    });
  },
}));
