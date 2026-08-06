import { useState } from "react";
import { ARMOR, ARMOR_BY_ID } from "@/data/armor";
import { maxAddonPieces, studdedAddonIdsOf } from "@/lib/character";
import { armorFor } from "@/lib/customItems";
import { useCharacterAutomation } from "../papersheet/characterAutomationContext";
import {
  AppDisclosure,
  AppPanel,
  AppSection,
  AppSelect,
  AutoReason,
  ChoiceToggle,
  DecisionField,
  DerivedValue,
  type AppSheetModel,
} from "./appSheetShared";

const EXTRAS = [
  ["Head Gear", "Head gear"],
  ["Scarf", "Scarf"],
  ["Gloves", "Gloves"],
  ["Boots", "Boots"],
] as const;

export function AppCombatSection({ model }: { model: AppSheetModel }) {
  const automation = useCharacterAutomation();
  const { card, result, klass } = automation;
  const [showFound, setShowFound] = useState(false);
  const [found, setFound] = useState({ name: "", armorCategory: "Main Armor" as "Main Armor" | "Add-on Armor", acValue: 10, weightLb: 0, note: "" });
  const customArmor = (card.customItems ?? []).filter((item) => item.category === "Armor");
  const mainOptions = [
    ...ARMOR.filter((entry) => entry.category === "Main Armor"),
    ...customArmor.filter((entry) => entry.armorCategory === "Main Armor").map((entry) => armorFor(card, entry.id)!),
  ];
  const addonOptions = [
    ...ARMOR.filter((entry) => entry.category === "Add-on Armor"),
    ...customArmor.filter((entry) => entry.armorCategory === "Add-on Armor").map((entry) => armorFor(card, entry.id)!),
  ];
  const addonLimit = maxAddonPieces(card.mainArmorId, card.customItems);
  const studded = new Set(studdedAddonIdsOf(card));
  const foundAddonFull = found.armorCategory === "Add-on Armor" && (card.addonArmorIds?.length ?? 0) >= addonLimit;
  const wornMainArmor = mainOptions.find((entry) => entry.id === card.mainArmorId);

  return (
    <AppSection title="Combat & armor">
      <div className="appsheet-focus-strip appsheet-armor-summary">
        <DerivedValue label="Armor class" value={result.fields.ac} reason={result.reasons.ac} testId="appsheet-combat-ac" />
        <DerivedValue label="Worn armor" value={wornMainArmor?.name ?? "Unarmored"} reason={result.reasons.armorCategory} />
        <DerivedValue label="Shield Arm" value={result.fields.shieldArm === true ? "Active" : "—"} reason={result.reasons.shieldArm} />
      </div>

      <AppDisclosure
        title="Change worn armor"
        summary={`${(card.addonArmorIds ?? []).length}/${addonLimit} add-ons · ${card.extraArmorIds?.length ?? 0} extras`}
      >
      <AppPanel title="Main armor and add-ons" aside={<span className="appsheet-status-word">{(card.addonArmorIds ?? []).length}/{addonLimit} add-ons</span>}>
        <AppSelect
          label="Main armor"
          value={card.mainArmorId ?? ""}
          disabled={model.readOnly}
          data-testid="appsheet-main-armor"
          help="Sets base AC. Add-ons, studs, and Dexterity are then applied automatically."
          onChange={(event) => automation.chooseMainArmor(event.target.value)}
        >
          <option value="">Unarmored</option>
          {mainOptions.map((entry) => <option key={entry.id} value={entry.id}>{entry.name}{entry.unique ? " · Unique" : ""} · {entry.ac} · {entry.weightLb} lb</option>)}
        </AppSelect>
        <div className="appsheet-armor-options">
          {addonOptions.map((entry) => {
            const selected = (card.addonArmorIds ?? []).includes(entry.id);
            return (
              <div key={entry.id} className="appsheet-armor-choice">
                <ChoiceToggle
                  label={entry.name}
                  meta={`${entry.ac} · ${entry.weightLb} lb${entry.unique ? " · Unique" : ""}`}
                  checked={selected}
                  disabled={model.readOnly || (!selected && (card.addonArmorIds?.length ?? 0) >= addonLimit)}
                  onChange={() => automation.toggleAddonArmor(entry.id)}
                />
                {selected && (
                  <label className="appsheet-studs-toggle">
                    <input type="checkbox" checked={studded.has(entry.id)} disabled={model.readOnly} onChange={() => automation.toggleStuds(entry.id)} />
                    Studded · +3 lb
                  </label>
                )}
              </div>
            );
          })}
        </div>
        <AutoReason reason="Main armor supplies base AC. Add-ons contribute their listed bonus; a matching pauldron and vambrace activate Shield Arm; one or five studded pieces add the handbook Studs bonus." />
      </AppPanel>

      <AppPanel title="Worn extras">
        <div className="appsheet-form-grid">
          {EXTRAS.map(([subcategory, label]) => {
            const selected = (card.extraArmorIds ?? []).find((id) => ARMOR_BY_ID[id]?.subcategory === subcategory) ?? "";
            return (
              <AppSelect key={subcategory} label={label} value={selected} disabled={model.readOnly} onChange={(event) => automation.setExtra(subcategory, event.target.value)}>
                <option value="">None</option>
                {ARMOR.filter((entry) => entry.category === "Extra" && entry.subcategory === subcategory && !entry.unique).map((entry) => <option key={entry.id} value={entry.id}>{entry.name} · {entry.weightLb} lb</option>)}
              </AppSelect>
            );
          })}
        </div>
        <AutoReason reason="Only one item can occupy each extra-armor category. Extras update weight, special rules, and impressions." />
      </AppPanel>
      </AppDisclosure>

      <AppDisclosure
        title="Armor rules"
        summary={`${String(result.fields.armorCategory || "Unarmored")} · training, effects, and appearance`}
      >
      <div className="appsheet-two-column appsheet-disclosure-grid">
        <AppPanel title="Training">
          <div className="appsheet-read-list">
            <span><b>Armor</b><strong>{klass?.armorTraining.join(" · ") || "Choose a class"}</strong></span>
            <span><b>Weapons</b><strong>{klass?.weaponProficiencies || "Choose a class"}</strong></span>
          </div>
          <AutoReason reason={result.reasons.armorLight} />
        </AppPanel>
        <AppPanel title="Armor effects">
          <div className="appsheet-read-copy"><b>Special rules</b><p>{String(result.fields.special || "No worn armor effects.")}</p></div>
          <div className="appsheet-read-copy"><b>Impressions</b><p>{String(result.fields.impressions || "No visible armor impression.")}</p></div>
        </AppPanel>
      </div>
      </AppDisclosure>

      {!model.readOnly && (
        <AppDisclosure title="Record unique armor" summary="For armor found outside the handbook">
        <AppPanel title="Unique armor" className="appsheet-found-panel">
          {!showFound ? (
            <button type="button" className="appsheet-secondary-action" onClick={() => setShowFound(true)}>Record unique armor</button>
          ) : (
            <form onSubmit={(event) => { event.preventDefault(); automation.addCustomArmor(found); setFound({ name: "", armorCategory: "Main Armor", acValue: 10, weightLb: 0, note: "" }); setShowFound(false); }}>
              <p className="appsheet-form-intro">Manual entry is used here because this item has no catalog record. Use the values supplied by the DM.</p>
              <div className="appsheet-form-grid">
                <DecisionField label="Unique armor name"><input required value={found.name} onChange={(event) => setFound({ ...found, name: event.target.value })} /></DecisionField>
                <AppSelect label="Armor type" value={found.armorCategory} onChange={(event) => setFound({ ...found, armorCategory: event.target.value as typeof found.armorCategory, acValue: event.target.value === "Main Armor" ? 10 : 0 })}><option>Main Armor</option><option>Add-on Armor</option></AppSelect>
                <DecisionField label={found.armorCategory === "Main Armor" ? "Base AC" : "AC bonus"}><input type="number" min="0" max="30" required value={found.acValue} onChange={(event) => setFound({ ...found, acValue: Number(event.target.value) })} /></DecisionField>
                <DecisionField label="Weight (lb)"><input type="number" min="0" step="0.1" required value={found.weightLb} onChange={(event) => setFound({ ...found, weightLb: Number(event.target.value) })} /></DecisionField>
              </div>
              <DecisionField label="Special rule or note"><textarea value={found.note} onChange={(event) => setFound({ ...found, note: event.target.value })} /></DecisionField>
              {foundAddonFull && <p className="appsheet-inline-error">All add-on slots are full. Remove one worn piece first.</p>}
              <div className="appsheet-form-actions"><button type="button" onClick={() => setShowFound(false)}>Cancel</button><button type="submit" disabled={foundAddonFull}>Add and equip</button></div>
            </form>
          )}
        </AppPanel>
        </AppDisclosure>
      )}
    </AppSection>
  );
}
