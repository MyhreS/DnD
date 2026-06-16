// A little bestiary of cute gothic creatures. Each player is assigned a unique
// one when they forge their hunter. Sprites live in CreatureSprite.tsx.

export interface Creature {
  id: string;
  name: string;
}

export const CREATURES: Creature[] = [
  { id: "orc", name: "Orc" },
  { id: "goblin", name: "Goblin" },
  { id: "slime", name: "Slime" },
  { id: "bat", name: "Bat" },
  { id: "ghost", name: "Ghost" },
  { id: "skull", name: "Skull" },
  { id: "beholder", name: "Beholder" },
  { id: "crow", name: "Crow" },
  { id: "imp", name: "Imp" },
  { id: "myconid", name: "Myconid" },
];

export const CREATURE_IDS = CREATURES.map((c) => c.id);

export function creatureName(id: string | undefined): string {
  return CREATURES.find((c) => c.id === id)?.name ?? "Critter";
}

/** Pick a creature not already taken by another player (else a random one). */
export function pickUnusedCreature(taken: (string | undefined)[]): string {
  const used = new Set(taken.filter(Boolean) as string[]);
  const free = CREATURE_IDS.filter((id) => !used.has(id));
  const pool = free.length ? free : CREATURE_IDS;
  return pool[Math.floor(Math.random() * pool.length)];
}
