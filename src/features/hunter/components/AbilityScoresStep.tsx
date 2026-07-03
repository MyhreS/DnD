import type { AbilityKey, AbilityScores, Background } from "@/types";
import {
  ABILITIES,
  MADUHAUSU_BUDGET,
  MADUHAUSU_COST,
  MADUHAUSU_FINAL_MAX,
  MADUHAUSU_MAX,
  MADUHAUSU_MIN,
  POINT_BUY_MAX,
  POINT_BUY_MIN,
} from "@/data/abilities";
import { baseSetBlock, bonusSetBlock, nextBaseCost, type BuyMode } from "../lib/abilityBuy";
import { AbilityPointsMeter } from "./AbilityPointsMeter";
import { AbilityTile } from "./AbilityTile";

interface Props {
  mode: BuyMode;
  base: Record<AbilityKey, number>;
  bonus: Record<AbilityKey, number>;
  finalScores: AbilityScores;
  bg: Background | null;
  bonusAbilities: readonly AbilityKey[];
  pointsLeft: number;
  bonusTotal: number;
  /** True when editing a leveled hunter whose scores haven't been touched —
   * they save verbatim, so the buy meter shows the creation-time spend. */
  leveledNote: boolean;
  onSwitchMode: (mode: BuyMode) => void;
  onSetBase: (key: AbilityKey, next: number) => void;
  onSetBonus: (key: AbilityKey, next: number) => void;
}

/** Step 3 · Ability scores: mode chips, the two-budget points meter, the
 * collapsible Maduhausu cost table, and the six ability tiles. All blocking
 * reasons are computed here from abilityBuy.ts — the same predicates the
 * editor's setters use — and passed down so the tiles stay dumb. */
export function AbilityScoresStep({
  mode, base, bonus, finalScores, bg, bonusAbilities,
  pointsLeft, bonusTotal, leveledNote,
  onSwitchMode, onSetBase, onSetBonus,
}: Props) {
  return (
    <div className="card">
      <p className="eyebrow">Step 3 · Ability scores</p>
      <div className="chip-row" style={{ marginBottom: 10 }}>
        <button
          type="button"
          className={`chip selectable${mode === "pointbuy" ? " selected" : ""}`}
          onClick={() => onSwitchMode("pointbuy")}
        >
          Point buy
        </button>
        <button
          type="button"
          className={`chip selectable${mode === "maduhausu" ? " selected" : ""}`}
          onClick={() => onSwitchMode("maduhausu")}
        >
          Maduhausu 🤡
        </button>
      </div>

      <p className="faint" style={{ fontSize: "0.82rem", marginTop: 0 }}>
        {mode === "pointbuy" ? (
          <>Buy base scores {POINT_BUY_MIN}–{POINT_BUY_MAX} with your points. Your
          background adds a separate +3 on top — the gold tokens below.</>
        ) : (
          <>The min-maxer's madness: buy scores {MADUHAUSU_MIN}–{MADUHAUSU_MAX} with{" "}
          {MADUHAUSU_BUDGET} points — buying the same score again costs more (each +
          shows its price), and no final score may end above {MADUHAUSU_FINAL_MAX}.</>
        )}
      </p>

      {mode === "maduhausu" && (
        <details style={{ marginBottom: 10 }}>
          <summary className="faint" style={{ fontSize: "0.8rem", cursor: "pointer" }}>
            Point cost table (per purchase of the same score)
          </summary>
          <div className="table-scroll" style={{ marginTop: 6 }}>
            <table className="level-table">
              <thead>
                <tr>
                  <th className="lvl-col">Score</th>
                  <th>First</th>
                  <th>Second</th>
                  <th>Third +</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="lvl-col">3–13</td>
                  <td colSpan={3}>Score − 3, every time (a 10 always costs 7)</td>
                </tr>
                {[14, 15, 16].map((score) => (
                  <tr key={score}>
                    <td className="lvl-col">{score}</td>
                    {MADUHAUSU_COST[score].map((cost, i) => (
                      <td key={i}>{cost === null ? "Too expensive" : cost}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      )}

      <AbilityPointsMeter
        mode={mode}
        pointsLeft={pointsLeft}
        bonusTotal={bonusTotal}
        bg={bg}
        bonusAbilities={bonusAbilities}
      />

      {leveledNote && (
        <p className="faint" style={{ fontSize: "0.78rem", margin: "0 0 10px" }}>
          This shows your creation-time buy. Level-up increases are folded into
          your scores and are kept on save — leave everything untouched and it
          saves exactly as it is.
        </p>
      )}

      <div className="ability-grid">
        {ABILITIES.map(({ key, name, short }) => (
          <AbilityTile
            // Remount on mode/background changes so a stale blocked-reason
            // hint from the previous context never lingers.
            key={`${mode}:${bg?.id ?? "any"}:${key}`}
            short={short}
            name={name}
            base={base[key]}
            bonus={bonus[key]}
            final={finalScores[key]}
            canBonus={bonusAbilities.includes(key)}
            nextCost={nextBaseCost(mode, base, key)}
            showCost={mode === "maduhausu" || (nextBaseCost(mode, base, key) ?? 0) > 1}
            incBlock={baseSetBlock(mode, base, bonus, key, base[key] + 1)}
            decBlock={baseSetBlock(mode, base, bonus, key, base[key] - 1)}
            bonusUpBlock={bonusSetBlock(mode, base, bonus, bonusAbilities, key, bonus[key] + 1)}
            onBase={(next) => onSetBase(key, next)}
            onBonus={(next) => onSetBonus(key, next)}
          />
        ))}
      </div>
    </div>
  );
}
