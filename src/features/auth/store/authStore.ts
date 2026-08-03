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
import { getUserProfile, saveUserProfile } from "@/api/users";
import {
  isSuperAdmin,
  capabilities,
  isStaff as isStaffIdentity,
  DEFAULT_IDENTITY,
  type Identity,
  type Capabilities,
} from "@/config";
import type { AllowlistMember, UserProfile } from "@/types";

/** Synthesize a member (for display names) from a self-set profile. */
function profileToMember(p: UserProfile): AllowlistMember {
  return {
    email: p.email,
    firstName: p.firstName,
    lastName: p.lastName,
    accessRole: "user",
    playerType: "player",
    addedBy: "self",
    addedAt: 0,
  };
}

export type AuthStatus = "loading" | "signedOut" | "checking" | "allowed";

interface AuthState {
  user: User | null;
  status: AuthStatus;
  error: string | null;
  signingIn: boolean;

  member: AllowlistMember | null;
  /** True when a signed-in user has no name yet (first login) — show onboarding. */
  needsOnboarding: boolean;
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
  /** Save the first-login profile (name) and finish onboarding. */
  saveProfile: (firstName: string, lastName: string) => Promise<boolean>;
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
  needsOnboarding: false,
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
          needsOnboarding: false,
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
      // now per-campaign. A name comes from the user's self-set profile (or a
      // legacy allowlist entry); a brand-new user with neither onboards first.
      const [{ identity, member }, profile] = await Promise.all([
        resolveAccess(user.email).catch(() => ({ identity: DEFAULT_IDENTITY, member: null })),
        getUserProfile(user.uid).catch(() => null),
      ]);
      const effectiveMember = profile ? profileToMember(profile) : member;
      set({
        status: "allowed",
        member: effectiveMember,
        needsOnboarding: !effectiveMember,
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
      needsOnboarding: false,
      viewAs: null,
      realIdentity: DEFAULT_IDENTITY,
      ...derive(DEFAULT_IDENTITY, null),
      error: null,
    });
  },

  setViewAs: (viewAs) => {
    set({ viewAs, ...derive(get().realIdentity, viewAs) });
  },

  saveProfile: async (firstName, lastName) => {
    const user = get().user;
    if (!user) return false;
    const profile = {
      uid: user.uid,
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: user.email ?? "",
    };
    try {
      await saveUserProfile(profile);
      set({ member: profileToMember(profile), needsOnboarding: false });
      return true;
    } catch (err) {
      console.error("Couldn't save your profile", err);
      set({ error: "Couldn't save your name. Please try again." });
      return false;
    }
  },

  setPreview: (user, identity, member) => {
    set({
      user,
      status: "allowed",
      member,
      needsOnboarding: false,
      realIdentity: identity,
      viewAs: null,
      ...derive(identity, null),
      error: null,
    });
  },
}));
