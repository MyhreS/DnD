import { characterSheetInt, characterVitals } from "@/features/hunter/lib/papersheet";
import type { Combatant, EncounterState, HunterCard } from "@/types";

/** Rows from finished battles stay in the session record but never appear in
 * the active encounter's initiative order. Old records without an id are the
 * original encounter. */
export function encounterCombatants(combatants: Combatant[], encounter: EncounterState): Combatant[] {
  return combatants.filter((combatant) => (combatant.encounterId ?? 0) === encounter.encounterId);
}

export interface CombatVitals {
  currentHp: number | null;
  maxHp: number | null;
  damageTaken: number | null;
  ac: number | null;
}

/** Resolve the numbers shared by the Game controls and second-display Battle
 * Screen. Current Hunter decisions are recalculated; enemy rows retain their
 * encounter snapshots. */
export function combatVitals(combatant: Combatant, characters: HunterCard[]): CombatVitals {
  if (combatant.kind === "monster") {
    const max = combatant.maxHp ?? null;
    const current = combatant.currentHp ?? max;
    return {
      currentHp: current,
      maxHp: max,
      damageTaken: max === null || current === null ? null : Math.max(0, max - current),
      ac: combatant.ac ?? null,
    };
  }

  const card = combatant.characterId
    ? characters.find((candidate) => candidate.id === combatant.characterId)
    : undefined;
  if (!card) {
    return { currentHp: null, maxHp: null, damageTaken: null, ac: combatant.ac ?? null };
  }
  const vitals = characterVitals(card);
  const current = combatant.currentHp ?? vitals.hpCur;
  return {
    currentHp: current,
    maxHp: vitals.hpMax,
    damageTaken: current === null || vitals.hpMax === null ? null : Math.max(0, vitals.hpMax - current),
    // An AC recorded on the combatant is the DM's encounter-only override.
    // A missing value deliberately falls back to the current Hunter sheet.
    ac: combatant.ac ?? vitals.ac,
  };
}

export function participantInitiative(card: HunterCard | undefined): number {
  if (!card) return 0;
  const current = characterSheetInt(card, "initiative");
  if (current !== null) return current;
  return Math.floor((card.abilities.dex - 10) / 2);
}

/** A real prior battle always advanced beyond its untouched legacy placeholder
 * or assigned a turn. Removed timer state is deliberately not evidence: older
 * lobbies can contain `untimed` without anyone having opened Battle View. */
export function hasSavedBattle(encounter: EncounterState): boolean {
  return encounter.round > 1 || encounter.turnId !== null;
}

export function isWarden(card: HunterCard | undefined, classId: string, className?: string | null): boolean {
  const sheetClass = typeof card?.sheet?.class === "string" ? card.sheet.class : "";
  return card?.classId === "warden"
    || classId === "warden"
    || /warden/i.test(sheetClass || className || "");
}
