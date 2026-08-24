import { useEffect, useMemo, useState, type ReactNode } from "react";
import type { HunterCard, SheetData } from "@/types";
import { minimumTrackedSanity } from "@/lib/character";
import { automationFor } from "../../lib/characterAutomation";
import { levelAdjustedPool } from "../../lib/levelUpVitals";
import type { AppSheetModel } from "./appSheetShared";
import { AppEditStageContext, hasStagedUpgrade, useAppEditStage, type AppEditStageValue, type StagedPatch } from "./appEditStageContext";

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
  const [fields, setFields] = useState(model.data);
  const currentResult = useMemo(() => automationFor(model.card), [model.card]);
  const previewCard = useMemo(() => ({ ...model.card, ...patch, sheet: fields }), [fields, model.card, patch]);
  const previewResult = useMemo(() => automationFor(previewCard), [previewCard]);
  const changedFields = useMemo(
    () => Object.keys(fields).filter((field) => fields[field] !== model.data[field]),
    [fields, model.data],
  );
  const hasChanges = Object.keys(patch).length > 0 || changedFields.length > 0;

  useEffect(() => {
    onPendingChange?.(hasChanges);
    return () => onPendingChange?.(false);
  }, [hasChanges, onPendingChange]);

  function keepDifferences(next: StagedPatch): StagedPatch {
    const filtered: StagedPatch = {};
    for (const [key, value] of Object.entries(next) as Array<[keyof HunterCard, HunterCard[keyof HunterCard]]>) {
      if (JSON.stringify(value) !== JSON.stringify(model.card[key])) filtered[key] = value as never;
    }
    return filtered;
  }

  function stageChange(nextFields: SheetData, partial: Partial<HunterCard>) {
    setFields((current) => ({ ...current, ...nextFields }));
    setPatch((current) => keepDifferences({ ...current, ...partial }));
  }

  function stageField(field: string, value: string | boolean) {
    stageChange({ [field]: value }, {});
  }

  function stageLevel(level: number) {
    const bounded = Math.max(1, Math.min(20, level));
    // Level changes stay staged until the Upgrade page applies them together
    // with their required choices.
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
    const upper = max ?? Number.MAX_SAFE_INTEGER;
    const lower = max == null ? -Number.MAX_SAFE_INTEGER : minimumTrackedSanity(max);
    setPatch((current) => keepDifferences({ ...current, sanity: Math.max(lower, Math.min(upper, sanity)) }));
  }

  function stageTransformation(level: number) {
    const bounded = Math.max(0, Math.min(10, level));
    const candidate: StagedPatch = { ...patch, transformationLevel: bounded };
    if (bounded < (model.card.transformationLevel ?? 0)) candidate.activeTransformations = [];
    else if (patch.activeTransformations) delete candidate.activeTransformations;
    setPatch(keepDifferences(candidate));
  }

  function apply(extraPatch: Partial<HunterCard> = {}) {
    const finalPatch = keepDifferences({ ...patch, ...extraPatch });
    if (!hasChanges && Object.keys(finalPatch).length === 0) return;
    const nextLevel = finalPatch.level ?? model.card.level;
    if (nextLevel > model.card.level && (finalPatch.lastSeenLevel ?? 0) < nextLevel) return;
    // `fields` starts as a snapshot so preview calculations can use a complete
    // sheet. Apply only the actual differences: notes intentionally save
    // directly, and a note typed while this review is open must never be
    // replaced with an older staged snapshot.
    const changedFieldPatch = Object.fromEntries(
      Object.entries(fields).filter(([field, value]) => value !== model.data[field]),
    ) as SheetData;
    model.setFields(changedFieldPatch, finalPatch);
    setPatch({});
    setFields({ ...model.data, ...changedFieldPatch });
  }

  const value: AppEditStageValue = {
    patch,
    savedCard: model.card,
    previewCard,
    previewData: fields,
    currentResult,
    previewResult,
    hasChanges,
    changedFields,
    stageLevel,
    stageHp,
    stageSanity,
    stageTransformation,
    stageChange,
    stageField,
    apply,
    cancel: () => {
      setPatch({});
      setFields(model.data);
    },
  };
  return <AppEditStageContext.Provider value={value}>{children}</AppEditStageContext.Provider>;
}

function numeric(value: unknown): number | null {
  const parsed = typeof value === "number" ? value : Number.parseFloat(String(value));
  return Number.isFinite(parsed) ? parsed : null;
}

