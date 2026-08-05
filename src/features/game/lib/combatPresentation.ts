import { getClass } from "@/data/classes";
import { armorClass, isSheetCard, maxHp } from "@/lib/character";
import { sheetVitals } from "@/features/hunter/lib/papersheet";
import type { Combatant, HunterCard } from "@/types";

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
    return {
      currentHp: vitals.hpCur,
      maxHp: vitals.hpMax,
      damageTaken: vitals.hpCur === null || vitals.hpMax === null
        ? null
        : Math.max(0, vitals.hpMax - vitals.hpCur),
      ac: vitals.ac,
    };
  }

  const klass = getClass(card.classId);
  const maximum = klass ? maxHp(klass, card.abilities, card.level) : null;
  const current = card.currentHp ?? maximum;
  return {
    currentHp: current,
    maxHp: maximum,
    damageTaken: current === null || maximum === null ? null : Math.max(0, maximum - current),
    ac: armorClass(
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

export function isWarden(card: HunterCard | undefined, classId: string, className?: string | null): boolean {
  const sheetClass = typeof card?.sheet?.class === "string" ? card.sheet.class : "";
  return card?.classId === "warden"
    || classId === "warden"
    || /warden/i.test(sheetClass || className || "");
}
