import { create } from "zustand";
import type { ShopState } from "@/types";
import { setGameShop } from "@/api/shop";
import { isPreviewActive } from "@/dev/preview";
import { useGameStore } from "./gameStore";

/** The shop's stock lives on the game document (like `game.combat`), so this
 * store owns only the DM's write actions and their busy/error state — the
 * shop itself arrives through the existing game subscription. */
interface ShopStoreState {
  busy: boolean;
  error: string | null;
  /** Stock/rename the shop without changing whether it is open. */
  save: (gameId: string, shop: ShopState) => Promise<boolean>;
  /** Put the shop on the big screen. */
  open: (gameId: string, shop: ShopState) => Promise<boolean>;
  /** Take it down, keeping the stock so the DM can reopen it later. */
  close: (gameId: string, shop: ShopState) => Promise<boolean>;
}

async function writeShop(gameId: string, shop: ShopState): Promise<boolean> {
  // Preview mode has no Firestore; mirror the write into the local game so the
  // GM controls and the big-screen board still demonstrate the flow. The game
  // page keeps its own preview copy, so it is notified the way combat is.
  if (isPreviewActive()) {
    useGameStore.setState((state) => ({
      games: state.games.map((game) => (game.id === gameId ? { ...game, shop } : game)),
    }));
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("cs-preview-shop", { detail: { gameId, shop } }));
    }
    return true;
  }
  await setGameShop(gameId, shop);
  return true;
}

export const useShopStore = create<ShopStoreState>((set) => {
  async function run(gameId: string, shop: ShopState, msg: string): Promise<boolean> {
    set({ busy: true, error: null });
    try {
      const ok = await writeShop(gameId, shop);
      set({ busy: false });
      return ok;
    } catch (err) {
      console.error(msg, err);
      set({ busy: false, error: msg });
      return false;
    }
  }

  return {
    busy: false,
    error: null,
    save: (gameId, shop) => run(gameId, shop, "Couldn't save the shop."),
    open: (gameId, shop) => run(gameId, { ...shop, open: true }, "Couldn't open the shop."),
    close: (gameId, shop) => run(gameId, { ...shop, open: false }, "Couldn't close the shop."),
  };
});
