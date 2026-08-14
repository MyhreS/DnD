import { useState } from "react";
import { maxAddonPieces } from "@/lib/character";
import type { AppSheetModel } from "../appsheet/appSheetShared";
import { useCharacterAutomation } from "../papersheet/characterAutomationContext";
import { View4AddonArmor } from "./View4AddonArmor";
import { View4ArmorDoll } from "./View4ArmorDoll";
import { View4ArmorRules } from "./View4ArmorRules";
import { View4CarryingGear } from "./View4CarryingGear";
import { View4UniqueArmor } from "./View4UniqueArmor";

export function View4Equipment({ model }: { model: AppSheetModel }) {
  const { card, result } = useCharacterAutomation();
  const [layer, setLayer] = useState<"armor" | "carrying">("armor");
  const addonLimit = maxAddonPieces(card.mainArmorId, card.customItems);
  return <div className="v4-equipment">
    <div className="v4-equipment-summary"><span><small>Armor class</small><strong>{String(result.fields.ac ?? "—")}</strong></span><span><small>Add-ons</small><strong>{card.addonArmorIds?.length ?? 0}/{addonLimit}</strong></span><span><small>Shield arm</small><strong>{result.fields.shieldArm === true ? "Active" : "—"}</strong></span></div>
    <View4ArmorRules />
    <div className="v4-equipment-layer" role="tablist" aria-label="Equipment view">
      <button type="button" role="tab" aria-selected={layer === "armor"} onClick={() => setLayer("armor")}><span>Armor</span><small>What you wear</small></button>
      <button type="button" role="tab" aria-selected={layer === "carrying"} onClick={() => setLayer("carrying")}><span>Carrying</span><small>Where gear lives</small></button>
    </div>
    {layer === "armor" ? <><View4ArmorDoll model={model} /><View4AddonArmor model={model} /><View4UniqueArmor /></> : <View4CarryingGear model={model} />}
  </div>;
}
