/** The 15 standard 5e conditions, for the combat tracker's per-combatant
 * toggles. Ids line up with the Condition entries in rulesReference.ts. */
export const CONDITIONS: { id: string; name: string }[] = [
  { id: "blinded", name: "Blinded" },
  { id: "charmed", name: "Charmed" },
  { id: "deafened", name: "Deafened" },
  { id: "exhaustion", name: "Exhaustion" },
  { id: "frightened", name: "Frightened" },
  { id: "grappled", name: "Grappled" },
  { id: "incapacitated", name: "Incapacitated" },
  { id: "invisible", name: "Invisible" },
  { id: "paralyzed", name: "Paralyzed" },
  { id: "petrified", name: "Petrified" },
  { id: "poisoned", name: "Poisoned" },
  { id: "prone", name: "Prone" },
  { id: "restrained", name: "Restrained" },
  { id: "stunned", name: "Stunned" },
  { id: "unconscious", name: "Unconscious" },
];

export const CONDITION_NAME: Record<string, string> = Object.fromEntries(
  CONDITIONS.map((c) => [c.id, c.name]),
);
