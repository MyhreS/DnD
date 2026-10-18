/** Temporary Hit Points are lost before Hit Points (core-rulebook.txt
 * [page 10]): they soak what they can and the rest reaches HP. */
export function absorbDamage(temp: number, amount: number): { temp: number; rest: number } {
  const absorbed = Math.min(Math.max(0, temp), Math.max(0, amount));
  return { temp: Math.max(0, temp) - absorbed, rest: Math.max(0, amount) - absorbed };
}
