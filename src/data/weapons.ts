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

export function weaponDamageLabel(facts: WeaponFacts | undefined): string {
  return facts ? `${facts.damage} ${facts.damageType}` : "—";
}
