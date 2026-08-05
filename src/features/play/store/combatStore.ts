import { create } from "zustand";
import type { Combatant, EncounterState, Game } from "@/types";
import {
  subscribeCombatants,
  addCombatant,
  addCombatants,
  patchCombatant,
  removeCombatant,
  clearCombatants,
} from "@/api/combat";
import { useGameStore } from "./gameStore";
import { isPreviewActive, previewCombatants } from "@/dev/preview";
import {
  effectiveTimerPhase,
  emptyEncounter,
  pauseTurnTimer,
  resumeTurnTimer,
  startTurnTimer,
  timerForCombatant,
} from "../lib/turnTimer";

function rollD20(): number {
  return Math.floor(Math.random() * 20) + 1;
}

/** Combatants in initiative order (desc), tie-break by name. */
export function initiativeOrder(combatants: Combatant[]): Combatant[] {
  return [...combatants].sort((a, b) => b.initiative - a.initiative || a.name.localeCompare(b.name));
}

let previewSeq = 0;
function previewId(): string {
  previewSeq += 1;
  return `prev-combatant-${previewSeq}`;
}

export interface PcSeed {
  characterId: string;
  name: string;
  dexMod: number;
  isWarden: boolean;
}
export interface MonsterInput {
  name: string;
  initiative: number;
  maxHp: number;
  ac: number | null;
  note?: string | null;
}

interface CombatState {
  combatants: Combatant[];
  busy: boolean;
  error: string | null;
  preview: boolean;
  _unsub: (() => void) | null;
  _gameId: string | null;

  sync: (gameId: string | null) => void;
  stop: () => void;

  startEncounter: (gameId: string, pcs: PcSeed[]) => Promise<boolean>;
  /** Starts the standalone Game-page encounter without clearing enemies that
   * the DM already prepared. Existing PC rows are reused on resume. */
  startSessionEncounter: (
    gameId: string,
    pcs: PcSeed[],
    existing: Combatant[],
    encounter: EncounterState,
  ) => Promise<boolean>;
  addMonster: (gameId: string, m: MonsterInput) => Promise<boolean>;
  patch: (gameId: string, id: string, partial: Partial<Combatant>) => Promise<boolean>;
  remove: (
    gameId: string,
    id: string,
    game?: Game,
    combatants?: Combatant[],
  ) => Promise<boolean>;
  toggleCondition: (
    gameId: string,
    c: Combatant,
    conditionId: string,
    round: number,
  ) => Promise<boolean>;
  nextTurn: (gameId: string, game: Game, combatants: Combatant[]) => Promise<boolean>;
  designateWarden: (gameId: string, game: Game, combatants: Combatant[], id: string) => Promise<boolean>;
  startTimer: (gameId: string, game: Game) => Promise<boolean>;
  pauseTimer: (gameId: string, game: Game) => Promise<boolean>;
  resumeTimer: (gameId: string, game: Game) => Promise<boolean>;
  endEncounter: (gameId: string) => Promise<boolean>;
  /** Stops the turn clock but retains combatants as session history. */
  closeSessionEncounter: (gameId: string, encounter: EncounterState) => Promise<boolean>;
}

const setCombat = async (gameId: string, combat: EncounterState) => {
  const result = await useGameStore.getState().setCombat(gameId, combat);
  if (isPreviewActive() && typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("cs-preview-combat", { detail: { gameId, combat } }));
  }
  return result;
};

