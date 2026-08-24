import { create } from "zustand";
import { subscribeGames, setGameCombat } from "@/api/games";
import { isPreviewActive, previewGame } from "@/dev/preview";
import { subscribeWithDeniedRetry } from "@/lib/subscribeRetry";
import { explain } from "@/lib/errors";
import type { EncounterState, Game } from "@/types";

type Status = "idle" | "loading" | "loaded" | "error";

/** The newest non-test game in the active campaign that has not ended. */
export function currentGame(games: Game[], campaignId?: string | null): Game | null {
  return games.find((game) => (
    !game.sandbox
    && game.status !== "ended"
    && (campaignId == null || game.campaignId === campaignId)
  )) ?? null;
}

interface GameState {
  games: Game[];
  status: Status;
  error: string | null;
  preview: boolean;
  _unsubGames: (() => void) | null;
  _campaignId: string | null;
  init: (campaignId: string | null) => void;
  stopSync: () => void;
  setCombat: (gameId: string, combat: EncounterState) => Promise<boolean>;
}

/** Minimal live-game projection for the table board and initiative tracker.
 * Session creation and roster management live on the Games page. */
export const useGameStore = create<GameState>((set, get) => ({
  games: [],
  status: "idle",
  error: null,
  preview: false,
  _unsubGames: null,
  _campaignId: null,

  init: (campaignId) => {
    if (get().preview) return;
    if (isPreviewActive()) {
      let game = previewGame();
      if (new URLSearchParams(window.location.search).get("play") === "active") {
        game = { ...game, status: "active", startedAt: Date.now() };
      }
      set({ preview: true, games: [game], status: "loaded" });
      return;
    }
    if (!campaignId) {
      get()._unsubGames?.();
      set({ _unsubGames: null, _campaignId: null, games: [], status: "loaded" });
      return;
    }
    if (campaignId === get()._campaignId && get()._unsubGames) return;
    get()._unsubGames?.();
    set({ status: "loading", error: null, _campaignId: campaignId });
    const unsubscribe = subscribeWithDeniedRetry(
      (onError) => subscribeGames(
        campaignId,
        (games) => set({ games, status: "loaded", error: null }),
        onError,
      ),
      (error) => set({ status: "error", error: explain("Couldn't load the game", error) }),
    );
    set({ _unsubGames: unsubscribe });
  },

  stopSync: () => {
    get()._unsubGames?.();
    set({ _unsubGames: null });
  },

  setCombat: async (gameId, combat) => {
    if (get().preview) {
      set((state) => ({ games: state.games.map((game) => game.id === gameId ? { ...game, combat } : game) }));
      return true;
    }
    try {
      await setGameCombat(gameId, combat);
      return true;
    } catch (error) {
      console.error("Couldn't update combat.", error);
      set({ error: explain("Couldn't update combat", error) });
      return false;
    }
  },
}));
