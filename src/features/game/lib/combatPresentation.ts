import { sheetVitals } from "@/features/hunter/lib/papersheet";
import type { Combatant, EncounterState, HunterCard } from "@/types";

/** Rows from finished battles stay in the session record but never appear in
 * the active encounter's initiative order. */
export function encounterCombatants(combatants: Combatant[], encounter: EncounterState): Combatant[] {
  return combatants.filter((combatant) => (combatant.encounterId ?? 0) === encounter.encounterId);
}

export interface CombatVitals {
  currentHp: number | null;
  maxHp: number | null;
  damageTaken: number | null;
  ac: number | null;
}

/** Hunters read only values recorded on the current character sheet. The app
 * no longer derives HP or AC from superseded class and equipment catalogs. */
export function combatVitals(combatant: Combatant, characters: HunterCard[]): CombatVitals {
  if (combatant.kind === "monster") {
    const max = combatant.maxHp ?? null;
    const current = combatant.currentHp ?? max;
    return { currentHp: current, maxHp: max, damageTaken: max === null || current === null ? null : Math.max(0, max - current), ac: combatant.ac ?? null };
  }

  const card = combatant.characterId ? characters.find((candidate) => candidate.id === combatant.characterId) : undefined;
  if (!card) return { currentHp: combatant.currentHp ?? null, maxHp: combatant.maxHp ?? null, damageTaken: null, ac: combatant.ac ?? null };
  const vitals = sheetVitals(card.sheet);
  const max = combatant.maxHp ?? vitals.hpMax;
  const current = combatant.currentHp ?? vitals.hpCur ?? card.currentHp ?? null;
  return {
    currentHp: current,
    maxHp: max,
    damageTaken: current === null || max === null ? null : Math.max(0, max - current),
    ac: combatant.ac ?? vitals.ac,
  };
}

/** The Initiative box is already the player's recorded modifier. Blank legacy
 * sheets get +0; no Dexterity formula is inferred from an absent rule. */
export function participantInitiative(card: HunterCard | undefined): number {
  const value = card?.sheet?.initiative;
  if (typeof value !== "string") return 0;
  const parsed = Number.parseInt(value.trim(), 10);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function hasSavedBattle(encounter: EncounterState): boolean {
  return encounter.round > 1 || encounter.turnId !== null;
}
