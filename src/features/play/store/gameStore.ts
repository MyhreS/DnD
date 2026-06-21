import { create } from "zustand";
import type { Game, GameParticipant, GamePhase } from "@/types";
import {
  subscribeGames,
  subscribeParticipants,
  createGame,
  startGame,
  setGamePhase,
  endGame,
  deleteGame,
  joinGame,
  leaveGame,
  type CreateGameInput,
  type JoinInput,
} from "@/api/games";
import { isPreviewActive, previewGame, previewParticipants } from "@/dev/preview";
import { useAuthStore } from "@/features/auth/store/authStore";

type Status = "idle" | "loading" | "loaded" | "error";

/** The live game the party should be looking at: newest non-sandbox game that
 * hasn't ended. (Sandbox/test-run games are surfaced separately.) */
export function currentGame(games: Game[]): Game | null {
  return games.find((g) => !g.sandbox && g.status !== "ended") ?? null;
}

interface GameState {
  games: Game[];
  participants: GameParticipant[];
  status: Status;
  /** An action is in flight — drives button spinners / disabled states. */
  busy: boolean;
  error: string | null;
  preview: boolean;
  _unsubGames: (() => void) | null;
  _unsubParts: (() => void) | null;
  _partsGameId: string | null;

  init: () => void;
  stopSync: () => void;
  clearError: () => void;

  hostGame: (input: CreateGameInput) => Promise<string | null>;
  begin: (gameId: string) => Promise<boolean>;
  setPhase: (gameId: string, phase: GamePhase) => Promise<boolean>;
  stop: (gameId: string, endedPhase: GamePhase) => Promise<boolean>;
  join: (gameId: string, p: JoinInput) => Promise<boolean>;
  leave: (gameId: string, uid: string) => Promise<boolean>;
  remove: (gameId: string) => Promise<boolean>;
}

export const useGameStore = create<GameState>((set, get) => {
  /** (Re)subscribe to the current game's participants when it changes. */
  function syncParticipants(games: Game[]) {
    const cur = currentGame(games);
    const id = cur?.id ?? null;
    if (id === get()._partsGameId) return;
    get()._unsubParts?.();
    set({ _partsGameId: id, participants: [] });
    if (!id) return set({ _unsubParts: null });
    const unsub = subscribeParticipants(
      id,
      (participants) => set({ participants }),
      () => set({ error: "Couldn't load who's in the game." }),
    );
    set({ _unsubParts: unsub });
  }

  /** Wrap a write so every action reports busy + surfaces errors. */
  async function run<T>(fn: () => Promise<T>, fallbackMsg: string): Promise<T | null> {
    set({ busy: true, error: null });
    try {
      const out = await fn();
      set({ busy: false });
      return out;
    } catch (err) {
      console.error(fallbackMsg, err);
      set({ busy: false, error: fallbackMsg });
      return null;
    }
  }

  return {
    games: [],
    participants: [],
    status: "idle",
    busy: false,
    error: null,
    preview: false,
    _unsubGames: null,
    _unsubParts: null,
    _partsGameId: null,

    init: () => {
      if (get()._unsubGames || get().preview) return;
      if (isPreviewActive()) {
        const SELF = "preview-uid"; // the preview user's uid (see dev/preview.ts)
        const isDm = useAuthStore.getState().identity.playerType === "dm";
        let game = previewGame();
        let parts = previewParticipants();
        if (isDm) {
          // Make the preview user the DM so DM controls are visible.
          game = { ...game, dmUid: SELF, dmName: "You (DM)" };
          parts = [
            { ...parts[0], uid: SELF, name: "You (DM)" },
            { ...parts[1], uid: "preview-p1" },
            parts[2],
          ];
        }
        set({ preview: true, games: [game], participants: parts, status: "loaded" });
        return;
      }
      set({ status: "loading", error: null });
      const unsub = subscribeGames(
        (games) => {
          set({ games, status: "loaded" });
          syncParticipants(games);
        },
        () => set({ status: "error", error: "Couldn't load the game." }),
      );
      set({ _unsubGames: unsub });
    },

    stopSync: () => {
      get()._unsubGames?.();
      get()._unsubParts?.();
      set({ _unsubGames: null, _unsubParts: null, _partsGameId: null });
    },

    clearError: () => set({ error: null }),

    // --- Actions (preview mutates local state; otherwise hits Firestore) ---

    hostGame: async (input) => {
      if (get().preview) {
        const g = { ...previewGame(), id: "preview-game", title: input.title, dmName: input.dmName };
        set({ games: [g] });
        return g.id;
      }
      return run(() => createGame(input), "Couldn't start the game.");
    },

    begin: async (gameId) => {
      if (get().preview) {
        set((s) => ({ games: s.games.map((g) => (g.id === gameId ? { ...g, status: "active", startedAt: Date.now() } : g)) }));
        return true;
      }
      return (await run(() => startGame(gameId), "Couldn't begin the game.")) !== null;
    },

    setPhase: async (gameId, phase) => {
      if (get().preview) {
        set((s) => ({ games: s.games.map((g) => (g.id === gameId ? { ...g, phase } : g)) }));
        return true;
      }
      return (await run(() => setGamePhase(gameId, phase), "Couldn't change the phase.")) !== null;
    },

    stop: async (gameId, endedPhase) => {
      if (get().preview) {
        set((s) => ({ games: s.games.map((g) => (g.id === gameId ? { ...g, status: "ended", endedPhase } : g)) }));
        return true;
      }
      return (await run(() => endGame(gameId, endedPhase), "Couldn't stop the game.")) !== null;
    },

    join: async (gameId, p) => {
      if (get().preview) {
        set((s) => ({
          participants: s.participants.some((x) => x.uid === p.uid)
            ? s.participants
            : [...s.participants, { ...p, subclassId: p.subclassId ?? null, joinedAt: Date.now(), lastSeen: Date.now() }],
        }));
        return true;
      }
      return (await run(() => joinGame(gameId, p), "Couldn't join the game.")) !== null;
    },

    leave: async (gameId, uid) => {
      if (get().preview) {
        set((s) => ({ participants: s.participants.filter((x) => x.uid !== uid) }));
        return true;
      }
      return (await run(() => leaveGame(gameId, uid), "Couldn't leave the game.")) !== null;
    },

    remove: async (gameId) => {
      if (get().preview) {
        set((s) => ({ games: s.games.filter((g) => g.id !== gameId) }));
        return true;
      }
      return (await run(() => deleteGame(gameId), "Couldn't remove the game.")) !== null;
    },
  };
});
