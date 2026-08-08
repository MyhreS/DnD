import { useEffect, useMemo, useState, type ReactNode } from "react";
import { automationFor } from "../../lib/characterAutomation";
import { levelAdjustedPool } from "../../lib/levelUpVitals";
import type { AppSheetModel } from "./appSheetShared";
import { AppEditStageContext, useAppEditStage, type AppEditStageValue, type StagedPatch } from "./appEditStageContext";

function optionalNumber(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number.parseInt(value, 10);
    if (Number.isFinite(parsed)) return parsed;
  }
  return undefined;
}

export function AppEditStage({ model, children, onPendingChange }: { model: AppSheetModel; children: ReactNode; onPendingChange?: (pending: boolean) => void }) {
  const [patch, setPatch] = useState<StagedPatch>({});
  const currentResult = useMemo(() => automationFor(model.card), [model.card]);
  const previewCard = useMemo(() => ({ ...model.card, ...patch }), [model.card, patch]);
  const previewResult = useMemo(() => automationFor(previewCard), [previewCard]);
  const hasChanges = Object.keys(patch).length > 0;

  useEffect(() => {
    onPendingChange?.(hasChanges);
    return () => onPendingChange?.(false);
  }, [hasChanges, onPendingChange]);

  function keepDifferences(next: StagedPatch): StagedPatch {
    const filtered: StagedPatch = {};
    if (next.level != null && next.level !== model.card.level) filtered.level = next.level;
    if (next.currentHp != null && next.currentHp !== (model.card.currentHp ?? optionalNumber(currentResult.fields.hpCur) ?? 0)) filtered.currentHp = next.currentHp;
    if (next.sanity != null && next.sanity !== (model.card.sanity ?? optionalNumber(currentResult.fields.sanityCur) ?? 0)) filtered.sanity = next.sanity;
    if (next.subclassId !== undefined && next.subclassId !== model.card.subclassId) filtered.subclassId = next.subclassId;
    if (next.transformationLevel != null && next.transformationLevel !== (model.card.transformationLevel ?? 0)) filtered.transformationLevel = next.transformationLevel;
    if (next.activeTransformations !== undefined && JSON.stringify(next.activeTransformations) !== JSON.stringify(model.card.activeTransformations ?? [])) filtered.activeTransformations = next.activeTransformations;
    return filtered;
  }

  function stageLevel(level: number) {
    const bounded = Math.max(1, Math.min(20, level));
    const candidate: StagedPatch = { ...patch, level: bounded };
    if (bounded < 3 && model.card.subclassId) candidate.subclassId = null;
    else if (bounded >= 3 && patch.subclassId === null) delete candidate.subclassId;
    const levelPreview = automationFor({ ...model.card, ...candidate });
    const nextHpMax = optionalNumber(levelPreview.fields.hpMax);
    const nextSanityMax = optionalNumber(levelPreview.fields.sanityMax);
    const currentHp = model.card.currentHp ?? optionalNumber(currentResult.fields.hpCur) ?? 0;
    const currentSanity = model.card.sanity ?? optionalNumber(currentResult.fields.sanityCur) ?? 0;
    const hp = levelAdjustedPool(currentHp, optionalNumber(currentResult.fields.hpMax), nextHpMax, bounded > model.card.level);
    const sanity = levelAdjustedPool(currentSanity, optionalNumber(currentResult.fields.sanityMax), nextSanityMax, bounded > model.card.level);
    // Recalculate from the original card so returning the level to its saved
    // value does not leave an accidental heal staged.
    if (hp != null) candidate.currentHp = hp;
    if (sanity != null) candidate.sanity = sanity;
    setPatch(keepDifferences(candidate));
  }

  function stageHp(hp: number) {
    const max = optionalNumber(previewResult.fields.hpMax);
    setPatch((current) => keepDifferences({ ...current, currentHp: Math.max(0, Math.min(max ?? Number.MAX_SAFE_INTEGER, hp)) }));
  }

  function stageSanity(sanity: number) {
    const max = optionalNumber(previewResult.fields.sanityMax);
    setPatch((current) => keepDifferences({ ...current, sanity: Math.max(0, Math.min(max ?? Number.MAX_SAFE_INTEGER, sanity)) }));
  }

  function stageTransformation(level: number) {
    const bounded = Math.max(0, Math.min(10, level));
    const candidate: StagedPatch = { ...patch, transformationLevel: bounded };
    if (bounded < (model.card.transformationLevel ?? 0)) candidate.activeTransformations = [];
    else if (patch.activeTransformations) delete candidate.activeTransformations;
    setPatch(keepDifferences(candidate));
  }

  function apply() {
    if (Object.keys(patch).length === 0) return;
    model.setFields(previewResult.fields, patch);
    setPatch({});
  }

  const value: AppEditStageValue = {
    patch,
    previewCard,
    currentResult,
    previewResult,
    hasChanges,
    stageLevel,
    stageHp,
    stageSanity,
    stageTransformation,
    apply,
    cancel: () => setPatch({}),
  };
  return <AppEditStageContext.Provider value={value}>{children}</AppEditStageContext.Provider>;
}

