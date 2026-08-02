import { getClass } from "@/data/classes";
import { armorClass, maxHp } from "@/lib/character";
import type { HunterCard } from "@/types";
import type { Combatant } from "../types";

export function toHunterCombatant(card: HunterCard): Combatant | null {
  const klass = getClass(card.classId);
  if (!klass || !card.name) return null;
  const hp = maxHp(klass, card.abilities);
  return {
    id: `hunter-${card.uid}`,
    name: card.name,
    kind: "hunter",
    initiative: null,
    armorClass: armorClass(card.abilities, card.mainArmorId).total,
    maxHp: hp,
    currentHp: card.currentHp ?? hp,
    conditions: [],
    classId: card.classId,
    isWarden: card.classId === "warden",
  };
}