export function AppEditTray() {
  const stage = useAppEditStage();
  if (!stage.hasChanges || hasStagedUpgrade(stage.patch)) return null;
  const fields = ([
    ["Level", stage.currentResult.fields.level, stage.previewResult.fields.level],
    ["Current HP", stage.currentResult.fields.hpCur, stage.previewResult.fields.hpCur],
    ["Maximum HP", stage.currentResult.fields.hpMax, stage.previewResult.fields.hpMax],
    ["Current sanity", stage.currentResult.fields.sanityCur, stage.previewResult.fields.sanityCur],
    ["Maximum sanity", stage.currentResult.fields.sanityMax, stage.previewResult.fields.sanityMax],
    ["Proficiency", stage.currentResult.fields.profBonus, stage.previewResult.fields.profBonus],
    ["Transformation", stage.currentResult.fields.transformation, stage.previewResult.fields.transformation],
  ] as Array<[string, string | boolean | undefined, string | boolean | undefined]>).filter(([, before, after]) => before !== after);
  const stagedLabels: Partial<Record<keyof StagedPatch, string>> = {
    inventory: "Inventory",
    slotAssignments: "Carrying",
    equippedStorageIds: "Worn storage",
    mainArmorId: "Main armor",
    addonArmorIds: "Add-on armor",
    extraArmorIds: "Extra armor",
    coins: "Gold",
    customItems: "Unique items",
    name: "Name",
    classId: "Class",
    lastSeenLevel: "Level tracking",
    sheetAutomation: "Character setup",
  };
  const displayedPatchKeys = new Set(["level", "currentHp", "sanity", "transformationLevel"]);
  const otherChanges = Object.keys(stage.patch)
    .filter((key) => !displayedPatchKeys.has(key) && !stage.changedFields.includes(key))
    .map((key) => stagedLabels[key as keyof StagedPatch] ?? key.replace(/([A-Z])/g, " $1").replace(/^./, (letter) => letter.toUpperCase()));
  const fieldLabels: Record<string, string> = {
    strainCur: "Strains left",
    insight: "Insight",
    insane: "Insanity",
    hpTemp: "Temporary HP",
    acModifier: "AC modifier",
    speedModifier: "Speed modifier",
    passivePerceptionModifier: "Passive Perception modifier",
    initiativeModifier: "Initiative modifier",
    hdCur: "Hit dice",
    hdSpent: "Hit dice spent",
    dsS1: "Death save success 1",
    dsS2: "Death save success 2",
    dsS3: "Death save success 3",
    dsF1: "Death save failure 1",
    dsF2: "Death save failure 2",
    dsF3: "Death save failure 3",
  };
  // Automation writes a complete, consistent sheet snapshot after a character
  // choice. That can legitimately touch many calculated fields, but showing
  // every one as "Character sheet: Saved to Will update" overwhelms the review
  // tray and hides the decision the player actually made. Keep individually
  // editable fields explicit and collapse the rest into one truthful summary.
  const namedFieldChanges = stage.changedFields.filter((field) => fieldLabels[field]);
  const calculatedFieldChangeCount = stage.changedFields.length - namedFieldChanges.length;
  const currentLevel = stage.currentResult.fields.level;
  const previewLevel = stage.previewResult.fields.level;
  const beforeLevel = numeric(currentLevel) ?? stage.previewCard.level;
  const afterLevel = numeric(previewLevel) ?? stage.previewCard.level;
  const klass = stage.previewCard.classId;

  return (
    <aside className="appsheet-edit-tray" data-testid="appsheet-edit-stage" aria-label="Review pending character changes">
      <div className="appsheet-edit-title">
        <span>Review changes</span>
        <b>{fields.length + otherChanges.length + stage.changedFields.length} pending · nothing is saved until you apply.</b>
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
        {otherChanges.map((label) => <span key={label} className="neutral"><b>{label}</b><s>Saved</s><strong>Will update</strong></span>)}
        {namedFieldChanges.map((field) => <span key={field} className="neutral"><b>{fieldLabels[field]}</b><s>Saved</s><strong>Will update</strong></span>)}
        {calculatedFieldChangeCount > 0 && (
          <span className="neutral"><b>Character details</b><s>Saved</s><strong>Will update automatically</strong></span>
        )}
      </div>
      <div className="appsheet-edit-actions">
        <button type="button" className="cancel" onClick={stage.cancel}>Cancel</button>
        <button type="button" className="apply" onClick={() => stage.apply()}>Apply changes</button>
      </div>
    </aside>
  );
}
