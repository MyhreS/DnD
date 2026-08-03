/** D&D-standard ability modifier; matches the handbook's table. */
export function abilityModifier(score: number): number {
  return Math.floor((score - 10) / 2);
}
