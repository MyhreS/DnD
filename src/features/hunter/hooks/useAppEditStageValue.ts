import { useEffect, useMemo, useState } from "react";
import type { HunterCard, SheetData } from "@/types";
import { automationFor, calculatedSheetFields } from "../lib/characterAutomation";
import { levelAdjustedPool } from "../lib/levelUpVitals";
import type { AppSheetModel } from "../components/appsheet/appSheetShared";
import type { AppEditStageValue, StagedPatch } from "../components/appsheet/appEditStageContext";

function optionalNumber(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number.parseInt(value, 10);
    if (Number.isFinite(parsed)) return parsed;
  }
  return undefined;
}

export function useAppEditStageValue(
  model: AppSheetModel,
  onPendingChange?: (pending: boolean) => void,
): AppEditStageValue {
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
    for (const [key, raw] of Object.entries(next) as Array<[keyof HunterCard, HunterCard[keyof HunterCard]]>) {
      // core-rulebook.txt [page 26]: "Active Transformations do not stack with
      // themselves." A repeat is never stored twice — dropping it IS the rule.
      const value = key === "activeTransformations" && Array.isArray(raw)
        ? (Array.from(new Set(raw as string[])) as HunterCard[keyof HunterCard])
        : raw;
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
    const currentHp = model.card.currentHp ?? optionalNumber(currentResult.fields.hpCur) ?? 0;
    const currentHpMax = optionalNumber(currentResult.fields.hpMax);
    // core-rulebook.txt [page 46]: a Constitution increase raises the Hit Point
    // maximum "for each level you have attained" — including one taken through
    // a feat with no level change — so refill whenever the maximum grows.
    const hpShouldRefill = bounded > model.card.level
      || (nextHpMax != null && currentHpMax != null && nextHpMax > currentHpMax);
    const hp = levelAdjustedPool(currentHp, currentHpMax, nextHpMax, hpShouldRefill);
    // Recalculate from the original card so returning the level to its saved
    // value does not leave an accidental heal staged.
    if (hp != null) candidate.currentHp = hp;
    // core-rulebook.txt [page 42]: Madness is the tracked pool and Current
    // Sanity is not tracked. Levelling moves Max Sanity only — Madness is never
    // refilled or rescaled by a level change.
    // Fracturing Mind, core-rulebook.txt [page 71]: "Every time you level up
    // suffer 2 Madness." Forward only — computed from the saved card so that
    // returning the level to its saved value clears the staged Madness again,
    // and never applied retroactively to levels already gained.
    const levelsGained = Math.max(0, bounded - model.card.level);
    if (model.card.classId === "deepcaller" && levelsGained > 0) {
      candidate.madness = (model.card.madness ?? 0) + 2 * levelsGained;
    } else if (candidate.madness != null) {
      delete candidate.madness;
    }
    setPatch(keepDifferences(candidate));
  }

  function stageHp(hp: number) {
    const max = optionalNumber(previewResult.fields.hpMax);
    setPatch((current) => keepDifferences({ ...current, currentHp: Math.max(0, Math.min(max ?? Number.MAX_SAFE_INTEGER, hp)) }));
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
    // Recalculate from the final structured decisions so the saved sheet
    // snapshot cannot lag behind level, resource, equipment, or rules changes.
    // Explicit migration overrides are filtered by calculatedSheetFields.
    const finalCard = { ...model.card, ...finalPatch, sheet: fields };
    const synchronizedFields = { ...fields, ...calculatedSheetFields(finalCard) };
    // `fields` starts as a snapshot so preview calculations can use a complete
    // sheet. Apply only the actual differences: notes intentionally save
    // directly, and a note typed while this review is open must never be
    // replaced with an older staged snapshot.
    const changedFieldPatch = Object.fromEntries(
      Object.entries(synchronizedFields).filter(([field, value]) => value !== model.data[field]),
    ) as SheetData;
    model.setFields(changedFieldPatch, finalPatch);
    setPatch({});
    setFields({ ...model.data, ...changedFieldPatch });
  }

  return {
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
    stageTransformation,
    stageChange,
    stageField,
    apply,
    cancel: () => {
      setPatch({});
      setFields(model.data);
    },
  };
}
