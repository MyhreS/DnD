import { create } from "zustand";
import type { HunterCard } from "@/types";
import { saveCharacter, archiveCharacter, subscribeMyCharacters } from "@/api/players";
import { isPreviewActive, previewCard } from "@/dev/preview";

type LoadStatus = "idle" | "loading" | "loaded" | "error";

const SEL_KEY = "cs-selected-character";

function pick(chars: HunterCard[], selId: string | null): HunterCard | null {
  return chars.find((c) => c.id === selId) ?? chars[0] ?? null;
}

interface PlayerState {
  /** All characters the signed-in user owns. */
  characters: HunterCard[];
  /** The character currently in play / shown. */
  selectedId: string | null;
  card: HunterCard | null;
  status: LoadStatus;
  saving: boolean;
  error: string | null;
  subscribedUid: string | null;
  unsub: (() => void) | null;

  subscribe: (uid: string) => void;
  stop: () => void;
  select: (id: string) => void;
  save: (card: HunterCard) => Promise<boolean>;
  /** Archive (soft-delete) the selected character — DM-recoverable for the session. */
  archive: (gameId: string | null) => Promise<boolean>;
}

export const usePlayerStore = create<PlayerState>((set, get) => ({
  characters: [],
  selectedId: null,
  card: null,
  status: "idle",
  saving: false,
  error: null,
  subscribedUid: null,
  unsub: null,

  subscribe: (uid: string) => {
    if (isPreviewActive()) {
      const c = previewCard("preview-uid");
      set({ characters: [c], selectedId: c.id, card: c, status: "loaded", subscribedUid: uid });
      return;
    }
    if (get().subscribedUid === uid && get().unsub) return;
    get().unsub?.();
    set({ status: "loading", error: null, subscribedUid: uid });
    const unsub = subscribeMyCharacters(
      uid,
      (cards) => {
        const stored = localStorage.getItem(SEL_KEY);
        const selId = cards.some((c) => c.id === stored) ? stored : (cards[0]?.id ?? null);
        set({ characters: cards, selectedId: selId, card: pick(cards, selId), status: "loaded" });
      },
      () => set({ status: "error", error: "Could not load your characters." }),
    );
    set({ unsub });
  },

  stop: () => {
    get().unsub?.();
    set({ unsub: null, subscribedUid: null });
  },

  select: (id: string) => {
    localStorage.setItem(SEL_KEY, id);
    set((s) => ({ selectedId: id, card: pick(s.characters, id) }));
  },

  save: async (card: HunterCard) => {
    const toSave = { ...card, updatedAt: Date.now() };
    const upsert = (s: PlayerState) => {
      const characters = [...s.characters.filter((c) => c.id !== toSave.id), toSave];
      localStorage.setItem(SEL_KEY, toSave.id);
      return { characters, selectedId: toSave.id, card: toSave };
    };
    if (isPreviewActive()) {
      set((s) => ({ ...upsert(s), status: "loaded" as LoadStatus }));
      return true;
    }
    set({ saving: true, error: null });
    try {
      await saveCharacter(toSave);
      set((s) => ({ ...upsert(s), saving: false, status: "loaded" }));
      return true;
    } catch (err) {
      console.error("Failed to save character", err);
      set({ saving: false, error: "Could not save your character. Try again." });
      return false;
    }
  },

  archive: async (gameId: string | null) => {
    const card = get().card;
    if (!card) return true;
    const dropLocal = (s: PlayerState) => {
      const characters = s.characters.filter((c) => c.id !== card.id);
      const selId = characters[0]?.id ?? null;
      if (selId) localStorage.setItem(SEL_KEY, selId);
      return { characters, selectedId: selId, card: pick(characters, selId) };
    };
    if (isPreviewActive()) {
      set((s) => dropLocal(s));
      return true;
    }
    set({ saving: true, error: null });
    try {
      await archiveCharacter(card, "deleted", gameId);
      set((s) => ({ ...dropLocal(s), saving: false }));
      return true;
    } catch (err) {
      console.error("Failed to archive character", err);
      set({ saving: false, error: "Could not delete your character. Try again." });
      return false;
    }
  },
}));
