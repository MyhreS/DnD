import { create } from "zustand";
import {
  onAuthStateChanged,
  signInWithPopup,
  signOut as fbSignOut,
  type User,
} from "firebase/auth";
import { auth, googleProvider } from "@/lib/firebase";
import { resolveAccess, ensureSuperAdminEntry } from "@/api/allowlist";
import {
  isSuperAdmin,
  capabilities,
  isStaff as isStaffIdentity,
  DEFAULT_IDENTITY,
  type Identity,
  type Capabilities,
} from "@/config";
import type { AllowlistMember } from "@/types";

export type AuthStatus = "loading" | "signedOut" | "checking" | "allowed" | "denied";

interface AuthState {
  user: User | null;
  status: AuthStatus;
  error: string | null;
  signingIn: boolean;

  member: AllowlistMember | null;
  /** The real identity from the allowlist. */
  realIdentity: Identity;
  /** Role-switcher override (preview a different role). null = use real. */
  viewAs: Identity | null;
  /** Effective identity (viewAs ?? realIdentity) — what the UI gates on. */
  identity: Identity;
  caps: Capabilities;
  isStaff: boolean;

  init: () => () => void;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
  setViewAs: (identity: Identity | null) => void;
  /** Used by dev preview mode to inject a session without Google sign-in. */
  setPreview: (user: User, identity: Identity, member: AllowlistMember | null) => void;
}

function derive(real: Identity, viewAs: Identity | null) {
  const identity = viewAs ?? real;
  return { identity, caps: capabilities(identity), isStaff: isStaffIdentity(identity) };
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  status: "loading",
  error: null,
  signingIn: false,
  member: null,
  realIdentity: DEFAULT_IDENTITY,
  viewAs: null,
  identity: DEFAULT_IDENTITY,
  caps: capabilities(DEFAULT_IDENTITY),
  isStaff: false,

  init: () => {
    return onAuthStateChanged(auth, async (user) => {
      if (!user) {
        set({
          user: null,
          status: "signedOut",
          member: null,
          viewAs: null,
          realIdentity: DEFAULT_IDENTITY,
          ...derive(DEFAULT_IDENTITY, null),
          error: null,
        });
        return;
      }
      set({ user, status: "checking", error: null });
      if (isSuperAdmin(user.email) && user.email) {
        void ensureSuperAdminEntry(user.email);
      }
      const { allowed, identity, member } = await resolveAccess(user.email);
      set({
        status: allowed ? "allowed" : "denied",
        member,
        realIdentity: identity,
        viewAs: null,
        ...derive(identity, null),
      });
    });
  },

  signIn: async () => {
    set({ signingIn: true, error: null });
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code ?? "";
      if (code === "auth/popup-closed-by-user" || code === "auth/cancelled-popup-request") {
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
      member: null,
      viewAs: null,
      realIdentity: DEFAULT_IDENTITY,
      ...derive(DEFAULT_IDENTITY, null),
      error: null,
    });
  },

  setViewAs: (viewAs) => {
    set({ viewAs, ...derive(get().realIdentity, viewAs) });
  },

  setPreview: (user, identity, member) => {
    set({
      user,
      status: "allowed",
      member,
      realIdentity: identity,
      viewAs: null,
      ...derive(identity, null),
      error: null,
    });
  },
}));
