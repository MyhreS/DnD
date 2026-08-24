export interface WeaponFacts {
  damage: string;
  damageType: string;
  properties: string;
  mastery: string;
  attack: "Melee" | "Ranged";
}

export const WEAPON_FACTS: Record<string, WeaponFacts> = {
  dagger: { damage: "1d4", damageType: "Piercing", properties: "Finesse, Light, Thrown (20/60)", mastery: "Nick", attack: "Melee" },
  handaxe: { damage: "1d6", damageType: "Slashing", properties: "Light, Thrown (20/60)", mastery: "Vex", attack: "Melee" },
  sickle: { damage: "1d4", damageType: "Slashing", properties: "Light", mastery: "Nick", attack: "Melee" },
  greataxe: { damage: "1d12", damageType: "Slashing", properties: "Heavy, Two-Handed", mastery: "Cleave", attack: "Melee" },
  greatsword: { damage: "2d6", damageType: "Slashing", properties: "Heavy, Two-Handed", mastery: "Graze", attack: "Melee" },
  longsword: { damage: "1d8", damageType: "Slashing", properties: "Versatile (1d10)", mastery: "Sap", attack: "Melee" },
  scimitar: { damage: "1d6", damageType: "Slashing", properties: "Finesse, Light", mastery: "Nick", attack: "Melee" },
  shortsword: { damage: "1d6", damageType: "Piercing", properties: "Finesse, Light", mastery: "Vex", attack: "Melee" },
  "hunter-rifle": { damage: "1d10", damageType: "Piercing", properties: "Ammunition (100/400; Bullet), Two-Handed", mastery: "Slow", attack: "Ranged" },
  pistol: { damage: "1d10", damageType: "Piercing", properties: "Ammunition (30/90; Bullet)", mastery: "Vex", attack: "Ranged" },
  "hunter-cleaver": { damage: "—", damageType: "DM-set", properties: "Unique Scout weapon; statistics set by the DM", mastery: "—", attack: "Melee" },
};

export const WEAPON_MASTERY_DESCRIPTIONS: Record<string, string> = {
  Cleave: "After a melee hit, make one extra attack against a second creature beside the first. The extra hit deals weapon damage without your ability modifier (once per turn).",
  Graze: "On a miss, deal damage equal to the ability modifier used for the attack.",
  Nick: "Make the Light weapon's extra attack during the Attack action instead of using a Bonus Action (once per turn).",
  Push: "On a hit, push a Large or smaller creature up to 10 feet straight away from you.",
  Sap: "On a hit, the target has Disadvantage on its next attack before your next turn.",
  Slow: "On a damaging hit, reduce the target's Speed by 10 feet until your next turn.",
  Topple: "On a hit, force a Constitution save. On a failure, the target falls Prone.",
  Vex: "After you hit and deal damage, gain Advantage on your next attack against that creature before the end of your next turn.",
};

export function weaponDamageLabel(facts: WeaponFacts | undefined): string {
  return facts ? `${facts.damage} ${facts.damageType}` : "—";
}
