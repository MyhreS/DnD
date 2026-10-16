import { INSIGHT_BY_LEVEL, levelForInsight } from "@/lib/insight";
import { insightAwardPatch } from "../../lib/insightAward";
import type { AppSheetModel } from "../appsheet/appSheetShared";
import { sheetText } from "../appsheet/appSheetValues";
import { hasStagedUpgrade, useAppEditStage } from "../appsheet/appEditStageContext";
import { useCharacterAutomation } from "../papersheet/characterAutomationContext";
import { CharacterSheetActionNeeded } from "./CharacterSheetActionNeeded";
import { CharacterSheetLevelHistory } from "./CharacterSheetLevelHistory";
import { CharacterSheetResourceControl } from "./CharacterSheetResourceControl";
import { characterSheetNumber } from "./characterSheetValues";

export function CharacterSheetProgress({ model, upgradePending, onUpgrade }: { model: AppSheetModel; upgradePending: boolean; onUpgrade: () => void }) {
  const stage = useAppEditStage();
  const { result } = useCharacterAutomation();
  const insight = stage.previewCard.insight ?? characterSheetNumber(sheetText(model.data, "insight"));
  const level = stage.savedCard.level;
  const availableLevel = Math.max(level, levelForInsight(insight));
  const currentThreshold = INSIGHT_BY_LEVEL[availableLevel] ?? 0;
  const nextThreshold = INSIGHT_BY_LEVEL[availableLevel + 1];
  const range = nextThreshold == null ? 1 : nextThreshold - currentThreshold;
  const progress = nextThreshold == null ? 100 : Math.max(0, Math.min(100, (insight - currentThreshold) / range * 100));
  const remaining = nextThreshold == null ? 0 : Math.max(0, nextThreshold - insight);

  // At the same level, the upgrade is only asking for choices this level still
  // needs (e.g. a Warden path at level 3) — say so instead of "Upgrade".
  const missing = Object.values(result.pending).filter((entry) => entry != null).map((entry) => entry.label);
  const choicesOnly = availableLevel === level && missing.length > 0 && !hasStagedUpgrade(stage.patch);
  const launchLabel = hasStagedUpgrade(stage.patch) ? "Resume upgrade" : choicesOnly ? `Choose ${missing.join(" and ")}` : "Upgrade character";
  const launchNote = choicesOnly ? `Level ${level} still needs this choice. Make it, then save.` : "Preview gains, make choices, then save.";

  function setInsight(nextInsight: number) {
    const patch = insightAwardPatch(stage.previewCard, nextInsight - insight);
    model.setFields({ insight: String(nextInsight) }, patch);
  }

  function openUpgrade() {
    stage.stageLevel(availableLevel);
    onUpgrade();
  }

  return <div className="character-sheet-progress-page">
    {!model.readOnly && upgradePending && !hasStagedUpgrade(stage.patch) && <CharacterSheetActionNeeded newLevel={availableLevel > level ? availableLevel : null} missing={missing} onAct={openUpgrade} />}
    <section className="character-sheet-level-summary" aria-label="Level and Insight progress">
      <div><small>Current level</small><strong>{level}</strong><span>Level is set by Insight</span></div>
      <div className="character-sheet-insight-progress">
        <span><b>{availableLevel > level ? `Level ${availableLevel} upgrade ready` : nextThreshold == null ? "Maximum level reached" : `${remaining} Insight to level ${availableLevel + 1}`}</b><small>{nextThreshold == null ? `${insight} total Insight` : `${insight} / ${nextThreshold} total Insight`}</small></span>
        <i role="progressbar" aria-label="Insight progress to next level" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress)}><span style={{ width: `${progress}%` }} /></i>
      </div>
    </section>
    <CharacterSheetResourceControl label="Insight" value={insight} note="Insight is cumulative and never spent. Reaching a threshold unlocks a character upgrade." disabled={model.readOnly} onChange={setInsight} />
    {!model.readOnly && <button type="button" className={`character-sheet-upgrade-launch ${upgradePending ? "pending" : ""}`} disabled={!upgradePending} onClick={openUpgrade}>{upgradePending ? launchLabel : "No upgrade pending"}<small>{upgradePending ? launchNote : "Earn more Insight to unlock the next level."}</small></button>}
    <CharacterSheetLevelHistory />
  </div>;
}
