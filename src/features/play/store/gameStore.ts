import { create } from "zustand";
import type { Game, GameParticipant, GamePhase, GameLocation, EncounterState } from "@/types";
import {
  subscribeGames,
  subscribeParticipants,
  createGame,
  startGame,
  setGamePhase,
  setGameLocation,
  setGameCombat,
  endGame,
  deleteGame,
  joinGame,
  leaveGame,
  purgeLoot,
  seedSandboxParticipants,
  type CreateGameInput,
  type JoinInput,
} from "@/api/games";
import { isPreviewActive, previewGame, previewParticipants } from "@/dev/preview";
import { useAuthStore } from "@/features/auth/store/authStore";
import { useCampaignStore } from "@/features/campaigns/store/campaignStore";
import { purgeArchive } from "@/api/players";

type Status = "idle" | "loading" | "loaded" | "error";

/** The live game the party should be looking at: newest non-sandbox game in the
 * active campaign that hasn't ended. (Sandbox/test-run games are separate.) */
export function currentGame(games: Game[], campaignId?: string | null): Game | null {
  return (
    games.find(
      (g) =>
        !g.sandbox &&
        g.status !== "ended" &&
        (campaignId == null || g.campaignId === campaignId),
    ) ?? null
  );
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
  _gamesCampaignId: string | null;

  init: (campaignId: string | null) => void;
  stopSync: () => void;
  clearError: () => void;

  hostGame: (input: CreateGameInput) => Promise<string | null>;
  begin: (gameId: string) => Promise<boolean>;
  setPhase: (gameId: string, phase: GamePhase) => Promise<boolean>;
  setLocation: (gameId: string, location: GameLocation) => Promise<boolean>;
  setCombat: (gameId: string, combat: EncounterState) => Promise<boolean>;
  stop: (gameId: string, endedPhase: GamePhase, endedLocation?: GameLocation) => Promise<boolean>;
  join: (gameId: string, p: JoinInput) => Promise<boolean>;
  leave: (gameId: string, uid: string) => Promise<boolean>;
  remove: (gameId: string) => Promise<boolean>;
}

export const useGameStore = create<GameState>((set, get) => {
  /** (Re)subscribe to the current game's participants when it changes. */
  function syncParticipants(games: Game[]) {
    const cur = currentGame(games, get()._gamesCampaignId);
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
    _gamesCampaignId: null,

    init: (campaignId) => {
      if (get().preview) return;
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
        // Dev affordances: `?play=active|ended` and `?phase=` preview game states.
        const params = new URLSearchParams(window.location.search);
        const play = params.get("play");
        if (play === "active") {
          game = { ...game, status: "active", phase: "combat", startedAt: Date.now() };
        } else if (play === "ended") {
          game = {
            ...game,
            status: "ended",
            endedPhase: "long_rest",
            startedAt: Date.now() - 2 * 60 * 60 * 1000,
            endedAt: Date.now(),
          };
        }
        const ph = params.get("phase");
        if (ph && ["exploration", "combat", "short_rest", "long_rest"].includes(ph)) {
          game = { ...game, phase: ph as typeof game.phase };
        }
        set({ preview: true, games: [game], participants: parts, status: "loaded" });
        return;
      }
      if (!campaignId) {
        get()._unsubGames?.();
        get()._unsubParts?.();
        set({ _unsubGames: null, _unsubParts: null, _partsGameId: null, _gamesCampaignId: null, games: [], participants: [], status: "loaded" });
        return;
      }
      if (campaignId === get()._gamesCampaignId && get()._unsubGames) return;
      get()._unsubGames?.();
      set({ status: "loading", error: null, _gamesCampaignId: campaignId });
      const unsub = subscribeGames(
        campaignId,
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
      const ok = (await run(() => startGame(gameId), "Couldn't begin the game.")) !== null;
      if (ok) {
        // A "Test Run" campaign auto-fills with its bot hunters so the table
        // looks populated; bots never act.
        const camp = useCampaignStore.getState().active;
        if (camp?.sandbox) {
          try {
            await seedSandboxParticipants(gameId, camp.id);
          } catch (err) {
            console.error("Couldn't seed test bots", err);
          }
        }
      }
      return ok;
    },

    setPhase: async (gameId, phase) => {
      if (get().preview) {
        set((s) => ({ games: s.games.map((g) => (g.id === gameId ? { ...g, phase } : g)) }));
        return true;
      }
      return (await run(() => setGamePhase(gameId, phase), "Couldn't change the phase.")) !== null;
    },

    setLocation: async (gameId, location) => {
      if (get().preview) {
        set((s) => ({ games: s.games.map((g) => (g.id === gameId ? { ...g, location } : g)) }));
        return true;
      }
      return (
        (await run(() => setGameLocation(gameId, location), "Couldn't change the location.")) !== null
      );
    },

    setCombat: async (gameId, combat) => {
      if (get().preview) {
        set((s) => ({ games: s.games.map((g) => (g.id === gameId ? { ...g, combat } : g)) }));
        return true;
      }
      return (await run(() => setGameCombat(gameId, combat), "Couldn't update combat.")) !== null;
    },

    stop: async (gameId, endedPhase, endedLocation) => {
      if (get().preview) {
        set((s) => ({
          games: s.games.map((g) =>
            g.id === gameId ? { ...g, status: "ended", endedPhase, endedLocation: endedLocation ?? null } : g,
          ),
        }));
        return true;
      }
      // Ending a game purges archived (dead/deleted) characters so they don't
      // pile up between sessions.
      return (
        (await run(async () => {
          await endGame(gameId, endedPhase, endedLocation);
          await purgeArchive();
          await purgeLoot(gameId);
        }, "Couldn't stop the game.")) !== null
      );
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
