import { hasStagedUpgrade, useAppEditStage, type StagedPatch } from "./appEditStageContext";

function numeric(value: unknown): number | null {
  const parsed = typeof value === "number" ? value : Number.parseFloat(String(value));
  return Number.isFinite(parsed) ? parsed : null;
}

const STAGED_LABELS: Partial<Record<keyof StagedPatch, string>> = {
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
  madness: "Madness",
};

const DISPLAYED_PATCH_KEYS = new Set(["level", "currentHp", "madness", "transformationLevel"]);

const FIELD_LABELS: Record<string, string> = {
  strainCur: "Strains left",
  insight: "Insight",
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

export function AppEditTray() {
  const stage = useAppEditStage();
  if (!stage.hasChanges || hasStagedUpgrade(stage.patch)) return null;
  const fields = ([
    ["Level", stage.currentResult.fields.level, stage.previewResult.fields.level],
    ["Current HP", stage.currentResult.fields.hpCur, stage.previewResult.fields.hpCur],
    ["Maximum HP", stage.currentResult.fields.hpMax, stage.previewResult.fields.hpMax],
    ["Maximum sanity", stage.currentResult.fields.sanityMax, stage.previewResult.fields.sanityMax],
    ["Madness", stage.savedCard.madness ?? 0, stage.previewCard.madness ?? 0],
    ["Proficiency", stage.currentResult.fields.profBonus, stage.previewResult.fields.profBonus],
    ["Transformation", stage.currentResult.fields.transformation, stage.previewResult.fields.transformation],
  ] as Array<[string, unknown, unknown]>).filter(([, before, after]) => before !== after);
  const otherChanges = Object.keys(stage.patch)
    .filter((key) => !DISPLAYED_PATCH_KEYS.has(key) && !stage.changedFields.includes(key))
    .map((key) => STAGED_LABELS[key as keyof StagedPatch] ?? key.replace(/([A-Z])/g, " $1").replace(/^./, (letter) => letter.toUpperCase()));
  // Automation writes a complete, consistent sheet snapshot after a character
  // choice. That can legitimately touch many calculated fields, but showing
  // every one as "Character sheet: Saved to Will update" overwhelms the review
  // tray and hides the decision the player actually made. Keep individually
  // editable fields explicit and collapse the rest into one truthful summary.
  const namedFieldChanges = stage.changedFields.filter((field) => FIELD_LABELS[field]);
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
        {namedFieldChanges.map((field) => <span key={field} className="neutral"><b>{FIELD_LABELS[field]}</b><s>Saved</s><strong>Will update</strong></span>)}
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
