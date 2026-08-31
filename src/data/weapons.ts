export interface WeaponFacts {
  damage: string;
  damageType: string;
  properties: string;
  mastery: string;
  attack: "Melee" | "Ranged";
  /** Weapons table section — core-rulebook.txt [page 111]. Absent for the
   * Hunter Cleaver, which the beta table does not list. */
  category?: "Simple" | "Martial";
}

export const WEAPON_FACTS: Record<string, WeaponFacts> = {
  // --- Simple Melee ---
  club: { damage: "1d4", damageType: "Bludgeoning", properties: "Light", mastery: "Slow", attack: "Melee", category: "Simple" },
  dagger: { damage: "1d4", damageType: "Piercing", properties: "Finesse, Light, Thrown (20/60)", mastery: "Nick", attack: "Melee", category: "Simple" },
  greatclub: { damage: "1d8", damageType: "Bludgeoning", properties: "Two-Handed", mastery: "Push", attack: "Melee", category: "Simple" },
  handaxe: { damage: "1d6", damageType: "Slashing", properties: "Light, Thrown (20/60)", mastery: "Vex", attack: "Melee", category: "Simple" },
  javelin: { damage: "1d6", damageType: "Piercing", properties: "Thrown (30/120)", mastery: "Slow", attack: "Melee", category: "Simple" },
  "light-hammer": { damage: "1d4", damageType: "Bludgeoning", properties: "Light, Thrown (20/60)", mastery: "Nick", attack: "Melee", category: "Simple" },
  mace: { damage: "1d6", damageType: "Bludgeoning", properties: "—", mastery: "Sap", attack: "Melee", category: "Simple" },
  sickle: { damage: "1d4", damageType: "Slashing", properties: "Light", mastery: "Nick", attack: "Melee", category: "Simple" },
  spear: { damage: "1d6", damageType: "Piercing", properties: "Thrown (20/60), Versatile (1d8)", mastery: "Sap", attack: "Melee", category: "Simple" },

  // --- Simple Ranged ---
  "throwing-knife": { damage: "1d4", damageType: "Piercing", properties: "Finesse, Thrown (20/60)", mastery: "Vex", attack: "Ranged", category: "Simple" },

  // --- Martial Melee ---
  battleaxe: { damage: "1d8", damageType: "Slashing", properties: "Versatile (1d10)", mastery: "Topple", attack: "Melee", category: "Martial" },
  flail: { damage: "1d8", damageType: "Bludgeoning", properties: "—", mastery: "Sap", attack: "Melee", category: "Martial" },
  glaive: { damage: "1d10", damageType: "Slashing", properties: "Heavy, Reach, Two-Handed", mastery: "Graze", attack: "Melee", category: "Martial" },
  greataxe: { damage: "1d12", damageType: "Slashing", properties: "Heavy, Two-Handed", mastery: "Cleave", attack: "Melee", category: "Martial" },
  greatsword: { damage: "2d6", damageType: "Slashing", properties: "Heavy, Two-Handed", mastery: "Graze", attack: "Melee", category: "Martial" },
  halberd: { damage: "1d10", damageType: "Slashing", properties: "Heavy, Reach, Two-Handed", mastery: "Cleave", attack: "Melee", category: "Martial" },
  longsword: { damage: "1d8", damageType: "Slashing", properties: "Versatile (1d10)", mastery: "Sap", attack: "Melee", category: "Martial" },
  maul: { damage: "2d6", damageType: "Bludgeoning", properties: "Heavy, Two-Handed", mastery: "Topple", attack: "Melee", category: "Martial" },
  morningstar: { damage: "1d8", damageType: "Piercing", properties: "—", mastery: "Sap", attack: "Melee", category: "Martial" },
  pike: { damage: "1d10", damageType: "Piercing", properties: "Heavy, Reach, Two-Handed", mastery: "Push", attack: "Melee", category: "Martial" },
  rapier: { damage: "1d8", damageType: "Piercing", properties: "Finesse", mastery: "Vex", attack: "Melee", category: "Martial" },
  scimitar: { damage: "1d6", damageType: "Slashing", properties: "Finesse, Light", mastery: "Nick", attack: "Melee", category: "Martial" },
  shortsword: { damage: "1d6", damageType: "Piercing", properties: "Finesse, Light", mastery: "Vex", attack: "Melee", category: "Martial" },
  trident: { damage: "1d8", damageType: "Piercing", properties: "Thrown (20/60), Versatile (1d10)", mastery: "Topple", attack: "Melee", category: "Martial" },
  warhammer: { damage: "1d8", damageType: "Bludgeoning", properties: "Versatile (1d10)", mastery: "Push", attack: "Melee", category: "Martial" },
  "war-pick": { damage: "1d8", damageType: "Piercing", properties: "Versatile (1d10)", mastery: "Sap", attack: "Melee", category: "Martial" },
  whip: { damage: "1d4", damageType: "Slashing", properties: "Finesse, Reach", mastery: "Slow", attack: "Melee", category: "Martial" },

  // --- Martial Ranged ---
  "hunter-rifle": { damage: "1d10", damageType: "Piercing", properties: "Ammunition (100/400; Bullet), Two-Handed", mastery: "Slow", attack: "Ranged", category: "Martial" },
  pistol: { damage: "1d10", damageType: "Piercing", properties: "Ammunition (30/90; Bullet)", mastery: "Vex", attack: "Ranged", category: "Martial" },

  // --- Not on the weapons table ---
  "hunter-cleaver": { damage: "—", damageType: "DM-set", properties: "Unique Scout weapon; statistics set by the DM", mastery: "—", attack: "Melee" },
  "unarmed-strike": { damage: "1 + STR mod", damageType: "Bludgeoning", properties: "Minimum 1 damage; Grapple and Shove are options of this attack", mastery: "—", attack: "Melee" },
};

