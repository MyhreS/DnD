import { ARMOR } from "@/data/armor";
import { maxAddonPieces, studdedAddonIdsOf } from "@/lib/character";
import { armorFor } from "@/lib/customItems";
import type { AppSheetModel } from "../appsheet/appSheetShared";
import { useCharacterAutomation } from "../papersheet/characterAutomationContext";
import { useEquipmentPicker, type EquipmentPickerOption } from "./characterSheetEquipmentPickerContext";
import { CharacterSheetEquipmentSocket } from "./CharacterSheetEquipmentSocket";

export function CharacterSheetAddonArmor({ model }: { model: AppSheetModel }) {
  const automation = useCharacterAutomation();
  const picker = useEquipmentPicker();
  const { card } = automation;
  const custom = (card.customItems ?? []).filter((item) => item.category === "Armor" && item.armorCategory === "Add-on Armor");
  const options = [...ARMOR.filter((entry) => entry.category === "Add-on Armor"), ...custom.flatMap((entry) => armorFor(card, entry.id) ?? [])];
  const selected = card.addonArmorIds ?? [];
  const limit = maxAddonPieces(card.mainArmorId, card.customItems);
  const studded = new Set(studdedAddonIdsOf(card));
  const owned = new Set((card.inventory ?? []).filter((entry) => entry.qty > 0).map((entry) => entry.itemId));

  function option(entry: (typeof options)[number], onChoose: () => void): EquipmentPickerOption {
    return { id: entry.id, name: entry.name, detail: `${entry.ac} · ${entry.weightLb} lb`, kind: "armor", onChoose };
  }

  function open(index: number, selectedId?: string) {
    const current = options.find((entry) => entry.id === selectedId);
    const available = options.filter((entry) => !selected.includes(entry.id) || entry.id === selectedId);
    picker.openPicker({
      title: `Add-on armor ${index + 1}`,
      hint: "Layer one armor piece over your main armor.",
      current: current && option(current, () => undefined),
      onRemove: current ? () => automation.setAddonArmorAt(index, "") : undefined,
      inventory: available.filter((entry) => owned.has(entry.id)).map((entry) => option(entry, () => automation.setAddonArmorAt(index, entry.id))),
      catalogue: available.filter((entry) => !entry.unique).map((entry) => option(entry, () => automation.setAddonArmorAt(index, entry.id))),
      unique: { kind: "armor", armorCategory: "Add-on Armor", addonIndex: index },
    });
  }

  return <section className="character-sheet-addon-slots">
    <header><div><small>Layered protection</small><h3>Add-on armor</h3></div><strong>{selected.length}<span>/{limit}</span></strong></header>
    <div className="character-sheet-addon-worn">
      {selected.map((selectedId, index) => {
        const selectedArmor = options.find((entry) => entry.id === selectedId);
        return <article className="character-sheet-addon-piece" key={selectedId}>
          <CharacterSheetEquipmentSocket label={`Piece ${index + 1}`} name={selectedArmor?.name ?? selectedId} detail={selectedArmor?.ac} kind="armor" disabled={model.readOnly} compact onClick={() => open(index, selectedId)} />
          <label className="character-sheet-studs-control"><input type="checkbox" checked={studded.has(selectedId)} disabled={model.readOnly} onChange={() => automation.toggleStuds(selectedId)} /><span>Studded</span><small>+3 lb</small></label>
        </article>;
      })}
      {selected.length < limit && <div className="character-sheet-addon-add"><CharacterSheetEquipmentSocket label={`Piece ${selected.length + 1}`} disabled={model.readOnly} onClick={() => open(selected.length)} /></div>}
    </div>
  </section>;
}
