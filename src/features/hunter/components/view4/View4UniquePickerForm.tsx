import { useState, type FormEvent } from "react";
import { ITEM_BY_ID } from "@/data/items";
import type { ExtraSubcategory, SlotAssignment } from "@/types";
import { useCharacterAutomation, type SlotReplacement } from "../papersheet/characterAutomationContext";

export type UniquePickerConfig =
  | { kind: "armor"; armorCategory: "Main Armor" }
  | { kind: "armor"; armorCategory: "Add-on Armor"; addonIndex: number }
  | { kind: "armor"; armorCategory: "Extra"; armorSubcategory: ExtraSubcategory }
  | { kind: "gear"; target: SlotAssignment; carry: "Significant" | "Oversized" | "Either"; replace?: SlotReplacement; allowedBaseIds?: string[] };

export function View4UniquePickerForm({ config, onDone }: { config: UniquePickerConfig; onDone: () => void }) {
  const automation = useCharacterAutomation();
  const [name, setName] = useState("");
  const [weight, setWeight] = useState("0");
  const [note, setNote] = useState("");
  const [ac, setAc] = useState(config.kind === "armor" && config.armorCategory === "Main Armor" ? "10" : "0");
  const [category, setCategory] = useState<"Weapon" | "Gear">("Gear");
  const [carry, setCarry] = useState<"Significant" | "Oversized">(config.kind === "gear" && config.carry === "Oversized" ? "Oversized" : "Significant");
  const [attack, setAttack] = useState("");
  const [damage, setDamage] = useState("");
  const [catalogBaseId, setCatalogBaseId] = useState(config.kind === "gear" ? config.allowedBaseIds?.[0] ?? "" : "");

  function submit(event: FormEvent) {
    event.preventDefault();
    if (!name.trim()) return;
    if (config.kind === "armor") automation.addCustomArmor({
      name,
      armorCategory: config.armorCategory,
      armorSubcategory: config.armorCategory === "Extra" ? config.armorSubcategory : undefined,
      addonIndex: config.armorCategory === "Add-on Armor" ? config.addonIndex : undefined,
      acValue: Number(ac) || 0,
      weightLb: Number(weight) || 0,
      note,
    });
    else automation.addCustomItem({
      name,
      category,
      carry,
      weightLb: Number(weight) || 0,
      note,
      attackBonus: attack,
      damage,
      weaponNotes: note,
      catalogBaseId: catalogBaseId || undefined,
    }, config.target, config.replace);
    onDone();
  }

  return <form className="v4-slot-unique" onSubmit={submit}>
    <p>Create a one-off item and place it directly in this slot.</p>
    <label><span>Name</span><input value={name} onChange={(event) => setName(event.target.value)} placeholder="Item name" autoFocus /></label>
    {config.kind === "gear" && config.allowedBaseIds?.length && <label><span>Fits as</span><select value={catalogBaseId} onChange={(event) => setCatalogBaseId(event.target.value)}>{config.allowedBaseIds.map((id) => <option value={id} key={id}>{ITEM_BY_ID[id]?.name ?? id}</option>)}</select></label>}
    <div>
      {config.kind === "armor"
        ? config.armorCategory !== "Extra" && <label><span>AC value</span><input type="number" value={ac} onChange={(event) => setAc(event.target.value)} /></label>
        : <><label><span>Type</span><select value={category} onChange={(event) => setCategory(event.target.value as "Weapon" | "Gear")}><option>Gear</option><option>Weapon</option></select></label>{config.carry === "Either" && <label><span>Carrying size</span><select value={carry} onChange={(event) => setCarry(event.target.value as "Significant" | "Oversized")}><option>Significant</option><option>Oversized</option></select></label>}</>}
      <label><span>Weight (lb)</span><input type="number" min="0" value={weight} onChange={(event) => setWeight(event.target.value)} /></label>
    </div>
    {config.kind === "gear" && category === "Weapon" && <div>
      <label><span>Attack bonus</span><input value={attack} onChange={(event) => setAttack(event.target.value)} placeholder="+5" /></label>
      <label><span>Damage</span><input value={damage} onChange={(event) => setDamage(event.target.value)} placeholder="1d8 slashing" /></label>
    </div>}
    <label><span>Notes</span><textarea value={note} onChange={(event) => setNote(event.target.value)} placeholder="Rules, qualities or history" /></label>
    <button type="submit" className="primary">Create & equip</button>
  </form>;
}
