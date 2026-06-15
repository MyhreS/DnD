import { create } from "zustand";
import type { HunterCard } from "@/types";
import { saveHunterCard, deleteHunterCard, subscribeHunterCard } from "@/api/players";
import { isPreviewActive, previewCard } from "@/dev/preview";

type LoadStatus = "idle" | "loading" | "loaded" | "error";

interface PlayerState {
  card: HunterCard | null;
  status: LoadStatus;
  saving: boolean;
  error: string | null;
  subscribedUid: string | null;
  unsub: (() => void) | null;
  /** Live-subscribe to the signed-in user's card. Idempotent per uid. */
  subscribe: (uid: string) => void;
  stop: () => void;
  save: (card: HunterCard) => Promise<boolean>;
  remove: (uid: string) => Promise<boolean>;
}

export const usePlayerStore = create<PlayerState>((set, get) => ({
  card: null,
  status: "idle",
  saving: false,
  error: null,
  subscribedUid: null,
  unsub: null,

  subscribe: (uid: string) => {
    if (isPreviewActive()) {
      set({ card: previewCard(uid), status: "loaded", subscribedUid: uid });
      return;
    }
    if (get().subscribedUid === uid && get().unsub) return;
    get().unsub?.();
    set({ status: "loading", error: null, subscribedUid: uid });
    const unsub = subscribeHunterCard(
      uid,
      (card) => set({ card, status: "loaded" }),
      () => set({ status: "error", error: "Could not load your hunter card." }),
    );
    set({ unsub });
  },

  stop: () => {
    get().unsub?.();
    set({ unsub: null, subscribedUid: null });
  },

  save: async (card: HunterCard) => {
    const toSave = { ...card, updatedAt: Date.now() };
    if (isPreviewActive()) {
      set({ card: toSave, status: "loaded" }); // local-only in preview
      return true;
    }
    set({ saving: true, error: null });
    try {
      await saveHunterCard(toSave);
      // The live subscription will echo the change; set optimistically too.
      set({ card: toSave, saving: false, status: "loaded" });
      return true;
    } catch (err) {
      console.error("Failed to save hunter card", err);
      set({ saving: false, error: "Could not save your hunter card. Try again." });
      return false;
    }
  },

  remove: async (uid: string) => {
    if (isPreviewActive()) {
      set({ card: null, status: "loaded" });
      return true;
    }
    set({ saving: true, error: null });
    try {
      await deleteHunterCard(uid);
      set({ card: null, saving: false, status: "loaded" });
      return true;
    } catch (err) {
      console.error("Failed to delete hunter card", err);
      set({ saving: false, error: "Could not delete your character. Try again." });
      return false;
    }
  },
}));
