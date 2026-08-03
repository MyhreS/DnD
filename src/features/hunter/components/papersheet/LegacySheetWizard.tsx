import { useMemo, useState } from "react";
import { BACKGROUNDS } from "@/data/backgrounds";
import { CLASSES } from "@/data/classes";
import { ITEMS } from "@/data/items";
import { SHEET_SKILL_FIELD, SKILLS } from "@/data/skills";
import { automationFor, structuredCardFromSheet } from "../../lib/characterAutomation";
import type { HunterCard, LegacyEquipmentLine, SheetData } from "@/types";

function hasValue(value: string | boolean | undefined): boolean {
  return value === true || (typeof value === "string" && value.trim() !== "");
}

const MAPPED_SOURCE_FIELDS = new Set([
  "name", "class", "level", "background",
  ...["str", "dex", "con", "int", "wis", "cha"].map((key) => `${key}Score`),
  ...Array.from({ length: 20 }, (_, row) => [`eq_${row}_0`, `eq_${row}_1`, `eq_${row}_2`, `eq_${row}_3`]).flat(),
]);

export function LegacySheetWizard({ card, onApply, onCancel, onComplete }: { card: HunterCard; onApply: (fields: SheetData, patch: Partial<HunterCard>) => void; onCancel: () => void; onComplete: () => void }) {
  const inferred = useMemo(() => structuredCardFromSheet(card), [card]);
  const [classId, setClassId] = useState(inferred.card.classId);
  const [level, setLevel] = useState(inferred.card.level);
  const [backgroundId, setBackgroundId] = useState(inferred.card.backgroundId ?? "");
  const [matches, setMatches] = useState<Record<number, string>>({});
  const [step, setStep] = useState(0);
  const unknown = inferred.legacyEquipment;
  const last = 4 + unknown.length;
  const itemOptions = ITEMS.filter((item) => item.category !== "Armor");

  function finish() {
    const background = BACKGROUNDS.find((entry) => entry.id === backgroundId);
    const added = new Map<string, number>();
    const legacy: LegacyEquipmentLine[] = [];
    unknown.forEach((line, index) => {
      const selected = matches[index] ?? "keep";
      if (selected === "keep") legacy.push(line);
      else added.set(selected, (added.get(selected) ?? 0) + 1);
    });
    const inventory = [...(inferred.card.inventory ?? [])];
    for (const [itemId, qty] of added) {
      const existing = inventory.find((entry) => entry.itemId === itemId);
      if (existing) existing.qty += qty;
      else inventory.push({ itemId, qty });
    }
    const backgroundSkills = background?.skills ?? [];
    const checkedSkills = SKILLS.filter((skill) => card.sheet?.[`${SHEET_SKILL_FIELD[skill.name]}P`] === true).map((skill) => skill.name);
    const classSkills = checkedSkills.filter((skill) => !backgroundSkills.includes(skill));
    let converted: HunterCard = {
      ...inferred.card,
      classId,
      level,
      backgroundId: backgroundId || undefined,
      background: background?.name ?? inferred.card.background,
      feat: background?.feat ?? null,
      skillProficiencies: [...new Set([...classSkills, ...backgroundSkills])],
      inventory,
      sheetAutomation: {
        version: 1,
        classSkills,
        backgroundBonuses: {},
        startingKitApplied: true,
        setupComplete: true,
        startingKitInventory: [],
        startingKitCoins: 0,
        migratedAt: Date.now(),
        legacyEquipment: legacy,
        manualOverrides: [],
      },
    };
    const calculated = automationFor(converted);
    const manualOverrides = Object.keys(card.sheet ?? {}).filter((key) => {
      if (MAPPED_SOURCE_FIELDS.has(key) || !(key in calculated.fields) || !hasValue(card.sheet?.[key])) return false;
      return calculated.fields[key] !== card.sheet?.[key];
    });
    converted = { ...converted, sheetAutomation: { ...converted.sheetAutomation!, manualOverrides } };
    const fields = Object.fromEntries(Object.entries(automationFor(converted).fields).filter(([key]) => !manualOverrides.includes(key)));
    onApply(fields, {
      name: converted.name,
      classId: converted.classId,
      subclassId: converted.subclassId,
      level: converted.level,
      backgroundId: converted.backgroundId,
      background: converted.background,
      feat: converted.feat,
      abilities: converted.abilities,
      baseAbilities: converted.baseAbilities,
      skillProficiencies: converted.skillProficiencies,
      inventory: converted.inventory,
      sheetAutomation: converted.sheetAutomation,
    });
    onComplete();
  }

  return (
    <div className="conversion-shade" role="dialog" aria-modal="true" aria-label="Convert existing character sheet" data-testid="legacy-conversion-wizard">
      <div className="conversion-card">
        <div className="conversion-progress"><span style={{ width: `${Math.round(((step + 1) / (last + 1)) * 100)}%` }} /></div>
        {step === 0 && <><p className="automation-kicker">ONE-TIME SETUP</p><h2>Connect your written sheet</h2><p>Your entries stay in place. We’ll identify the parts that can link to the rules, one decision at a time. Anything we cannot identify remains exactly as you wrote it.</p><div className="conversion-note"><b>Nothing is deleted.</b><span>Calculated fields that differ from your writing are kept as manual values until you choose otherwise.</span></div></>}
        {step === 1 && <><p className="automation-kicker">1 · CLASS</p><h2>Which class is this?</h2><p>We found “{String(card.sheet?.class ?? "nothing written")}”. Confirm the rules entry it belongs to.</p><label>Class<select autoFocus value={classId} onChange={(event) => setClassId(event.target.value)}><option value="">Keep unlinked for now</option>{CLASSES.map((entry) => <option key={entry.id} value={entry.id}>{entry.title}</option>)}</select></label></>}
        {step === 2 && <><p className="automation-kicker">2 · LEVEL</p><h2>Confirm the level</h2><p>Level controls proficiency, hit points, class features, subclasses, and new choices.</p><label>Level<select autoFocus value={level} onChange={(event) => setLevel(Number(event.target.value))}>{Array.from({ length: 20 }, (_, index) => index + 1).map((value) => <option key={value}>{value}</option>)}</select></label></>}
        {step === 3 && <><p className="automation-kicker">3 · BACKGROUND</p><h2>Which background is this?</h2><p>We found “{String(card.sheet?.background ?? "nothing written")}”. A linked background grants its documented skills, feat, tools, and ability choices.</p><label>Background<select autoFocus value={backgroundId} onChange={(event) => setBackgroundId(event.target.value)}><option value="">Keep unlinked for now</option>{BACKGROUNDS.map((entry) => <option key={entry.id} value={entry.id}>{entry.name}</option>)}</select></label></>}
        {step >= 4 && step < 4 + unknown.length && (() => {
          const index = step - 4;
          const line = unknown[index];
          return <><p className="automation-kicker">EQUIPMENT · {index + 1} OF {unknown.length}</p><h2>What is “{line.name}”?</h2><p>Choose a catalog item to enable automatic weight and carrying rules, or keep your original wording.</p><label>Match<select autoFocus value={matches[index] ?? "keep"} onChange={(event) => setMatches((current) => ({ ...current, [index]: event.target.value }))}><option value="keep">Keep exactly as written</option>{itemOptions.map((item) => <option key={item.id} value={item.id}>{item.name} · {item.weightLb} lb</option>)}</select></label></>;
        })()}
        {step === last && <><p className="automation-kicker">READY</p><h2>Connect this sheet?</h2><p>The sheet will fill blank calculated fields and keep {unknown.filter((_, index) => (matches[index] ?? "keep") === "keep").length} unmatched equipment {unknown.length === 1 ? "entry" : "entries"} as written.</p><div className="conversion-summary"><span><b>{CLASSES.find((entry) => entry.id === classId)?.title ?? "Unlinked class"}</b> · level {level}</span><span>{BACKGROUNDS.find((entry) => entry.id === backgroundId)?.name ?? "Unlinked background"}</span></div></>}
        <div className="conversion-actions"><div className="conversion-back-actions">{step > 0 && <button type="button" className="ghost" onClick={() => setStep((current) => current - 1)}>Back</button>}<button type="button" className="ghost" onClick={onCancel}>{step === 0 ? "Back to hunters" : "Cancel for now"}</button></div><button type="button" className="btn btn-primary" onClick={step === last ? finish : () => setStep((current) => current + 1)}>{step === last ? "Connect and fill sheet" : "Continue"}</button></div>
      </div>
    </div>
  );
}
