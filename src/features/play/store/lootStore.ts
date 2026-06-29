import { create } from "zustand";
import type { HunterCard, InventoryEntry, LootPile } from "@/types";
import { subscribeLoot, claimLoot, createLoot } from "@/api/games";
import { patchCharacter } from "@/api/players";
import { isPreviewActive, previewLoot } from "@/dev/preview";

/** Merge dropped items into an inventory (sum quantities). */
function mergeInventory(inv: InventoryEntry[], add: InventoryEntry[]): InventoryEntry[] {
  const map = new Map(inv.map((e) => [e.itemId, e.qty]));
  for (const e of add) map.set(e.itemId, (map.get(e.itemId) ?? 0) + e.qty);
  return [...map].map(([itemId, qty]) => ({ itemId, qty })).filter((e) => e.qty > 0);
}

interface LootState {
  loot: LootPile[];
  busy: boolean;
  error: string | null;
  preview: boolean;
  _unsub: (() => void) | null;
  _gameId: string | null;

  sync: (gameId: string | null) => void;
  stop: () => void;
  claim: (loot: LootPile, myCard: HunterCard, gameId: string) => Promise<boolean>;
  /** Drop one item stack from your own inventory onto the shared loot pile so
   * another hunter can claim it. */
  drop: (entry: InventoryEntry, myCard: HunterCard, gameId: string) => Promise<boolean>;
}

export const useLootStore = create<LootState>((set, get) => ({
  loot: [],
  busy: false,
  error: null,
  preview: false,
  _unsub: null,
  _gameId: null,

  sync: (gameId) => {
    if (isPreviewActive()) {
      if (!get().preview) set({ preview: true, loot: previewLoot() });
      return;
    }
    if (gameId === get()._gameId && get()._unsub) return;
    get()._unsub?.();
    if (!gameId) {
      set({ _unsub: null, _gameId: null, loot: [] });
      return;
    }
    set({ _gameId: gameId, loot: [] });
    const unsub = subscribeLoot(
      gameId,
      (loot) => set({ loot }),
      () => set({ error: "Couldn't load dropped loot." }),
    );
    set({ _unsub: unsub });
  },

  stop: () => {
    get()._unsub?.();
    set({ _unsub: null, _gameId: null });
  },

  claim: async (loot, myCard, gameId) => {
    if (get().preview) {
      set((s) => ({
        loot: s.loot.map((l) =>
          l.id === loot.id ? { ...l, status: "claimed", claimedByName: myCard.name } : l,
        ),
      }));
      return true;
    }
    set({ busy: true, error: null });
    try {
      // Mark claimed first so two players can't grab the same pile, then bank it.
      await claimLoot(gameId, loot.id, { uid: myCard.ownerUid, name: myCard.name });
      await patchCharacter(myCard.id, {
        inventory: mergeInventory(myCard.inventory ?? [], loot.items),
        coins: (myCard.coins ?? 0) + loot.coins,
      });
      set({ busy: false });
      return true;
    } catch (err) {
      console.error("Couldn't claim loot", err);
      set({ busy: false, error: "Couldn't claim that loot." });
      return false;
    }
  },

  drop: async (entry, myCard, gameId) => {
    if (get().preview) {
      set((s) => ({
        loot: [
          {
            id: `drop-${entry.itemId}-${Date.now()}`,
            fromUid: myCard.ownerUid,
            fromName: myCard.name,
            items: [entry],
            coins: 0,
            status: "unclaimed",
            claimedByUid: null,
            claimedByName: null,
            createdAt: Date.now(),
          },
          ...s.loot,
        ],
      }));
      return true;
    }
    set({ busy: true, error: null });
    try {
      // Create the pile first, then remove from inventory — a duplicate is
      // recoverable, a lost item is not.
      await createLoot(gameId, {
        fromUid: myCard.ownerUid,
        fromName: myCard.name,
        items: [entry],
        coins: 0,
      });
      const inventory = (myCard.inventory ?? []).filter((e) => e.itemId !== entry.itemId);
      await patchCharacter(myCard.id, { inventory });
      set({ busy: false });
      return true;
    } catch (err) {
      console.error("Couldn't drop item", err);
      set({ busy: false, error: "Couldn't drop that item." });
      return false;
    }
  },
}));