function numeric(value: unknown): number | null {
  const parsed = typeof value === "number" ? value : Number.parseFloat(String(value));
  return Number.isFinite(parsed) ? parsed : null;
}

export function AppEditTray() {
  const stage = useAppEditStage();
  if (!stage.hasChanges) return null;
  const fields = ([
    ["Level", stage.currentResult.fields.level, stage.previewResult.fields.level],
    ["Current HP", stage.currentResult.fields.hpCur, stage.previewResult.fields.hpCur],
    ["Maximum HP", stage.currentResult.fields.hpMax, stage.previewResult.fields.hpMax],
    ["Current sanity", stage.currentResult.fields.sanityCur, stage.previewResult.fields.sanityCur],
    ["Maximum sanity", stage.currentResult.fields.sanityMax, stage.previewResult.fields.sanityMax],
    ["Proficiency", stage.currentResult.fields.profBonus, stage.previewResult.fields.profBonus],
    ["Transformation", stage.currentResult.fields.transformation, stage.previewResult.fields.transformation],
  ] as Array<[string, string | boolean | undefined, string | boolean | undefined]>).filter(([, before, after]) => before !== after);
  const currentLevel = stage.currentResult.fields.level;
  const previewLevel = stage.previewResult.fields.level;
  const beforeLevel = numeric(currentLevel) ?? stage.previewCard.level;
  const afterLevel = numeric(previewLevel) ?? stage.previewCard.level;
  const klass = stage.previewCard.classId;

  return (
    <aside className="appsheet-edit-tray" data-testid="appsheet-edit-stage" aria-label="Pending character changes">
      <div className="appsheet-edit-title">
        <span>Previewing changes</span>
        <b>Nothing is saved until you apply.</b>
      </div>
      <div className="appsheet-change-list">
        {fields.map(([label, before, after]) => {
          const beforeNumber = numeric(before);
          const afterNumber = numeric(after);
          const direction = beforeNumber != null && afterNumber != null
            ? afterNumber > beforeNumber ? "positive" : afterNumber < beforeNumber ? "negative" : "neutral"
            : "neutral";
          return <span key={label} className={direction}><b>{label}</b><s>{String(before ?? "—")}</s><strong>{String(after ?? "—")}</strong></span>;
        })}
        {stage.patch.subclassId === null && <span className="negative"><b>Subclass</b><s>Selected</s><strong>Removed below level 3</strong></span>}
        {stage.patch.activeTransformations && <span className="negative"><b>Active transformations</b><s>{stage.currentResult.fields.transformation}</s><strong>Cleared by reduction</strong></span>}
        {klass && beforeLevel !== afterLevel && <span className={afterLevel > beforeLevel ? "positive" : "negative"}><b>Class progression</b><s>Level {beforeLevel}</s><strong>{afterLevel > beforeLevel ? "New features and choices added" : "Higher-level features removed"}</strong></span>}
      </div>
      <div className="appsheet-edit-actions">
        <button type="button" className="cancel" onClick={stage.cancel}>Cancel</button>
        <button type="button" className="apply" onClick={stage.apply}>Apply changes</button>
      </div>
    </aside>
  );
}
