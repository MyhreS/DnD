import { INSIGHT_BY_LEVEL, levelForInsight } from "@/lib/insight";
import { insightAwardPatch } from "../../lib/insightAward";
import type { AppSheetModel } from "../appsheet/appSheetShared";
import { sheetText } from "../appsheet/appSheetValues";
import { hasStagedUpgrade, useAppEditStage } from "../appsheet/appEditStageContext";
import { View4ResourceControl } from "./View4ResourceControl";
import { view4Number } from "./view4Values";

export function View4Progress({ model, upgradePending, onUpgrade }: { model: AppSheetModel; upgradePending: boolean; onUpgrade: () => void }) {
  const stage = useAppEditStage();
  const insight = stage.previewCard.insight ?? view4Number(sheetText(model.data, "insight"));
  const level = stage.savedCard.level;
  const availableLevel = Math.max(level, levelForInsight(insight));
  const currentThreshold = INSIGHT_BY_LEVEL[availableLevel] ?? 0;
  const nextThreshold = INSIGHT_BY_LEVEL[availableLevel + 1];
  const range = nextThreshold == null ? 1 : nextThreshold - currentThreshold;
  const progress = nextThreshold == null ? 100 : Math.max(0, Math.min(100, (insight - currentThreshold) / range * 100));
  const remaining = nextThreshold == null ? 0 : Math.max(0, nextThreshold - insight);

  function setInsight(nextInsight: number) {
    const patch = insightAwardPatch(stage.previewCard, nextInsight - insight);
    model.setFields({ insight: String(nextInsight) }, patch);
  }

  function openUpgrade() {
    stage.stageLevel(availableLevel);
    onUpgrade();
  }

  return <div className="v4-progress-page">
    <section className="v4-level-summary" aria-label="Level and Insight progress">
      <div><small>Current level</small><strong>{level}</strong><span>Level is set by Insight</span></div>
      <div className="v4-insight-progress">
        <span><b>{availableLevel > level ? `Level ${availableLevel} upgrade ready` : nextThreshold == null ? "Maximum level reached" : `${remaining} Insight to level ${availableLevel + 1}`}</b><small>{nextThreshold == null ? `${insight} total Insight` : `${insight} / ${nextThreshold} total Insight`}</small></span>
        <i role="progressbar" aria-label="Insight progress to next level" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress)}><span style={{ width: `${progress}%` }} /></i>
      </div>
    </section>
    <View4ResourceControl label="Insight" value={insight} note="Insight is cumulative and never spent. Reaching a threshold unlocks a character upgrade." disabled={model.readOnly} onChange={setInsight} />
    {!model.readOnly && <button type="button" className={`v4-upgrade-launch ${upgradePending ? "pending" : ""}`} disabled={!upgradePending} onClick={openUpgrade}>{upgradePending ? (hasStagedUpgrade(stage.patch) ? "Resume upgrade" : "Upgrade character") : "No upgrade pending"}<small>{upgradePending ? "Preview gains, make choices, then save." : "Earn more Insight to unlock the next level."}</small></button>}
  </div>;
}
