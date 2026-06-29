import { create } from "zustand";
import type { Combatant, EncounterState, Game } from "@/types";
import {
  subscribeCombatants,
  addCombatant,
  patchCombatant,
  removeCombatant,
  clearCombatants,
} from "@/api/combat";
import { useGameStore } from "./gameStore";
import { isPreviewActive, previewCombatants } from "@/dev/preview";

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
}
export interface MonsterInput {
  name: string;
  initiative: number;
  maxHp: number;
  ac: number | null;
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
  addMonster: (gameId: string, m: MonsterInput) => Promise<boolean>;
  patch: (gameId: string, id: string, partial: Partial<Combatant>) => Promise<boolean>;
  remove: (gameId: string, id: string) => Promise<boolean>;
  toggleCondition: (gameId: string, c: Combatant, conditionId: string) => Promise<boolean>;
  nextTurn: (gameId: string, game: Game, combatants: Combatant[]) => Promise<boolean>;
  endEncounter: (gameId: string) => Promise<boolean>;
}

const setCombat = (gameId: string, combat: EncounterState) =>
  useGameStore.getState().setCombat(gameId, combat);

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
      }));
      if (get().preview) {
        const local: Combatant[] = seeded.map((s) => ({ ...s, id: previewId(), createdAt: Date.now() }));
        set({ combatants: local });
        const top = initiativeOrder(local)[0];
        await setCombat(gameId, { active: true, round: 1, turnId: top?.id ?? null });
        return true;
      }
      const ok =
        (await run(async () => {
          await clearCombatants(gameId);
          await Promise.all(seeded.map((s) => addCombatant(gameId, s)));
        }, "Couldn't start the encounter.")) !== null;
      // turnId is resolved by the tracker (top of initiative when null).
      await setCombat(gameId, { active: true, round: 1, turnId: null });
      return ok;
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
      };
      if (get().preview) {
        set((s) => ({ combatants: [...s.combatants, { ...data, id: previewId(), createdAt: Date.now() }] }));
        return true;
      }
      return (await run(() => addCombatant(gameId, data), "Couldn't add the monster.")) !== null;
    },

    patch: async (gameId, id, partial) => {
      if (get().preview) {
        set((s) => ({ combatants: s.combatants.map((c) => (c.id === id ? { ...c, ...partial } : c)) }));
        return true;
      }
      return (await run(() => patchCombatant(gameId, id, partial), "Couldn't update the combatant.")) !== null;
    },

    remove: async (gameId, id) => {
      if (get().preview) {
        set((s) => ({ combatants: s.combatants.filter((c) => c.id !== id) }));
        return true;
      }
      return (await run(() => removeCombatant(gameId, id), "Couldn't remove the combatant.")) !== null;
    },

    toggleCondition: async (gameId, c, conditionId) => {
      const conditions = c.conditions.includes(conditionId)
        ? c.conditions.filter((x) => x !== conditionId)
        : [...c.conditions, conditionId];
      return get().patch(gameId, c.id, { conditions });
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
      return setCombat(gameId, { active: true, round, turnId });
    },

    endEncounter: async (gameId) => {
      if (get().preview) {
        set({ combatants: [] });
        await setCombat(gameId, { active: false, round: 0, turnId: null });
        return true;
      }
      const ok = (await run(() => clearCombatants(gameId), "Couldn't end the encounter.")) !== null;
      await setCombat(gameId, { active: false, round: 0, turnId: null });
      return ok;
    },
  };
});
