import { ARMOR, ARMOR_BY_ID } from "@/data/armor";
import { maxAddonPieces, studdedAddonIdsOf } from "@/lib/character";
import { armorFor } from "@/lib/customItems";
import type { AppSheetModel } from "../appsheet/appSheetShared";
import { useCharacterAutomation } from "../papersheet/characterAutomationContext";
import { View4Figure } from "./View4Figure";
import { View4ArmorRules } from "./View4ArmorRules";
import { View4CarryingSlots } from "./View4CarryingSlots";
import { View4UniqueArmor } from "./View4UniqueArmor";

const EXTRA_SLOTS = [["Head Gear", "Head"], ["Scarf", "Scarf"], ["Gloves", "Hands"], ["Boots", "Boots"], ["Robe", "Robe"]] as const;

export function View4Equipment({ model }: { model: AppSheetModel }) {
  const automation = useCharacterAutomation();
  const { card, result } = automation;
  const customArmor = (card.customItems ?? []).filter((item) => item.category === "Armor");
  const mainOptions = [...ARMOR.filter((entry) => entry.category === "Main Armor"), ...customArmor.filter((entry) => entry.armorCategory === "Main Armor").map((entry) => armorFor(card, entry.id)!)];
  const addonOptions = [...ARMOR.filter((entry) => entry.category === "Add-on Armor"), ...customArmor.filter((entry) => entry.armorCategory === "Add-on Armor").map((entry) => armorFor(card, entry.id)!)];
  const addonLimit = maxAddonPieces(card.mainArmorId, card.customItems);
  const studded = new Set(studdedAddonIdsOf(card));
  return <div className="v4-equipment">
    <div className="v4-equipment-summary"><span><small>Armor class</small><strong>{String(result.fields.ac ?? "—")}</strong></span><span><small>Add-ons</small><strong>{card.addonArmorIds?.length ?? 0}/{addonLimit}</strong></span><span><small>Shield arm</small><strong>{result.fields.shieldArm === true ? "Active" : "—"}</strong></span></div>
    <View4CarryingSlots model={model} />
    <div className="v4-paper-doll">
      <View4Figure classId={card.classId} />
      {EXTRA_SLOTS.map(([subcategory, label]) => {
        const selected = (card.extraArmorIds ?? []).find((id) => ARMOR_BY_ID[id]?.subcategory === subcategory) ?? "";
        return <label key={subcategory} className={`v4-equip-slot v4-equip-${subcategory.toLowerCase().replaceAll(" ", "-")}`}><span>{label}</span><select value={selected} disabled={model.readOnly} onChange={(event) => automation.setExtra(subcategory, event.target.value)}><option value="">None</option>{ARMOR.filter((entry) => entry.category === "Extra" && entry.subcategory === subcategory).map((entry) => <option key={entry.id} value={entry.id}>{entry.name}</option>)}</select></label>;
      })}
      <label className="v4-equip-slot v4-equip-main"><span>Main armor</span><select value={card.mainArmorId ?? ""} disabled={model.readOnly} onChange={(event) => automation.chooseMainArmor(event.target.value)}><option value="">Unarmored</option>{mainOptions.map((entry) => <option key={entry.id} value={entry.id}>{entry.name}{entry.unique ? " · Unique" : ""} · {entry.ac} · {entry.weightLb} lb</option>)}</select></label>
    </div>
    <section className="v4-addon-slots"><header><h3>Add-on armor</h3><small>Choose up to {addonLimit} pieces</small></header><div>{Array.from({ length: addonLimit }, (_, index) => {
      const selectedId = card.addonArmorIds?.[index] ?? "";
      const wornElsewhere = new Set((card.addonArmorIds ?? []).filter((_, selectedIndex) => selectedIndex !== index));
      return <div className="v4-addon-slot" key={index}><label><span>Slot {index + 1}</span><select value={selectedId} disabled={model.readOnly} onChange={(event) => automation.setAddonArmorAt(index, event.target.value)}><option value="">Empty</option>{addonOptions.map((entry) => <option key={entry.id} value={entry.id} disabled={wornElsewhere.has(entry.id)}>{entry.name}{entry.unique ? " · Unique" : ""} · {entry.ac} · {entry.weightLb} lb</option>)}</select></label><label className="v4-studs-control"><input type="checkbox" checked={!!selectedId && studded.has(selectedId)} disabled={model.readOnly || !selectedId} onChange={() => selectedId && automation.toggleStuds(selectedId)} />Studded · +3 lb</label></div>;
    })}</div></section>
    <View4ArmorRules />
    <View4UniqueArmor />
  </div>;
}