export const WEAPON_MASTERY_DESCRIPTIONS: Record<string, string> = {
  Cleave: "After a melee hit, make one extra attack against a second creature beside the first. The extra hit deals weapon damage without your ability modifier (once per turn).",
  Graze: "On a miss, deal damage equal to the ability modifier used for the attack.",
  Nick: "Make the Light weapon's extra attack during the Attack action instead of using a Bonus Action (once per turn).",
  Push: "On a hit, push a Large or smaller creature up to 10 feet straight away from you.",
  Sap: "On a hit, the target has Disadvantage on its next attack before your next turn.",
  Slow: "On a damaging hit, reduce the target's Speed by 10 feet until your next turn. Hits from several Slow weapons don't stack beyond 10 feet.",
  Topple: "On a hit, force a Constitution save (DC 8 + the ability modifier used for the attack + your Proficiency Bonus). On a failure, the target falls Prone.",
  Vex: "After you hit and deal damage, gain Advantage on your next attack against that creature before the end of your next turn.",
};

/** Weapon property definitions — core-rulebook.txt [pages 109–110]. */
export const WEAPON_PROPERTY_DESCRIPTIONS: Record<string, string> = {
  Ammunition: "You can use a weapon that has the Ammunition property to make a ranged attack only if you have ammunition to fire from it. The type of ammunition required is specified with the weapon's range. Each attack expends one piece of ammunition. Drawing the ammunition is part of the attack (you need a free hand to load a one-handed weapon).",
  Finesse: "When making an attack with a Finesse weapon, use your choice of your Strength or Dexterity modifier for the attack and damage rolls. You must use the same modifier for both rolls.",
  Heavy: "You have Disadvantage on attack rolls with a Heavy weapon if it's a Melee weapon and your Strength score isn't at least 13 or if it's a Ranged weapon and your Dexterity score isn't at least 13.",
  Light: "When you take the Attack action on your turn and attack with a Light weapon, you can make one extra attack as a Bonus Action later on the same turn. That extra attack must be made with a different Light weapon, and you don't add your ability modifier to the extra attack's damage unless that modifier is negative.",
  Loading: "You can fire only one piece of ammunition from a Loading weapon when you use an action, a Bonus Action, or a Reaction to fire it, regardless of the number of attacks you can normally make.",
  Range: "A Range weapon has a range in parentheses after the Ammunition or Thrown property. The range lists two numbers. The first is the weapon's normal range in feet, and the second is the weapon's long range. When attacking a target beyond normal range, you have Disadvantage on the attack roll. You can't attack a target beyond the long range.",
  "Close Range": "If a Range weapon has the Close Range property it does not have disadvantage on Attack Rolls on targets within 5 feet.",
  Reach: "A Reach weapon adds 5 feet to your reach when you attack with it, as well as when determining your reach for Opportunity Attacks with it.",
  Thrown: "If a weapon has the Thrown property, you can throw the weapon to make a ranged attack, and you can draw that weapon as part of the attack. If the weapon is a Melee weapon, use the same ability modifier for the attack and damage rolls that you use for a melee attack with that weapon.",
  "Two-Handed": "A Two-Handed weapon requires two hands when you attack with it.",
  Versatile: "A Versatile weapon can be used with one or two hands. A damage value in parentheses appears with the property. The weapon deals that damage when used with two hands to make a melee attack.",
};

/** Definitions for the properties named in a weapon's properties string,
 * for the small properties line under a weapon. */
export function weaponPropertyHelp(properties: string | undefined): string | undefined {
  if (!properties) return undefined;
  const lines = Object.keys(WEAPON_PROPERTY_DESCRIPTIONS)
    .filter((name) => properties.includes(name))
    .map((name) => `${name}: ${WEAPON_PROPERTY_DESCRIPTIONS[name]}`);
  return lines.length ? lines.join("\n\n") : undefined;
}

export function weaponDamageLabel(facts: WeaponFacts | undefined): string {
  return facts ? `${facts.damage} ${facts.damageType}` : "—";
}
