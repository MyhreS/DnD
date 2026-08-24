import { abilityModifier, formatModifier } from "@/data/abilities";
import { armorClassFor, proficiencyBonus } from "@/lib/character";
import type { AppSheetModel } from "../appsheet/appSheetShared";
import { sheetText } from "../appsheet/appSheetValues";
import { useCharacterAutomation } from "../papersheet/characterAutomationContext";
import { CharacterSheetResourceControl } from "./CharacterSheetResourceControl";

export type CharacterSheetDerivedStatKind = "ac" | "speed" | "passive" | "initiative";

const CONFIG = {
  ac: { field: "acModifier", result: "ac", label: "Armor Class", suffix: "", note: "A situational, magical, or house-rule adjustment to your calculated AC." },
  speed: { field: "speedModifier", result: "speed", label: "Speed", suffix: " ft", note: "A permanent speed adjustment from an effect not already in your class rules." },
  passive: { field: "passivePerceptionModifier", result: "passivePerception", label: "Passive Perception", suffix: "", note: "An adjustment from an effect not already included in Wisdom or proficiency." },
  initiative: { field: "initiativeModifier", result: "initiative", label: "Initiative", suffix: "", note: "An adjustment from an effect not already included in Dexterity or features." },
} as const;

function numberOf(value: unknown): number {
  const parsed = Number.parseInt(String(value), 10);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function CharacterSheetDerivedStat({ model, kind }: { model: AppSheetModel; kind: CharacterSheetDerivedStatKind }) {
  const { card, klass, background, result } = useCharacterAutomation();
  const config = CONFIG[kind];
  const modifier = numberOf(sheetText(model.data, config.field));
  const total = numberOf(result.fields[config.result]);
  const proficient = result.fields.skPerceptionP === true;
  const hasAlert = [background?.feat, card.feat, ...(card.feats ?? [])].filter(Boolean).includes("Alert");
  const armor = armorClassFor(card);
  const rows = kind === "ac"
    ? [["Main armor", armor.baseAc], ["Add-on armor", armor.addonBonus], ["Studded upgrades", armor.studBonus], [armor.dexRule, armor.dexApplied], ["Custom modifier", modifier]]
    : kind === "speed"
      ? [[`${klass?.title ?? "Class"} base speed`, (klass?.speedFt ?? total) as number], ["Custom modifier", modifier]]
      : kind === "passive"
        ? [["Starting value", 10], ["Wisdom modifier", abilityModifier(card.abilities.wis)], ["Perception proficiency", proficient ? proficiencyBonus(card.level) : 0], ["Custom modifier", modifier]]
        : [["Dexterity modifier", abilityModifier(card.abilities.dex)], ["Alert proficiency bonus", hasAlert ? proficiencyBonus(card.level) : 0], ["Custom modifier", modifier]];

  return <div className="character-sheet-derived-stat-page">
    <section className="character-sheet-derived-total"><small>Current {config.label}</small><strong>{kind === "initiative" ? formatModifier(total) : `${total}${config.suffix}`}</strong><p>{result.reasons[config.result]}</p></section>
    <section className="character-sheet-derived-breakdown"><h3>How it is calculated</h3>{rows.map(([label, value]) => <div key={label}><span>{label}</span><strong>{typeof value === "number" && value > 0 ? `+${value}` : value}{kind === "speed" ? " ft" : ""}</strong></div>)}</section>
    <section className="character-sheet-derived-modifier"><h3>Add a modifier</h3><CharacterSheetResourceControl label={`${config.label} modifier`} value={modifier} min={-50} max={50} note={config.note} disabled={model.readOnly} onChange={(value) => model.setField(config.field, String(value))} /></section>
  </div>;
}
