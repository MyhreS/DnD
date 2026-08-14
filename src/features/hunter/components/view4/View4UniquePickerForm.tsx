import { useState, type FormEvent } from "react";
import type { SlotAssignment } from "@/types";
import { useCharacterAutomation } from "../papersheet/characterAutomationContext";

export type UniquePickerConfig =
  | { kind: "armor"; armorCategory: "Main Armor" | "Add-on Armor" }
  | { kind: "gear"; target: SlotAssignment; carry: "Significant" | "Oversized" | "Either" };

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

  function submit(event: FormEvent) {
    event.preventDefault();
    if (!name.trim()) return;
    if (config.kind === "armor") automation.addCustomArmor({
      name,
      armorCategory: config.armorCategory,
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
    }, config.target);
    onDone();
  }

  return <form className="v4-slot-unique" onSubmit={submit}>
    <p>Create a one-off item and place it directly in this slot.</p>
    <label><span>Name</span><input value={name} onChange={(event) => setName(event.target.value)} placeholder="Item name" autoFocus /></label>
    <div>
      {config.kind === "armor"
        ? <label><span>AC value</span><input type="number" value={ac} onChange={(event) => setAc(event.target.value)} /></label>
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
