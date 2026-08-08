import { useEffect, useMemo, useState } from "react";
import { getClass } from "@/data/classes";
import type { HunterCard } from "@/types";
import { automationFor } from "../../lib/characterAutomation";
import { useAppEditStage } from "./appEditStageContext";

const INSIGHT_BY_LEVEL = [0, 0, 6, 15, 30, 50, 75, 105, 140, 180, 225, 275, 330, 390, 455, 525, 600, 680, 765, 855, 950];
const CHOICE_FEATURE = /^(hunter .+ subclass|ability score improvement|epic boon|fighting style|expertise|weapon mastery|forbidden revelation)$/i;

function levelForInsight(insight: number): number {
  let level = 1;
  for (let candidate = 2; candidate < INSIGHT_BY_LEVEL.length; candidate += 1) {
    if (insight >= INSIGHT_BY_LEVEL[candidate]) level = candidate;
  }
  return level;
}

function value(fields: Record<string, string | boolean>, key: string): string {
  return String(fields[key] ?? "—");
}

export function LevelUpPrompt({ card, readOnly }: { card: HunterCard; readOnly: boolean }) {
  const stage = useAppEditStage();
  const eligibleLevel = levelForInsight(card.insight ?? 0);
  const nextLevel = Math.min(card.level + 1, eligibleLevel);
  const [dismissedAt, setDismissedAt] = useState(0);

  useEffect(() => {
    if (eligibleLevel > dismissedAt) setDismissedAt(0);
  }, [eligibleLevel, dismissedAt]);

  const preview = useMemo(() => ({ ...card, level: nextLevel }), [card, nextLevel]);
  const nextResult = useMemo(() => automationFor(preview), [preview]);
  const klass = getClass(card.classId);
  const progression = klass?.progression.find((row) => row.level === nextLevel);
  const featureNames = progression?.features && progression.features !== "—"
    ? progression.features.split(",").map((feature) => feature.trim()).filter(Boolean)
    : [];
  const choices = featureNames.filter((feature) => CHOICE_FEATURE.test(feature));
  const extras = progression ? Object.entries(progression.extras).map(([name, amount]) => `${name}: ${amount}`) : [];

  if (readOnly || eligibleLevel <= card.level || dismissedAt >= eligibleLevel) return null;

  const current = stage.currentResult.fields;
  const next = nextResult.fields;
  const automatic = [
    `Maximum HP ${value(current, "hpMax")} → ${value(next, "hpMax")}`,
    `Hit Dice ${value(current, "hdMax")} → ${value(next, "hdMax")}`,
    value(current, "profBonus") !== value(next, "profBonus")
      ? `Proficiency ${value(current, "profBonus")} → ${value(next, "profBonus")}`
      : null,
    "Your new class features are added to the sheet. Current HP stays as it is.",
  ].filter(Boolean);

  return (
    <div className="appsheet-levelup-backdrop" role="presentation">
      <section className="appsheet-levelup-prompt" role="dialog" aria-modal="true" aria-labelledby="level-up-title">
        <p className="eyebrow">Insight threshold reached</p>
        <h2 id="level-up-title">Level {nextLevel} is ready</h2>
        <p>You have {card.insight ?? 0} Insight. Level {nextLevel} requires {INSIGHT_BY_LEVEL[nextLevel]} Insight and is gained after a Long Rest.</p>

        <div className="appsheet-levelup-section">
          <h3>Updated automatically</h3>
          <ul>{automatic.map((change) => <li key={change}>{change}</li>)}</ul>
        </div>

        <div className="appsheet-levelup-section">
          <h3>New at this level</h3>
          {featureNames.length ? <ul>{featureNames.map((feature) => <li key={feature}>{feature}</li>)}</ul> : <p>No new named class feature at this level.</p>}
          {extras.length > 0 && <p className="appsheet-levelup-extras">{extras.join(" · ")}</p>}
        </div>

        <div className="appsheet-levelup-section">
          <h3>You still need to choose</h3>
          {choices.length > 0
            ? <ul>{choices.map((choice) => <li key={choice}>{choice}</li>)}</ul>
            : <p>No new choice is required at this level. Review the Features section after applying in case an existing choice is still unfinished.</p>}
        </div>

        <footer>
          <button type="button" className="btn btn-ghost" onClick={() => setDismissedAt(eligibleLevel)}>Not yet</button>
          <button type="button" className="btn btn-primary" onClick={() => { stage.stageLevel(nextLevel); setDismissedAt(eligibleLevel); }}>Preview level up</button>
        </footer>
      </section>
    </div>
  );
}
