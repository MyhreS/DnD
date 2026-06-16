// The bestiary — badass fantasy figures. Each player is assigned a unique one
// when they forge their hunter. Sprites live in CreatureSprite.tsx.

export interface Creature {
  id: string;
  name: string;
}

export const CREATURES: Creature[] = [
  { id: "reaper", name: "Reaper" },
  { id: "dark-angel", name: "Dark Angel" },
  { id: "demon", name: "Demon" },
  { id: "knight", name: "Knight" },
  { id: "valkyrie", name: "Valkyrie" },
  { id: "gargoyle", name: "Gargoyle" },
  { id: "wraith", name: "Wraith" },
  { id: "sorcerer", name: "Sorcerer" },
  { id: "vampire", name: "Vampire" },
  { id: "berserker", name: "Berserker" },
];

export const CREATURE_IDS = CREATURES.map((c) => c.id);

export function creatureName(id: string | undefined): string {
  return CREATURES.find((c) => c.id === id)?.name ?? "Hunter's Shadow";
}

/** Pick a creature not already taken by another player (else a random one). */
export function pickUnusedCreature(taken: (string | undefined)[]): string {
  const used = new Set(taken.filter(Boolean) as string[]);
  const free = CREATURE_IDS.filter((id) => !used.has(id));
  const pool = free.length ? free : CREATURE_IDS;
  return pool[Math.floor(Math.random() * pool.length)];
}
