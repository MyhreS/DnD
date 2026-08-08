import { getClass } from "@/data/classes";
import { armorClass, isSheetCard, maxHp } from "@/lib/character";
import { sheetVitals } from "@/features/hunter/lib/papersheet";
import type { Combatant, EncounterState, HunterCard } from "@/types";

export interface CombatVitals {
  currentHp: number | null;
  maxHp: number | null;
  damageTaken: number | null;
  ac: number | null;
}

/** Resolve the numbers shared by the Game controls and the second-display
 * Battle Screen. Character sheets remain the source of truth for Hunters;
 * enemy rows use the values snapshotted on their combatant document. */
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
  if (isSheetCard(card)) {
    const vitals = sheetVitals(card.sheet);
    const current = combatant.currentHp ?? vitals.hpCur;
    return {
      currentHp: current,
      maxHp: vitals.hpMax,
      damageTaken: current === null || vitals.hpMax === null
        ? null
        : Math.max(0, vitals.hpMax - current),
      // An AC recorded on the combatant is the DM's encounter-only override.
      // A missing value deliberately falls back to the Hunter sheet.
      ac: combatant.ac ?? vitals.ac,
    };
  }

  const klass = getClass(card.classId);
  const maximum = klass ? maxHp(klass, card.abilities, card.level) : null;
  const current = combatant.currentHp ?? card.currentHp ?? maximum;
  return {
    currentHp: current,
    maxHp: maximum,
    damageTaken: current === null || maximum === null ? null : Math.max(0, maximum - current),
    ac: combatant.ac ?? armorClass(
      card.abilities,
      card.mainArmorId,
      card.addonArmorIds,
      card.studdedAddonIds,
      card.customItems,
    ).total,
  };
}

export function participantInitiative(card: HunterCard | undefined): number {
  if (!card) return 0;
  const sheetValue = card.sheet?.initiative;
  if (typeof sheetValue === "string") {
    const parsed = Number.parseInt(sheetValue.trim(), 10);
    if (Number.isFinite(parsed)) return parsed;
  }
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
