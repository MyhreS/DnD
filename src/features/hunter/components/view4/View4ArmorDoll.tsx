import { ARMOR } from "@/data/armor";
import { armorFor } from "@/lib/customItems";
import type { AppSheetModel } from "../appsheet/appSheetShared";
import { useCharacterAutomation } from "../papersheet/characterAutomationContext";
import { useEquipmentPicker, type EquipmentPickerOption } from "./view4EquipmentPickerContext";
import { View4EquipmentSocket } from "./View4EquipmentSocket";
import { View4Figure } from "./View4Figure";

const EXTRA_SLOTS = [["Head Gear", "Head"], ["Scarf", "Scarf"], ["Gloves", "Gloves"], ["Boots", "Boots"], ["Robe", "Robe"]] as const;

export function View4ArmorDoll({ model }: { model: AppSheetModel }) {
  const automation = useCharacterAutomation();
  const picker = useEquipmentPicker();
  const { card } = automation;
  const owned = new Set((card.inventory ?? []).filter((entry) => entry.qty > 0).map((entry) => entry.itemId));
  const customArmor = (card.customItems ?? []).filter((item) => item.category === "Armor" && item.armorCategory === "Main Armor");
  const mainOptions = [
    ...ARMOR.filter((entry) => entry.category === "Main Armor"),
    ...customArmor.flatMap((entry) => armorFor(card, entry.id) ?? []),
  ];
  function option(entry: (typeof mainOptions)[number], onChoose: () => void): EquipmentPickerOption {
    return { id: entry.id, name: entry.name, detail: `${entry.ac} · ${entry.weightLb} lb`, kind: "armor", onChoose };
  }

  function openMain() {
    const current = mainOptions.find((entry) => entry.id === card.mainArmorId);
    picker.openPicker({
      title: "Main armor",
      hint: "Choose worn armor. This sets your base armor class.",
      current: current && option(current, () => undefined),
      onRemove: card.mainArmorId ? () => automation.chooseMainArmor("") : undefined,
      inventory: mainOptions.filter((entry) => owned.has(entry.id)).map((entry) => option(entry, () => automation.chooseMainArmor(entry.id))),
      catalogue: mainOptions.filter((entry) => !entry.unique).map((entry) => option(entry, () => automation.chooseMainArmor(entry.id))),
      unique: { kind: "armor", armorCategory: "Main Armor" },
    });
  }

  return <div className="v4-paper-doll">
    <View4Figure classId={card.classId} />
    {EXTRA_SLOTS.map(([subcategory, label]) => {
      const customExtras = (card.customItems ?? [])
        .filter((item) => item.category === "Armor" && item.armorCategory === "Extra" && item.armorSubcategory === subcategory)
        .flatMap((item) => armorFor(card, item.id) ?? []);
      const selected = (card.extraArmorIds ?? []).find((id) => armorFor(card, id)?.subcategory === subcategory) ?? "";
      const options = [...ARMOR.filter((entry) => entry.category === "Extra" && entry.subcategory === subcategory), ...customExtras];
      const current = options.find((entry) => entry.id === selected);
      return <div key={subcategory} className={`v4-equip-slot v4-equip-${subcategory.toLowerCase().replaceAll(" ", "-")}`}><View4EquipmentSocket label={label} name={current?.name} detail={current ? `${current.weightLb} lb` : undefined} kind="armor" disabled={model.readOnly} compact onClick={() => picker.openPicker({
        title: label,
        hint: `Choose one ${label.toLowerCase()} item to wear.`,
        current: current && option(current, () => undefined),
        onRemove: current ? () => automation.setExtra(subcategory, "") : undefined,
        inventory: options.filter((entry) => owned.has(entry.id)).map((entry) => option(entry, () => automation.setExtra(subcategory, entry.id))),
        catalogue: options.filter((entry) => !entry.unique).map((entry) => option(entry, () => automation.setExtra(subcategory, entry.id))),
        unique: { kind: "armor", armorCategory: "Extra", armorSubcategory: subcategory },
      })} /></div>;
    })}
    <div className="v4-equip-slot v4-equip-main"><View4EquipmentSocket label="Main armor" name={mainOptions.find((entry) => entry.id === card.mainArmorId)?.name} detail={mainOptions.find((entry) => entry.id === card.mainArmorId)?.ac ?? "Unarmored"} kind="armor" disabled={model.readOnly} compact onClick={openMain} /></div>
  </div>;
}
