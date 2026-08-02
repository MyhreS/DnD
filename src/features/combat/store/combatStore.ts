import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  beginCombat,
  expireTurnTimer,
  freshCombatSession,
  moveTurn,
  pauseTurnTimer,
  restartTurnTimer,
  resumeTurnTimer,
  sortByInitiative,
  startTurnTimer,
} from "../lib/combatRules";
import type {
  CombatSession,
  Combatant,
  ManualCombatantInput,
} from "../types";
import type { HunterCard } from "@/types";
import { toHunterCombatant } from "../lib/combatants";

export const COMBAT_STORAGE_KEY = "cs-combat-session-v1";

interface CombatStore {
  session: CombatSession;
  setTitle: (title: string) => void;
  addCombatant: (input: ManualCombatantInput) => void;
  importHunters: (cards: HunterCard[]) => void;
  updateCombatant: (id: string, patch: Partial<Combatant>) => void;
  removeCombatant: (id: string) => void;
  setDesignatedWarden: (id: string | null) => void;
  toggleCondition: (id: string, condition: string) => void;
  adjustHp: (id: string, amount: number) => void;
  startCombat: () => void;
  nextTurn: () => void;
  previousTurn: () => void;
  startTimer: () => void;
  pauseTimer: () => void;
  resumeTimer: () => void;
  restartTimer: () => void;
  expireTimer: (now: number) => void;
  endCombat: () => void;
  clearCombat: () => void;
  replaceSession: (session: CombatSession) => void;
}

function touched(session: CombatSession): CombatSession {
  return { ...session, updatedAt: Date.now() };
}

function makeId(): string {
  return globalThis.crypto?.randomUUID?.() ?? `combatant-${Date.now()}`;
}

export const useCombatStore = create<CombatStore>()(
  persist(
    (set, get) => ({
      session: freshCombatSession(),
      setTitle: (title) => set(({ session }) => ({ session: touched({ ...session, title }) })),
      addCombatant: (input) =>
        set(({ session }) => {
          const max = input.maxHp;
          const combatant: Combatant = {
            id: makeId(),
            ...input,
            currentHp: max,
            conditions: [],
          };
          const designatedWardenId =
            input.isWarden && session.designatedWardenId === null
              ? combatant.id
              : session.designatedWardenId;
          return {
            session: touched({
              ...session,
              combatants: sortByInitiative([...session.combatants, combatant]),
              designatedWardenId,
            }),
          };
        }),
      importHunters: (cards) =>
        set(({ session }) => {
          const existing = new Set(session.combatants.map((c) => c.id));
          const additions = cards
            .filter((card) => card.name && card.classId && !existing.has(`hunter-${card.uid}`))
            .map(toHunterCombatant)
            .filter((c): c is Combatant => c !== null);
          const firstWarden = additions.find((c) => c.isWarden);
          return {
            session: touched({
              ...session,
              combatants: sortByInitiative([...session.combatants, ...additions]),
              designatedWardenId:
                session.designatedWardenId ?? firstWarden?.id ?? null,
            }),
          };
        }),
      updateCombatant: (id, patch) =>
        set(({ session }) => ({
          session: touched({
            ...session,
            combatants: sortByInitiative(
              session.combatants.map((c) => (c.id === id ? { ...c, ...patch } : c)),
            ),
          }),
        })),
      removeCombatant: (id) =>
        set(({ session }) => {
          const combatants = session.combatants.filter((c) => c.id !== id);
          return {
            session: touched({
              ...session,
              combatants,
              designatedWardenId:
                session.designatedWardenId === id
                  ? combatants.find((c) => c.isWarden)?.id ?? null
                  : session.designatedWardenId,
              activeCombatantId:
                session.activeCombatantId === id ? null : session.activeCombatantId,
            }),
          };
        }),
      setDesignatedWarden: (id) =>
        set(({ session }) => ({ session: touched({ ...session, designatedWardenId: id }) })),
      toggleCondition: (id, condition) =>
        set(({ session }) => ({
          session: touched({
            ...session,
            combatants: session.combatants.map((c) => {
              if (c.id !== id) return c;
              const has = c.conditions.includes(condition);
              return {
                ...c,
                conditions: has
                  ? c.conditions.filter((item) => item !== condition)
                  : [...c.conditions, condition],
              };
            }),
          }),
        })),
      adjustHp: (id, amount) =>
        set(({ session }) => ({
          session: touched({
            ...session,
            combatants: session.combatants.map((c) => {
              if (c.id !== id || c.currentHp === null) return c;
              const next = c.currentHp + amount;
              return { ...c, currentHp: Math.max(0, c.maxHp === null ? next : Math.min(c.maxHp, next)) };
            }),
          }),
        })),
      startCombat: () => set(({ session }) => ({ session: beginCombat(session) })),
      nextTurn: () => set(({ session }) => ({ session: moveTurn(session, 1) })),
      previousTurn: () => set(({ session }) => ({ session: moveTurn(session, -1) })),
      startTimer: () => set(({ session }) => ({ session: startTurnTimer(session) })),
      pauseTimer: () => set(({ session }) => ({ session: pauseTurnTimer(session) })),
      resumeTimer: () => set(({ session }) => ({ session: resumeTurnTimer(session) })),
      restartTimer: () => set(({ session }) => ({ session: restartTurnTimer(session) })),
      expireTimer: (now) => {
        const session = get().session;
        const next = expireTurnTimer(session, now);
        if (next !== session) set({ session: next });
      },
      endCombat: () =>
        set(({ session }) => ({
          session: touched({
            ...session,
            round: 0,
            activeCombatantId: null,
            timerPhase: "idle",
            timerEndsAt: null,
            pausedRemainingMs: null,
            started: false,
          }),
        })),
      clearCombat: () => set({ session: freshCombatSession() }),
      replaceSession: (session) => {
        if (get().session.updatedAt !== session.updatedAt) set({ session });
      },
    }),
    {
      name: COMBAT_STORAGE_KEY,
      partialize: (state) => ({ session: state.session }),
    },
  ),
);
