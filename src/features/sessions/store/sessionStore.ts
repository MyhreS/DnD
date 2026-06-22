import { create } from "zustand";
import type { SessionEvent } from "@/types";
import { subscribeSessions } from "@/api/sessions";

type Status = "idle" | "loading" | "ready" | "error";

interface SessionState {
  sessions: SessionEvent[];
  status: Status;
  error: string | null;
  unsub: (() => void) | null;
  campaignId: string | null;
  /** Subscribe to a campaign's schedule (idempotent; re-subscribes on change). */
  start: (campaignId: string | null) => void;
  stop: () => void;
}

export const useSessionStore = create<SessionState>((set, get) => ({
  sessions: [],
  status: "idle",
  error: null,
  unsub: null,
  campaignId: null,

  start: (campaignId) => {
    if (!campaignId) {
      get().unsub?.();
      set({ unsub: null, campaignId: null, sessions: [], status: "ready" });
      return;
    }
    if (campaignId === get().campaignId && get().unsub) return;
    get().unsub?.();
    set({ status: "loading", error: null, campaignId, sessions: [] });
    const unsub = subscribeSessions(
      campaignId,
      (sessions) => set({ sessions, status: "ready" }),
      () => set({ status: "error", error: "Could not load the schedule." }),
    );
    set({ unsub });
  },

  stop: () => {
    get().unsub?.();
    set({ unsub: null, campaignId: null });
  },
}));
