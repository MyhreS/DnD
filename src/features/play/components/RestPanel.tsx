import { useState } from "react";
import { getClass } from "@/data/classes";
import { earnedLevel, isLevelUpPending } from "@/lib/character";
import {
  applyLongRest,
  applyShortRest,
  canSpendHitDice,
  restoresFullHp,
  type LongRestOutcome,
  type ShortRestOutcome,
} from "@/lib/rest";
import { usePlayerStore } from "@/features/hunter/store/playerStore";
import { AsyncButton } from "@/components/AsyncButton";
import { LOCATION_LABEL } from "../lib/phase";
import type { GameLocation, GamePhase, HunterCard } from "@/types";

/** Shown to a player when the DM calls a rest. Rulebook-accurate and
 * location-aware: Hit Dice/HP recovery depends on the Safe Zone / Hunters Lodge,
 * the Sanity Die is rolled, Transformation is cleared, and a pending Insight
 * level-up is applied — a level only takes effect after a Long Rest. */
export function RestPanel({
  card,
  phase,
  location,
}: {
  card: HunterCard;
  phase: GamePhase;
  location: GameLocation;
}) {
  const save = usePlayerStore((s) => s.save);
  const klass = getClass(card.classId);
  const [done, setDone] = useState<string | null>(null);
  if ((phase !== "short_rest" && phase !== "long_rest") || !klass) return null;

  const isLong = phase === "long_rest";
  const inLodge = restoresFullHp(location);
  const safe = canSpendHitDice(location);
  const earned = earnedLevel(card);
  const pendingLevel = isLevelUpPending(card);

  async function takeRest() {
    if (!klass) return;
    if (isLong) {
      const r = applyLongRest(card, klass, location);
      await save({ ...card, ...r.patch });
      setDone(longSummary(r));
    } else {
      const r = applyShortRest(card, klass, location);
      await save({ ...card, ...r.patch });
      setDone(shortSummary(r));
    }
  }

  const lines = isLong
    ? [
        inLodge
          ? "Restore all Hit Points (Hunters Lodge)."
          : "Recover half your HP maximum (you're not in the Hunters Lodge).",
        `Roll your Sanity Die (${klass.sanityDie} + WIS) to recover Sanity.`,
        "Transformation Level to 0 — all active Transformations fade.",
        ...(pendingLevel ? [`Level up to ${earned}.`] : []),
      ]
    : [
        safe
          ? "Spend Hit Dice (up to your Proficiency Bonus) to heal."
          : "No Hit Dice — you can only spend them in a Safe Zone.",
        "Remove 1 Transformation Level (and all active Transformations); a DC 13 CON (Grit) check removes 1 more.",
      ];

  return (
    <div className="card" style={{ borderColor: "var(--gold-dim)" }}>
      <div className="row between" style={{ marginBottom: 6 }}>
        <p className="eyebrow" style={{ margin: 0 }}>{isLong ? "Long Rest" : "Short Rest"}</p>
        <span className="chip" style={{ flex: "none" }}>{LOCATION_LABEL[location]}</span>
      </div>
      {done ? (
        <p className="faint" style={{ fontSize: "0.84rem", margin: 0 }}>{done}</p>
      ) : (
        <>
          <ul className="muted" style={{ margin: "0 0 12px", paddingLeft: 18, fontSize: "0.9rem" }}>
            {lines.map((l) => (
              <li key={l}>{l}</li>
            ))}
          </ul>
          <AsyncButton
            className="btn btn-primary"
            pendingText="Resting…"
            showDone={false}
            onClick={takeRest}
          >
            Take the {isLong ? "long" : "short"} rest
          </AsyncButton>
        </>
      )}
    </div>
  );
}

function longSummary(r: LongRestOutcome): string {
  const parts = [
    `HP ${r.hpFrom} → ${r.hpTo}`,
    `Sanity ${r.sanityFrom} → ${r.sanityTo} (rolled ${r.sanityRoll})`,
  ];
  if (r.transformationCleared > 0) parts.push(`cleared ${r.transformationCleared} Transformation`);
  if (r.leveledTo) parts.push(`leveled up to ${r.leveledTo}!`);
  return `Rested — ${parts.join(" · ")}.`;
}

function shortSummary(r: ShortRestOutcome): string {
  const parts = r.canSpendHitDice
    ? [`HP ${r.hpFrom} → ${r.hpTo} (${r.hitDiceRolled} Hit Dice)`]
    : ["no Hit Dice — not in a Safe Zone"];
  if (r.transformationFrom !== r.transformationTo) {
    parts.push(`Transformation ${r.transformationFrom} → ${r.transformationTo}`);
    if (r.gritRoll != null) {
      parts.push(`Grit check ${r.gritRoll} — ${r.gritSuccess ? "held firm (−1 more)" : "failed"}`);
    }
  }
  return `Rested — ${parts.join(" · ")}.`;
}
