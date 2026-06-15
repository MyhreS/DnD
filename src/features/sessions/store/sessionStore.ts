import { create } from "zustand";
import type { SessionEvent } from "@/types";
import { subscribeSessions } from "@/api/sessions";

type Status = "idle" | "loading" | "ready" | "error";

interface SessionState {
  sessions: SessionEvent[];
  status: Status;
  error: string | null;
  unsub: (() => void) | null;
  /** Start the live subscription (idempotent). */
  start: () => void;
  stop: () => void;
}

export const useSessionStore = create<SessionState>((set, get) => ({
  sessions: [],
  status: "idle",
  error: null,
  unsub: null,

  start: () => {
    if (get().unsub) return; // already subscribed
    set({ status: "loading", error: null });
    const unsub = subscribeSessions(
      (sessions) => set({ sessions, status: "ready" }),
      () => set({ status: "error", error: "Could not load the schedule." }),
    );
    set({ unsub });
  },

  stop: () => {
    get().unsub?.();
    set({ unsub: null });
  },
}));
