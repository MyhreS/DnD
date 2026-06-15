import { create } from "zustand";
import type { HunterCard } from "@/types";
import { loadHunterCard, saveHunterCard } from "@/lib/players";

type LoadStatus = "idle" | "loading" | "loaded" | "error";

interface PlayerState {
  card: HunterCard | null;
  status: LoadStatus;
  saving: boolean;
  error: string | null;
  /** Load the signed-in user's card. Safe to call repeatedly. */
  load: (uid: string) => Promise<void>;
  save: (card: HunterCard) => Promise<boolean>;
  reset: () => void;
}

export const usePlayerStore = create<PlayerState>((set) => ({
  card: null,
  status: "idle",
  saving: false,
  error: null,

  load: async (uid: string) => {
    set({ status: "loading", error: null });
    try {
      const card = await loadHunterCard(uid);
      set({ card, status: "loaded" });
    } catch (err) {
      console.error("Failed to load hunter card", err);
      set({ status: "error", error: "Could not load your hunter card." });
    }
  },

  save: async (card: HunterCard) => {
    set({ saving: true, error: null });
    try {
      const toSave = { ...card, updatedAt: Date.now() };
      await saveHunterCard(toSave);
      set({ card: toSave, saving: false, status: "loaded" });
      return true;
    } catch (err) {
      console.error("Failed to save hunter card", err);
      set({ saving: false, error: "Could not save your hunter card. Try again." });
      return false;
    }
  },

  reset: () => set({ card: null, status: "idle", error: null, saving: false }),
}));