export const useCombatStore = create<CombatState>((set, get) => {
  async function run<T>(fn: () => Promise<T>, msg: string): Promise<T | null> {
    set({ busy: true, error: null });
    try {
      const out = await fn();
      set({ busy: false });
      return out;
    } catch (err) {
      console.error(msg, err);
      set({ busy: false, error: msg });
      return null;
    }
  }

  return {
    combatants: [],
    busy: false,
    error: null,
    preview: false,
    _unsub: null,
    _gameId: null,

    sync: (gameId) => {
      if (isPreviewActive()) {
        if (!get().preview) set({ preview: true, combatants: previewCombatants() });
        return;
      }
      if (gameId === get()._gameId && get()._unsub) return;
      get()._unsub?.();
      if (!gameId) {
        set({ _unsub: null, _gameId: null, combatants: [] });
        return;
      }
      set({ _gameId: gameId, combatants: [] });
      const unsub = subscribeCombatants(
        gameId,
        (combatants) => set({ combatants }),
        () => set({ error: "Couldn't load combat." }),
      );
      set({ _unsub: unsub });
    },

    stop: () => {
      get()._unsub?.();
      set({ _unsub: null, _gameId: null });
    },

    startEncounter: async (gameId, pcs) => {
      const seeded = pcs.map((p) => ({
        kind: "pc" as const,
        name: p.name,
        characterId: p.characterId,
        initiative: rollD20() + p.dexMod,
        ac: null,
        maxHp: null,
        currentHp: null,
        conditions: [] as string[],
        isWarden: p.isWarden,
      }));
      if (get().preview) {
        const local: Combatant[] = seeded.map((s) => ({ ...s, id: previewId(), createdAt: Date.now() }));
        set({ combatants: local });
        const order = initiativeOrder(local);
        const top = order[0];
        const designatedWardenId = order.find((c) => c.isWarden)?.id ?? null;
        await setCombat(gameId, {
          active: true,
          round: 1,
          turnId: top?.id ?? null,
          designatedWardenId,
          ...timerForCombatant(top, designatedWardenId),
        });
        return true;
      }
      const created = await run(async () => {
          await clearCombatants(gameId);
          return Promise.all(
            seeded.map(async (combatant) => ({
              ...combatant,
              id: await addCombatant(gameId, combatant),
              createdAt: Date.now(),
            })),
          );
        }, "Couldn't start the encounter.");
      if (!created) return false;
      const order = initiativeOrder(created);
      const top = order[0];
      const designatedWardenId = order.find((c) => c.isWarden)?.id ?? null;
      return setCombat(gameId, {
        active: true,
        round: 1,
        turnId: top?.id ?? null,
        designatedWardenId,
        ...timerForCombatant(top, designatedWardenId),
      });
    },

    startSessionEncounter: async (gameId, pcs, existing, encounter) => {
      const existingCharacterIds = new Set(
        existing.filter((combatant) => combatant.kind === "pc").map((combatant) => combatant.characterId),
      );
      const missing = pcs
        .filter((pc) => !existingCharacterIds.has(pc.characterId))
        .map((pc) => ({
          kind: "pc" as const,
          name: pc.name,
          characterId: pc.characterId,
          initiative: rollD20() + pc.dexMod,
          ac: null,
          maxHp: null,
          currentHp: null,
          conditions: [] as string[],
          isWarden: pc.isWarden,
        }));
      let created: Combatant[] = [];
      if (get().preview) {
        created = missing.map((combatant) => ({ ...combatant, id: previewId(), createdAt: Date.now() }));
        if (created.length > 0) {
          set((state) => ({ combatants: [...state.combatants, ...created] }));
        }
      } else if (missing.length > 0) {
        const result = await run(
          () => addCombatants(gameId, missing),
          "Couldn't add the Hunters to combat.",
        );
        if (!result) return false;
        created = result;
      }
      const order = initiativeOrder([...existing, ...created]);
      if (order.length === 0) return false;
      const first = order.find((combatant) => combatant.id === encounter.turnId) ?? order[0];
      const savedWarden = order.find((combatant) => combatant.id === encounter.designatedWardenId && combatant.isWarden);
      const designatedWardenId = savedWarden?.id ?? order.find((combatant) => combatant.isWarden)?.id ?? null;
      return setCombat(gameId, {
        active: true,
        round: Math.max(1, encounter.round),
        turnId: first.id,
        designatedWardenId,
        ...timerForCombatant(first, designatedWardenId),
      });
    },

    addMonster: async (gameId, m) => {
      const data = {
        kind: "monster" as const,
        name: m.name,
        characterId: null,
        initiative: m.initiative,
        ac: m.ac,
        maxHp: m.maxHp,
        currentHp: m.maxHp,
        conditions: [] as string[],
        note: m.note ?? null,
        isWarden: false,
      };
      if (get().preview) {
        set((s) => ({ combatants: [...s.combatants, { ...data, id: previewId(), createdAt: Date.now() }] }));
        return true;
      }
      return (await run(() => addCombatant(gameId, data), "Couldn't add the monster.")) !== null;
    },

    patch: async (gameId, id, partial) => {
      // Optimistic local echo so rapid taps read fresh state; the
      // latency-compensated snapshot then confirms or corrects.
      set((s) => ({ combatants: s.combatants.map((c) => (c.id === id ? { ...c, ...partial } : c)) }));
      if (get().preview) return true;
      return (await run(() => patchCombatant(gameId, id, partial), "Couldn't update the combatant.")) !== null;
    },

    remove: async (gameId, id, game, combatants) => {
      // Deleting the combatant whose turn it is would orphan game.combat.turnId
      // (no highlight; Next turn restarts from the top without bumping the
      // round). Hand the turn to the next in order first.
      if (game?.combat?.active && combatants) {
        const order = initiativeOrder(combatants);
        const idx = order.findIndex((c) => c.id === id);
        const rest = order.filter((c) => c.id !== id);
        const designatedWardenId = game.combat.designatedWardenId === id
          ? rest.find((combatant) => combatant.isWarden)?.id ?? null
          : game.combat.designatedWardenId;
        let round = game.combat.round ?? 1;
        let turnId = game.combat.turnId;
        if (game.combat.turnId === id) {
          turnId = null;
          if (rest.length > 0 && idx >= 0) {
            if (idx >= rest.length) {
              round += 1; // the removed combatant was last in the round
              turnId = rest[0].id;
            } else {
              turnId = rest[idx].id; // whoever slid into its slot is up next
            }
          }
        }
        const next = rest.find((c) => c.id === turnId);
        const timerChanged = game.combat.turnId === id
          || (game.combat.designatedWardenId !== designatedWardenId && next?.id === designatedWardenId);
        await setCombat(gameId, {
          ...game.combat,
          active: true,
          round,
          turnId,
          designatedWardenId,
          ...(timerChanged
            ? next
              ? timerForCombatant(next, designatedWardenId)
              : { timerPhase: "idle" as const, timerEndsAt: null, pausedRemainingMs: null }
            : {}),
        });
      }
      if (get().preview) {
        set((s) => ({ combatants: s.combatants.filter((c) => c.id !== id) }));
        return true;
      }
      return (await run(() => removeCombatant(gameId, id), "Couldn't remove the combatant.")) !== null;
    },

    toggleCondition: async (gameId, c, conditionId, round) => {
      // Read the latest from the store (not the possibly-stale prop) so rapid
      // toggles don't clobber each other.
      const current = get().combatants.find((x) => x.id === c.id) ?? c;
      const on = current.conditions.includes(conditionId);
      const conditions = on
        ? current.conditions.filter((x) => x !== conditionId)
        : [...current.conditions, conditionId];
      // Track the round a condition was applied so rows can show its duration.
      const conditionSince = { ...(current.conditionSince ?? {}) };
      if (on) delete conditionSince[conditionId];
      else conditionSince[conditionId] = Math.max(1, round);
      return get().patch(gameId, c.id, { conditions, conditionSince });
    },

    nextTurn: async (gameId, game, combatants) => {
      const order = initiativeOrder(combatants);
      if (order.length === 0) return false;
      const currentId = game.combat?.turnId ?? order[0].id;
      const idx = order.findIndex((c) => c.id === currentId);
      const nextIdx = idx + 1;
      let round = game.combat?.round ?? 1;
      let turnId: string;
      if (nextIdx >= order.length) {
        round += 1;
        turnId = order[0].id;
      } else {
        turnId = order[nextIdx].id;
      }
      const next = order.find((c) => c.id === turnId);
      const encounter = game.combat ?? emptyEncounter();
      return setCombat(gameId, {
        ...encounter,
        active: true,
        round,
        turnId,
        ...timerForCombatant(next, encounter.designatedWardenId),
      });
    },

    designateWarden: async (gameId, game, combatants, id) => {
      const encounter = game.combat ?? emptyEncounter();
      const designatedWardenId = combatants.some((c) => c.id === id && c.isWarden) ? id : null;
      const current = combatants.find((c) => c.id === encounter.turnId);
      const affected = current?.id === encounter.designatedWardenId || current?.id === designatedWardenId;
      return setCombat(gameId, {
        ...encounter,
        designatedWardenId,
        ...(affected ? timerForCombatant(current, designatedWardenId) : {}),
      });
    },

    startTimer: async (gameId, game) => {
      const encounter = game.combat ?? emptyEncounter();
      if (encounter.timerPhase !== "briefing") return false;
      return setCombat(gameId, startTurnTimer(encounter));
    },

    pauseTimer: async (gameId, game) => {
      const encounter = game.combat ?? emptyEncounter();
      if (effectiveTimerPhase(encounter) !== "running") return false;
      return setCombat(gameId, pauseTurnTimer(encounter));
    },

    resumeTimer: async (gameId, game) => {
      const encounter = game.combat ?? emptyEncounter();
      if (encounter.timerPhase !== "paused") return false;
      return setCombat(gameId, resumeTurnTimer(encounter));
    },

    endEncounter: async (gameId) => {
      if (get().preview) {
        set({ combatants: [] });
        await setCombat(gameId, emptyEncounter());
        return true;
      }
      const ok = (await run(() => clearCombatants(gameId), "Couldn't end the encounter.")) !== null;
      // Keep combat marked active if the clear failed, so we never show
      // "not in combat" while orphan combatants linger.
      if (ok) await setCombat(gameId, emptyEncounter());
      return ok;
    },

    closeSessionEncounter: async (gameId, encounter) => setCombat(gameId, {
      ...encounter,
      active: false,
      timerPhase: "idle",
      timerEndsAt: null,
      pausedRemainingMs: null,
    }),
  };
});
