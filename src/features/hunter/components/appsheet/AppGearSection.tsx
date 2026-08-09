import { useMemo, useState } from "react";
import { ITEMS } from "@/data/items";
import { WEAPON_FACTS, weaponDamageLabel } from "@/data/weapons";
import { ARMOR_BY_ID } from "@/data/armor";
import { STORAGE_BY_ITEM_ID } from "@/data/storage";
import { resolveInventory } from "@/lib/inventory";
import { availableSlotAssignmentOptions, computeSlots, SLOT_LOCATION_LABEL } from "@/lib/slots";
import type { CarrySignificance, SlotAssignment } from "@/types";
import { useCharacterAutomation } from "../papersheet/characterAutomationContext";
import {
  AppDisclosure,
  AppPanel,
  AppSection,
  AppSelect,
  AutoReason,
  DecisionField,
  DerivedValue,
  NumericStepper,
  type AppSheetModel,
} from "./appSheetShared";

export function AppGearSection({ model }: { model: AppSheetModel }) {
  const automation = useCharacterAutomation();
  const { card, result } = automation;
  const [catalogId, setCatalogId] = useState("");
  const [showFound, setShowFound] = useState(false);
  const [found, setFound] = useState({
    name: "",
    category: "Gear" as "Weapon" | "Gear",
    carry: "Significant" as CarrySignificance,
    weightLb: 0,
    note: "",
    attackBonus: "",
    damage: "",
    weaponNotes: "",
  });
  const inventory = resolveInventory(card);
  const slots = computeSlots(card);
  const catalog = useMemo(() => ITEMS.filter((item) => item.category !== "Armor"), []);
  const weapons = inventory.filter(({ item }) => item.category === "Weapon");
  const wornStorage = (card.equippedStorageIds ?? []).flatMap((id) => {
    const definition = STORAGE_BY_ITEM_ID[id];
    const item = ITEMS.find((entry) => entry.id === id);
    return definition && item ? [{ definition, item }] : [];
  });

  function addCatalogItem() {
    if (!catalogId) return;
    automation.changeQty(catalogId, 1);
    setCatalogId("");
  }

  return (
    <AppSection title="Gear & carrying">
      <div className="appsheet-focus-strip appsheet-gear-summary">
        <DerivedValue label="Gold" value={card.coins ?? 0} reason="Saved gold pieces; coins do not consume carrying slots." />
        <DerivedValue label="Carried weight" value={result.fields.weight} reason={result.reasons.weight} />
        <DerivedValue label="Load" value={result.fields.weightCondition} reason={result.reasons.weightCondition} />
        <DerivedValue label="Unassigned" value={slots.unstowed.reduce((sum, entry) => sum + entry.count, 0)} reason="Significant and oversized items stay unassigned until you choose a carrying slot." />
      </div>

      <AppPanel title="Inventory" aside={<span className="appsheet-status-word">{inventory.length} item types</span>}>
        {!model.readOnly && (
          <details className="appsheet-catalog-picker" data-testid="appsheet-catalog-picker">
            <summary>Add from rules library</summary>
            <div className="appsheet-catalog-picker-content">
              <div className="appsheet-catalog-add">
                <AppSelect label="Catalog item" value={catalogId} data-testid="appsheet-catalog-item" onChange={(event) => setCatalogId(event.target.value)}>
                  <option value="">Choose an item…</option>
                  {["Weapon", "Ammunition", "Tool", "Gear", "Consumable", "Valuable"].map((category) => (
                    <optgroup key={category} label={category}>
                      {catalog.filter((item) => item.category === category).map((item) => (
                        <option key={item.id} value={item.id}>{item.name} · {item.carry} · {item.weightLb} lb</option>
                      ))}
                    </optgroup>
                  ))}
                </AppSelect>
                <button type="button" data-testid="appsheet-add-catalog-item" disabled={!catalogId} onClick={addCatalogItem}>Add</button>
              </div>
            </div>
          </details>
        )}
        {inventory.length ? (
          <div className="appsheet-inventory-list" data-testid="appsheet-inventory">
            {inventory.map(({ item, qty }) => {
              const armor = ARMOR_BY_ID[item.id];
              const armorEquipped = armor?.category === "Main Armor"
                ? card.mainArmorId === item.id
                : armor?.category === "Add-on Armor"
                  ? (card.addonArmorIds ?? []).includes(item.id)
                  : armor?.category === "Extra"
                    ? (card.extraArmorIds ?? []).includes(item.id)
                    : false;
              const storage = STORAGE_BY_ITEM_ID[item.id];
              const assignments = card.slotAssignments?.[item.id] ?? [];
              return (
              <div key={item.id}>
                <span className="appsheet-item-mark">{item.category.slice(0, 1)}</span>
                <span className="appsheet-item-name"><b>{item.name}</b><small>{item.category} · {item.carry}{item.unique ? " · Unique" : ""}</small>
                  {!armor && item.carry !== "Insignificant" && <span className="appsheet-item-assignments">
                    {Array.from({ length: qty }, (_, index) => (
                      <label key={index}>Item {index + 1}
                        <select
                          aria-label={`${item.name} item ${index + 1} carrying slot`}
                          disabled={model.readOnly}
                          value={assignments[index] ?? ""}
                          onChange={(event) => automation.setSlotAssignment(item.id, index, event.target.value as SlotAssignment || null)}
                        >
                          <option value="">Unassigned</option>
                          {availableSlotAssignmentOptions(card, item.id, index, item.carry, item.slotLocation).map((location) => <option key={location.value} value={location.value}>{location.label}</option>)}
                        </select>
                      </label>
                    ))}
                  </span>}
                </span>
                {armor ? (
                  <select
                    aria-label={`${item.name} worn state`}
                    disabled={model.readOnly}
                    value={armorEquipped ? "equipped" : "unequipped"}
                    onChange={(event) => {
                      const equip = event.target.value === "equipped";
                      if (armor.category === "Main Armor") automation.chooseMainArmor(equip ? item.id : "");
                      else if (armor.category === "Add-on Armor" && equip !== armorEquipped) automation.toggleAddonArmor(item.id);
                      else if (armor.category === "Extra") automation.setExtra(armor.subcategory!, equip ? item.id : "");
                    }}
                  ><option value="equipped">Equipped</option><option value="unequipped">Unequipped</option></select>
                ) : <span className="appsheet-item-slot">{slots.byItem[item.id] ?? (item.carry === "Insignificant" ? "No slot" : "Unassigned")}</span>}
                <span className="appsheet-item-weight">{Math.round(item.weightLb * qty * 10) / 10} lb</span>
                <NumericStepper value={qty} label={`${item.name} quantity`} disabled={model.readOnly} onChange={(next) => automation.changeQty(item.id, next - qty)} />
                {storage && !model.readOnly && <button type="button" className="appsheet-secondary-action" onClick={() => automation.toggleStorage(item.id)}>Wear</button>}
              </div>
              );
            })}
          </div>
        ) : <p className="appsheet-empty-copy">Choose a class to receive its starting equipment, then add a background kit or catalog items.</p>}
        {wornStorage.length > 0 && <div className="appsheet-storage-list" data-testid="appsheet-worn-storage">
          {wornStorage.map(({ definition, item }) => (
            <div key={item.id}>
              <span><b>{item.name}</b><small>{definition.gives.count} {SLOT_LOCATION_LABEL[definition.gives.location].toLowerCase()} {definition.gives.count === 1 ? "slot" : "slots"}{definition.gives.only ? " · Dagger or Pistol only" : ""}</small></span>
              {!model.readOnly && <button type="button" className="appsheet-secondary-action" onClick={() => automation.toggleStorage(item.id)}>Remove</button>}
            </div>
          ))}
        </div>}
        <div className="appsheet-coin-editor">
          <span><b>Gold pieces</b><small>Use the controls instead of retyping the total.</small></span>
          <NumericStepper value={card.coins ?? 0} label="gold pieces" disabled={model.readOnly} onChange={(coins) => model.setFields({ coins: String(coins) }, { coins })} />
        </div>
      </AppPanel>

      <AppDisclosure
        title="Carrying setup"
        summary={`${slots.unstowed.reduce((sum, entry) => sum + entry.count, 0)} unassigned`}
        aside={slots.unstowed.length ? <span className="appsheet-incomplete">Check load</span> : undefined}
      >
      <div className="appsheet-disclosure-grid">
        <AppPanel title="Slot assignment">
          <div className="appsheet-slot-list">
            {slots.rows.map((row) => (
              <div key={row.key} className={row.used > row.capacity ? "over" : ""}>
                <span><b>{SLOT_LOCATION_LABEL[row.location]} · {row.kind}</b><small>{row.items.join(", ") || row.note || "Available"}</small></span>
                <strong>{row.used}/{row.capacity}</strong>
              </div>
            ))}
          </div>
          {slots.unstowed.length > 0 && <p className="appsheet-inline-error">Unassigned: {slots.unstowed.map((entry) => `${entry.name} ×${entry.count}${entry.clamped ? "+" : ""}`).join(", ")}</p>}
        </AppPanel>
      </div>
      </AppDisclosure>

      <AppDisclosure title="Weapon details" summary={`${weapons.length} carried weapon ${weapons.length === 1 ? "type" : "types"}`}>
      <AppPanel title="Carried weapons" aside={<span className="appsheet-status-word">Rules-linked</span>}>
        {weapons.length ? (
          <div className="appsheet-weapon-table">
            <div className="heading"><span>Weapon</span><span>Damage</span><span>Properties</span><span>Mastery</span></div>
            {weapons.map(({ item, qty }) => {
              const custom = (card.customItems ?? []).find((entry) => entry.id === item.id);
              const facts = WEAPON_FACTS[item.id];
              return (
                <div key={item.id}>
                  <span><b>{item.name}</b>{qty > 1 ? ` ×${qty}` : ""}</span>
                  <span><small className="appsheet-weapon-label">Damage</small>{custom?.damage || weaponDamageLabel(facts)}</span>
                  <span><small className="appsheet-weapon-label">Properties</small>{custom?.weaponNotes || facts?.properties || item.note || "—"}</span>
                  <span><small className="appsheet-weapon-label">Mastery</small>{facts?.mastery || "—"}</span>
                </div>
              );
            })}
          </div>
        ) : <p className="appsheet-empty-copy">Carried catalog weapons appear here automatically.</p>}
        <AutoReason reason="Catalog weapon damage, properties, and mastery are transcribed from the handbook Weapons table. The Hunter Cleaver has no published statistics and remains explicitly DM-set." />
      </AppPanel>
      </AppDisclosure>

      {!model.readOnly && (
        <AppDisclosure title="Record a unique item" summary="For weapons or gear found outside the handbook">
        <AppPanel title="Item found outside the handbook" className="appsheet-found-panel">
          {!showFound ? (
            <button type="button" className="appsheet-secondary-action" onClick={() => setShowFound(true)}>Record unique weapon or gear</button>
          ) : (
            <form onSubmit={(event) => {
              event.preventDefault();
              automation.addCustomItem(found);
              setFound({ name: "", category: "Gear", carry: "Significant", weightLb: 0, note: "", attackBonus: "", damage: "", weaponNotes: "" });
              setShowFound(false);
            }}>
              <p className="appsheet-form-intro">This is the manual exception: record the mechanical facts supplied by the DM because the item has no catalog entry.</p>
              <div className="appsheet-form-grid">
                <DecisionField label="Unique item name"><input required value={found.name} onChange={(event) => setFound({ ...found, name: event.target.value })} /></DecisionField>
                <AppSelect label="Type" value={found.category} onChange={(event) => setFound({ ...found, category: event.target.value as typeof found.category })}><option>Weapon</option><option>Gear</option></AppSelect>
                <AppSelect label="Carrying category" value={found.carry} onChange={(event) => setFound({ ...found, carry: event.target.value as CarrySignificance })}><option>Insignificant</option><option>Significant</option><option>Oversized</option></AppSelect>
                <DecisionField label="Weight (lb)"><input type="number" min="0" step="0.1" required value={found.weightLb} onChange={(event) => setFound({ ...found, weightLb: Number(event.target.value) })} /></DecisionField>
              </div>
              {found.category === "Weapon" && <div className="appsheet-form-grid">
                <DecisionField label="Attack bonus"><input value={found.attackBonus} placeholder="e.g. +5" onChange={(event) => setFound({ ...found, attackBonus: event.target.value })} /></DecisionField>
                <DecisionField label="Damage"><input value={found.damage} placeholder="e.g. 1d8 Piercing" onChange={(event) => setFound({ ...found, damage: event.target.value })} /></DecisionField>
              </div>}
              <DecisionField label={found.category === "Weapon" ? "Properties and special rule" : "Special rule or note"}>
                <textarea value={found.category === "Weapon" ? found.weaponNotes : found.note} onChange={(event) => setFound(found.category === "Weapon" ? { ...found, weaponNotes: event.target.value } : { ...found, note: event.target.value })} />
              </DecisionField>
              <div className="appsheet-form-actions"><button type="button" onClick={() => setShowFound(false)}>Cancel</button><button type="submit">Add to inventory</button></div>
            </form>
          )}
        </AppPanel>
        </AppDisclosure>
      )}
    </AppSection>
  );
}
