import { create } from "zustand";
import {
  onAuthStateChanged,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
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

export type AuthStatus = "loading" | "signedOut" | "checking" | "allowed";

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
    // Complete any pending redirect sign-in (used in installed PWAs).
    getRedirectResult(auth).catch((err) => {
      console.error("Redirect sign-in failed", err);
    });
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
      // Open access: anyone signed in may use the app. Roles/permissions are
      // now per-campaign (you're a campaign's DM if you created it). We still
      // read any allowlist entry for a display name, but never gate on it.
      const { identity, member } = await resolveAccess(user.email);
      set({
        status: "allowed",
        member,
        realIdentity: identity,
        viewAs: null,
        ...derive(identity, null),
      });
    });
  },

  signIn: async () => {
    set({ signingIn: true, error: null });
    // Installed/standalone PWAs block popups — use a full-page redirect there.
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (navigator as unknown as { standalone?: boolean }).standalone === true;
    if (standalone) {
      try {
        await signInWithRedirect(auth, googleProvider);
      } catch (err) {
        console.error("Redirect sign-in error", err);
        set({ error: "Sign-in failed. Please try again.", signingIn: false });
      }
      return; // the page navigates away to Google
    }
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
