import type { AbilityKey, Background } from "@/types";
import { ABILITIES } from "@/data/abilities";
import { budgetFor, type BuyMode } from "../lib/abilityBuy";

interface Props {
  mode: BuyMode;
  pointsLeft: number;
  bonusTotal: number;
  bg: Background | null;
  bonusAbilities: readonly AbilityKey[];
}

/** The prominent two-budget block above the ability tiles: the buy meter
 * (big points-left number + progress bar) and — visually separate, gold, its
 * own currency — the background-bonus mini-meter (3 pips, which abilities are
 * eligible and the two legal shapes). */
export function AbilityPointsMeter({ mode, pointsLeft, bonusTotal, bg, bonusAbilities }: Props) {
  const budget = budgetFor(mode);
  // Leveled legacy scores can sit outside the buy space — clamp so the bar
  // never renders nonsense (the step's note explains that case).
  const pct = Math.max(0, Math.min(100, ((budget - pointsLeft) / budget) * 100));
  const buyDone = pointsLeft === 0;
  const bonusDone = bonusTotal === 3;
  const eligible = ABILITIES.filter((a) => bonusAbilities.includes(a.key));
  const anyAbility = eligible.length === ABILITIES.length;

  return (
    <div className="points-meter">
      <div className="row between" style={{ alignItems: "baseline", gap: 8 }}>
        <div style={{ minWidth: 0 }}>
          <span className={`meter-big${buyDone ? " done" : ""}`}>{pointsLeft}</span>
          <span className="muted" style={{ fontSize: "0.85rem", marginLeft: 6 }}>
            point{pointsLeft === 1 || pointsLeft === -1 ? "" : "s"} left
            <span className="faint"> of {budget}</span>
          </span>
        </div>
        {buyDone && (
          <span className="pick-counter done" role="status">✓ all spent</span>
        )}
      </div>
      <div className="meter-bar" aria-hidden>
        <div className={`meter-fill${buyDone ? " done" : ""}`} style={{ width: `${pct}%` }} />
      </div>

      <div className="bg-meter">
        <div className="row between" style={{ gap: 8, alignItems: "center" }}>
          <span className="bg-meter-title">Background bonus</span>
          <span
            className="row"
            style={{ gap: 4, alignItems: "center", flex: "none" }}
            role="status"
            aria-label={`background bonus: ${bonusTotal} of 3 used`}
          >
            {[0, 1, 2].map((i) => (
              <span key={i} className={`bg-pip${i < bonusTotal ? " filled" : ""}`} />
            ))}
            <span className={bonusDone ? "gold" : "muted"} style={{ fontSize: "0.8rem", marginLeft: 4 }}>
              {bonusDone ? "✓ " : ""}{bonusTotal}/3 used
            </span>
          </span>
        </div>
        <div className="faint" style={{ fontSize: "0.78rem", marginTop: 3 }}>
          {bg
            ? <>Your {bg.name} past boosts <span className="gold">{eligible.map((a) => a.short).join(" · ")}</span></>
            : anyAbility
              ? "Your background boosts any ability"
              : <>Boosts <span className="gold">{eligible.map((a) => a.short).join(" · ")}</span></>}
          {" "}— spend the gold tokens as <strong>+2 and +1</strong>, or <strong>three +1s</strong>.
        </div>
      </div>
    </div>
  );
}
