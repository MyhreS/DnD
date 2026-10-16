/** What a change of a Hunter's battle HP means under core-rulebook.txt
 * [page 21] (Dying, Instant Death) and [page 45] (Not Tonight!).
 *
 * - Not Tonight!: "Before gaining Dying or dying from Instant Death caused by
 *   damage, resolve Not Tonight! if you have it" — the Hunter stays at 1 HP and
 *   the feature is expended.
 * - Instant Death: "When damage reduces you to 0 Hit Points, you die
 *   immediately if the remaining damage equals or exceeds your Hit Point
 *   maximum."
 * - Dying: reaching 0 HP otherwise gives Dying and Unconscious; regaining Hit
 *   Points ends Dying. */
export type HunterDamageOutcome =
  | { kind: "not-tonight"; hp: 1 }
  | { kind: "instant-death"; hp: number }
  | { kind: "dying"; hp: number }
  | { kind: "recovered"; hp: number }
  | { kind: "normal"; hp: number };

export function hunterDamageOutcome(previousHp: number, nextHp: number, maxHp: number, holdsNotTonight: boolean): HunterDamageOutcome {
  const tookDamage = nextHp < previousHp;
  if (tookDamage && nextHp <= 0 && previousHp > 0 && holdsNotTonight) return { kind: "not-tonight", hp: 1 };
  if (tookDamage && nextHp <= -maxHp) return { kind: "instant-death", hp: nextHp };
  if (nextHp <= 0) return { kind: "dying", hp: nextHp };
  if (previousHp <= 0) return { kind: "recovered", hp: nextHp };
  return { kind: "normal", hp: nextHp };
}

export const DYING_CONDITIONS = ["dying", "unconscious"] as const;
