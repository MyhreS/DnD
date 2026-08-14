import { ARMOR } from "@/data/armor";
import { maxAddonPieces, studdedAddonIdsOf } from "@/lib/character";
import { armorFor } from "@/lib/customItems";
import type { AppSheetModel } from "../appsheet/appSheetShared";
import { useCharacterAutomation } from "../papersheet/characterAutomationContext";

export function View4AddonArmor({ model }: { model: AppSheetModel }) {
  const automation = useCharacterAutomation();
  const { card } = automation;
  const custom = (card.customItems ?? []).filter((item) => item.category === "Armor" && item.armorCategory === "Add-on Armor");
  const options = [...ARMOR.filter((entry) => entry.category === "Add-on Armor"), ...custom.flatMap((entry) => armorFor(card, entry.id) ?? [])];
  const selected = card.addonArmorIds ?? [];
  const limit = maxAddonPieces(card.mainArmorId, card.customItems);
  const studded = new Set(studdedAddonIdsOf(card));

  return <section className="v4-addon-slots">
    <header><div><small>Layered protection</small><h3>Add-on armor</h3></div><strong>{selected.length}<span>/{limit}</span></strong></header>
    <div className="v4-addon-worn">
      {selected.map((selectedId, index) => {
        const wornElsewhere = new Set(selected.filter((_, selectedIndex) => selectedIndex !== index));
        const selectedArmor = options.find((entry) => entry.id === selectedId);
        return <article className="v4-addon-piece" key={selectedId}>
          <header><span>Piece {index + 1}</span><button type="button" aria-label={`Remove ${selectedArmor?.name ?? "add-on armor"}`} disabled={model.readOnly} onClick={() => automation.setAddonArmorAt(index, "")}>×</button></header>
          <select aria-label={`Add-on armor piece ${index + 1}`} value={selectedId} disabled={model.readOnly} onChange={(event) => automation.setAddonArmorAt(index, event.target.value)}>{options.map((entry) => <option key={entry.id} value={entry.id} disabled={wornElsewhere.has(entry.id)}>{entry.name} · {entry.ac}</option>)}</select>
          <label className="v4-studs-control"><input type="checkbox" checked={studded.has(selectedId)} disabled={model.readOnly} onChange={() => automation.toggleStuds(selectedId)} /><span>Studded</span><small>+3 lb</small></label>
        </article>;
      })}
      {selected.length < limit && <label className="v4-addon-add"><span>+</span><strong>Add a piece</strong><select aria-label="Add add-on armor" disabled={model.readOnly} value="" onChange={(event) => event.target.value && automation.setAddonArmorAt(selected.length, event.target.value)}><option value="">Choose armor</option>{options.map((entry) => <option key={entry.id} value={entry.id} disabled={selected.includes(entry.id)}>{entry.name} · {entry.ac}</option>)}</select></label>}
    </div>
  </section>;
}
