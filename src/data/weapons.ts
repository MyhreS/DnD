import type { AbilityScores, HunterClass, WeaponStats } from "@/types";
import { abilityModifier } from "@/data/abilities";
import { proficiencyBonus } from "@/lib/character";

// Weapon stats for every catalog weapon, from master.json's Weapons table
// (handbook Chapter 5). The Hunter Cleaver is a unique item with NO stats in
// any source — it gets no entry here; the sheet shows "—" and a DM note.

export const WEAPON_STATS: Record<string, WeaponStats> = Object.fromEntries(
  (
    [
      { itemId: "greatsword", category: "Martial", kind: "Melee", damage: "2d6", damageType: "Slashing", properties: ["Heavy", "Two-Handed"], mastery: "Graze" },
      { itemId: "greataxe", category: "Martial", kind: "Melee", damage: "1d12", damageType: "Slashing", properties: ["Heavy", "Two-Handed"], mastery: "Cleave" },
      { itemId: "longsword", category: "Martial", kind: "Melee", damage: "1d8", damageType: "Slashing", properties: ["Versatile (1d10)"], mastery: "Sap" },
      { itemId: "shortsword", category: "Martial", kind: "Melee", damage: "1d6", damageType: "Piercing", properties: ["Finesse", "Light"], mastery: "Vex" },
      { itemId: "scimitar", category: "Martial", kind: "Melee", damage: "1d6", damageType: "Slashing", properties: ["Finesse", "Light"], mastery: "Nick" },
      { itemId: "sickle", category: "Simple", kind: "Melee", damage: "1d4", damageType: "Slashing", properties: ["Light"], mastery: "Nick" },
      { itemId: "handaxe", category: "Simple", kind: "Melee", damage: "1d6", damageType: "Slashing", properties: ["Light", "Thrown (20/60)"], mastery: "Vex" },
      { itemId: "dagger", category: "Simple", kind: "Melee", damage: "1d4", damageType: "Piercing", properties: ["Finesse", "Light", "Thrown (20/60)"], mastery: "Nick" },
      { itemId: "hunter-rifle", category: "Martial", kind: "Ranged", damage: "1d10", damageType: "Piercing", properties: ["Ammunition (100/400; Bullet)", "Two-Handed"], mastery: "Slow" },
      { itemId: "pistol", category: "Martial", kind: "Ranged", damage: "1d10", damageType: "Piercing", properties: ["Ammunition (30/90; Bullet)"], mastery: "Vex" },
    ] satisfies WeaponStats[]
  ).map((w) => [w.itemId, w]),
);

/** What a class's weapon-proficiency string grants. The Stalker's "Martial
 * weapons with the Finesse or Light property" is the partial-Martial case. */
export function weaponProficiencyInfo(klass: Pick<HunterClass, "weaponProficiencies">): {
  simple: boolean;
  martialAll: boolean;
  martialFinesseLight: boolean;
} {
  const s = klass.weaponProficiencies.toLowerCase();
  return {
    simple: s.includes("simple"),
    martialAll: s.includes("simple and martial"),
    martialFinesseLight: s.includes("finesse or light"),
  };
}

/** True when the class is proficient with this weapon. */
export function isProficientWith(
  klass: Pick<HunterClass, "weaponProficiencies">,
  stats: WeaponStats,
): boolean {
  const p = weaponProficiencyInfo(klass);
  if (stats.category === "Simple") return p.simple;
  if (p.martialAll) return true;
  return (
    p.martialFinesseLight &&
    stats.properties.some((prop) => /^(finesse|light)\b/i.test(prop))
  );
}

/** Attack bonus: STR for Melee, DEX for Ranged, best of both for Finesse,
 * plus the Proficiency Bonus when the class is proficient (5e basis). */
export function weaponAttackBonus(
  klass: Pick<HunterClass, "weaponProficiencies"> | undefined,
  abilities: AbilityScores,
  level: number,
  stats: WeaponStats,
): number {
  const str = abilityModifier(abilities.str);
  const dex = abilityModifier(abilities.dex);
  const finesse = stats.properties.some((p) => /^finesse\b/i.test(p));
  const mod = finesse ? Math.max(str, dex) : stats.kind === "Ranged" ? dex : str;
  const prof = klass && isProficientWith(klass, stats) ? proficiencyBonus(level) : 0;
  return mod + prof;
}
