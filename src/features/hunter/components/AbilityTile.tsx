import { useState } from "react";
import { abilityModifier, formatModifier } from "@/data/abilities";

interface Props {
  short: string;
  name: string;
  base: number;
  bonus: number;
  final: number;
  /** Whether the background bonus may be applied to this ability. */
  canBonus: boolean;
  /** Cost of the next base + (Maduhausu's escalating repeat prices included);
   * null when the increment is illegal at any price. */
  nextCost: number | null;
  /** Show the cost badge on the + (always in Maduhausu; in point buy only
   * where a + costs more than 1). */
  showCost: boolean;
  /** Blocked reasons, precomputed by the step from abilityBuy.ts — null = allowed. */
  incBlock: string | null;
  decBlock: string | null;
  /** Why the bonus can't go one step higher (null = it can). */
  bonusUpBlock: string | null;
  onBase: (next: number) => void;
  onBonus: (next: number) => void;
}

/** One ability tile: big final score + modifier, the base −/+ controls (with a
 * next-cost badge), and the gold background-bonus token (tap to cycle
 * +0 → +1 → +2 → +0). Blocked controls stay tappable and explain themselves
 * inline — the hint persists until the next tap, no timers. */
export function AbilityTile({
  short, name, base, bonus, final, canBonus,
  nextCost, showCost, incBlock, decBlock, bonusUpBlock,
  onBase, onBonus,
}: Props) {
  const [hint, setHint] = useState<string | null>(null);

  function tapBase(delta: 1 | -1) {
    const block = delta > 0 ? incBlock : decBlock;
    if (block) {
      setHint(block);
      return;
    }
    setHint(null);
    onBase(base + delta);
  }

  // The token cycle: +0 → +1 → +2 → +0. When the next step up is blocked, a
  // token already holding points wraps to +0 (the tap-to-remove path) and the
  // hint says why the raise was skipped; an empty token just shows the reason.
  function tapBonus() {
    if (bonus >= 2) {
      setHint(null);
      onBonus(0);
      return;
    }
    if (!bonusUpBlock) {
      setHint(null);
      onBonus(bonus + 1);
      return;
    }
    if (bonus > 0) {
      setHint(`${bonusUpBlock} Cleared to +0.`);
      onBonus(0);
      return;
    }
    setHint(bonusUpBlock);
  }

  // Only a truly dead tap looks disabled: an empty token that can't be raised.
  const bonusDead = bonus === 0 && !!bonusUpBlock;

  return (
    <div className="ability-tile">
      <div className="tile-head">
        <span className="tile-short">{short}</span>
        <span className="tile-name faint">{name}</span>
      </div>
      <div className="tile-score">{final}</div>
      <div className="tile-mod gold">{formatModifier(abilityModifier(final))}</div>
      <div className="tile-base">
        <button
          type="button"
          className={`btn btn-ghost tile-btn${decBlock ? " is-blocked" : ""}`}
          aria-disabled={decBlock ? true : undefined}
          aria-label={`decrease ${name} base score`}
          onClick={() => tapBase(-1)}
        >
          −
        </button>
        <span className="tile-base-value">
          {base}
          <span className="tile-base-label faint">base</span>
        </span>
        <button
          type="button"
          className={`btn btn-ghost tile-btn${incBlock ? " is-blocked" : ""}`}
          aria-disabled={incBlock ? true : undefined}
          aria-label={`increase ${name} base score`}
          onClick={() => tapBase(1)}
        >
          +{showCost && nextCost !== null && <span className="tile-cost">·{nextCost}</span>}
        </button>
      </div>
      {canBonus ? (
        <button
          type="button"
          className={`bg-chip${bonus > 0 ? " on" : ""}${bonusDead ? " is-blocked" : ""}`}
          aria-disabled={bonusDead ? true : undefined}
          aria-label={`${name} background bonus: +${bonus} of 2 — tap to cycle`}
          onClick={tapBonus}
        >
          BG +{bonus}
        </button>
      ) : (
        <div className="bg-slot" aria-hidden />
      )}
      {hint && <div className="tile-hint" role="status">{hint}</div>}
    </div>
  );
}
