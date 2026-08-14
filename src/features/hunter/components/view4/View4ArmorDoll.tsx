import { ARMOR, ARMOR_BY_ID } from "@/data/armor";
import { armorFor } from "@/lib/customItems";
import type { AppSheetModel } from "../appsheet/appSheetShared";
import { useCharacterAutomation } from "../papersheet/characterAutomationContext";
import { View4Figure } from "./View4Figure";

const EXTRA_SLOTS = [["Head Gear", "Head"], ["Scarf", "Scarf"], ["Gloves", "Gloves"], ["Boots", "Boots"], ["Robe", "Robe"]] as const;

export function View4ArmorDoll({ model }: { model: AppSheetModel }) {
  const automation = useCharacterAutomation();
  const { card } = automation;
  const customArmor = (card.customItems ?? []).filter((item) => item.category === "Armor" && item.armorCategory === "Main Armor");
  const mainOptions = [
    ...ARMOR.filter((entry) => entry.category === "Main Armor"),
    ...customArmor.flatMap((entry) => armorFor(card, entry.id) ?? []),
  ];
  return <div className="v4-paper-doll">
    <View4Figure classId={card.classId} />
    {EXTRA_SLOTS.map(([subcategory, label]) => {
      const selected = (card.extraArmorIds ?? []).find((id) => ARMOR_BY_ID[id]?.subcategory === subcategory) ?? "";
      return <label key={subcategory} className={`v4-equip-slot v4-equip-${subcategory.toLowerCase().replaceAll(" ", "-")}`}><span>{label}</span><select value={selected} disabled={model.readOnly} onChange={(event) => automation.setExtra(subcategory, event.target.value)}><option value="">None</option>{ARMOR.filter((entry) => entry.category === "Extra" && entry.subcategory === subcategory).map((entry) => <option key={entry.id} value={entry.id}>{entry.name}</option>)}</select></label>;
    })}
    <label className="v4-equip-slot v4-equip-main"><span>Main armor</span><select value={card.mainArmorId ?? ""} disabled={model.readOnly} onChange={(event) => automation.chooseMainArmor(event.target.value)}><option value="">Unarmored</option>{mainOptions.map((entry) => <option key={entry.id} value={entry.id}>{entry.name}{entry.unique ? " · Unique" : ""} · {entry.ac}</option>)}</select></label>
  </div>;
}
