import { useState } from "react";
import { maxAddonPieces } from "@/lib/character";
import type { AppSheetModel } from "../appsheet/appSheetShared";
import { useCharacterAutomation } from "../papersheet/characterAutomationContext";
import { CharacterSheetAddonArmor } from "./CharacterSheetAddonArmor";
import { CharacterSheetArmorDoll } from "./CharacterSheetArmorDoll";
import { CharacterSheetArmorRules } from "./CharacterSheetArmorRules";
import { CharacterSheetCarryingGear } from "./CharacterSheetCarryingGear";
import { CharacterSheetEquipmentPickerProvider } from "./CharacterSheetEquipmentPicker";

export function CharacterSheetEquipment({ model }: { model: AppSheetModel }) {
  return <CharacterSheetEquipmentPickerProvider><EquipmentPage model={model} /></CharacterSheetEquipmentPickerProvider>;
}

function EquipmentPage({ model }: { model: AppSheetModel }) {
  const { card, result } = useCharacterAutomation();
  const [layer, setLayer] = useState<"armor" | "carrying">("armor");
  const addonLimit = maxAddonPieces(card.mainArmorId, card.customItems);
  return <div className="character-sheet-equipment">
    <div className="character-sheet-equipment-summary"><span><small>Armor class</small><strong>{String(result.fields.ac ?? "—")}</strong></span><span><small>Carried weight</small><strong>{String(result.fields.weight ?? "0 lb")}</strong></span><span><small>Load effect</small><strong>{String(result.fields.weightCondition ?? "Unburdened")}</strong></span><span><small>Add-ons</small><strong>{card.addonArmorIds?.length ?? 0}/{addonLimit}</strong></span></div>
    <CharacterSheetArmorRules />
    <div className="character-sheet-equipment-layer" role="tablist" aria-label="Equipment view">
      <button type="button" role="tab" aria-selected={layer === "armor"} onClick={() => setLayer("armor")}><span>Armor</span><small>What you wear</small></button>
      <button type="button" role="tab" aria-selected={layer === "carrying"} onClick={() => setLayer("carrying")}><span>Carrying</span><small>Where gear lives</small></button>
    </div>
    {layer === "armor" ? <><CharacterSheetArmorDoll model={model} /><CharacterSheetAddonArmor model={model} /></> : <CharacterSheetCarryingGear model={model} />}
  </div>;
}
