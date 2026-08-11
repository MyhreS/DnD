import { useState } from "react";
import { maxAddonPieces } from "@/lib/character";
import { useCharacterAutomation } from "../papersheet/characterAutomationContext";

const EMPTY_ARMOR = { name: "", armorCategory: "Main Armor" as "Main Armor" | "Add-on Armor", acValue: 10, weightLb: 0, note: "" };

export function View4UniqueArmor() {
  const automation = useCharacterAutomation();
  const [open, setOpen] = useState(false);
  const [armor, setArmor] = useState(EMPTY_ARMOR);
  if (automation.readOnly) return null;
  const addonFull = armor.armorCategory === "Add-on Armor"
    && (automation.card.addonArmorIds?.length ?? 0) >= maxAddonPieces(automation.card.mainArmorId, automation.card.customItems);

  return <section className="v4-unique-armor">
    <header><div><small>Found outside the handbook</small><h3>Unique armor</h3></div><button type="button" onClick={() => setOpen((current) => !current)}>{open ? "Cancel" : "+ Add unique armor"}</button></header>
    {open && <form data-testid="view4-unique-armor-form" onSubmit={(event) => {
      event.preventDefault();
      automation.addCustomArmor(armor);
      setArmor(EMPTY_ARMOR);
      setOpen(false);
    }}>
      <p>Enter the values supplied by the DM. The new piece is saved and equipped immediately.</p>
      <div>
        <label><span>Name</span><input aria-label="Unique armor name" required value={armor.name} onChange={(event) => setArmor({ ...armor, name: event.target.value })} /></label>
        <label><span>Armor type</span><select aria-label="Unique armor type" value={armor.armorCategory} onChange={(event) => {
          const armorCategory = event.target.value as typeof armor.armorCategory;
          setArmor({ ...armor, armorCategory, acValue: armorCategory === "Main Armor" ? 10 : 0 });
        }}><option>Main Armor</option><option>Add-on Armor</option></select></label>
        <label><span>{armor.armorCategory === "Main Armor" ? "Base AC" : "AC bonus"}</span><input aria-label="Unique armor AC" type="number" min="0" max="30" required value={armor.acValue} onChange={(event) => setArmor({ ...armor, acValue: Number(event.target.value) })} /></label>
        <label><span>Weight (lb)</span><input aria-label="Unique armor weight" type="number" min="0" step="0.1" required value={armor.weightLb} onChange={(event) => setArmor({ ...armor, weightLb: Number(event.target.value) })} /></label>
      </div>
      <label><span>Special rule or note</span><textarea aria-label="Unique armor note" value={armor.note} onChange={(event) => setArmor({ ...armor, note: event.target.value })} /></label>
      {addonFull && <p className="v4-unique-error">All Add-on slots are full. Remove one worn piece first.</p>}
      <button type="submit" disabled={addonFull}>Add and equip</button>
    </form>}
  </section>;
}
