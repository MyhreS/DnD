import { useMemo, useState } from "react";
import { ITEMS } from "@/data/items";
import { ARMOR_BY_ID } from "@/data/armor";
import { STORAGE_BY_ITEM_ID } from "@/data/storage";
import { resolveInventory, resolveStorage } from "@/lib/inventory";
import { computeSlots, SLOT_LOCATION_LABEL, slotAssignmentOptions } from "@/lib/slots";
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

const WEAPON_FACTS: Record<string, { damage: string; properties: string; mastery: string }> = {
  dagger: { damage: "1d4 Piercing", properties: "Finesse, Light, Thrown (20/60)", mastery: "Nick" },
  handaxe: { damage: "1d6 Slashing", properties: "Light, Thrown (20/60)", mastery: "Vex" },
  sickle: { damage: "1d4 Slashing", properties: "Light", mastery: "Nick" },
  greataxe: { damage: "1d12 Slashing", properties: "Heavy, Two-Handed", mastery: "Cleave" },
  greatsword: { damage: "2d6 Slashing", properties: "Heavy, Two-Handed", mastery: "Graze" },
  longsword: { damage: "1d8 Slashing", properties: "Versatile (1d10)", mastery: "Sap" },
  scimitar: { damage: "1d6 Slashing", properties: "Finesse, Light", mastery: "Nick" },
  shortsword: { damage: "1d6 Piercing", properties: "Finesse, Light", mastery: "Vex" },
  "hunter-rifle": { damage: "1d10 Piercing", properties: "Ammunition (100/400; Bullet), Two-Handed", mastery: "Slow" },
  pistol: { damage: "1d10 Piercing", properties: "Ammunition (30/90; Bullet)", mastery: "Vex" },
  "hunter-cleaver": { damage: "—", properties: "Unique Scout weapon; statistics set by the DM", mastery: "—" },
};

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
  // Worn storage leaves the carried inventory for weight/accounting purposes,
  // but still belongs in this single equipment list so its state is editable
  // beside every other item.
  const displayInventory = useMemo(() => {
    const entries = new Map(inventory.map(({ item, qty }) => [item.id, { item, qty }]));
    for (const item of resolveStorage(card)) entries.set(item.id, { item, qty: 1 });
    return [...entries.values()].sort((a, b) => a.item.category.localeCompare(b.item.category) || a.item.name.localeCompare(b.item.name));
  }, [card, inventory]);
  const slots = computeSlots(card);
  const catalog = useMemo(() => ITEMS.filter((item) => item.category !== "Armor"), []);
  const weapons = displayInventory.filter(({ item }) => item.category === "Weapon");

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

      {!model.readOnly && (
        <AppDisclosure title="Add a catalog item" summary="Weapons, gear, tools, ammunition, and valuables">
        <AppPanel title="Add from the rules library" className="appsheet-add-item-panel">
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
            <button type="button" data-testid="appsheet-add-catalog-item" disabled={!catalogId} onClick={addCatalogItem}>Add item</button>
          </div>
          <AutoReason reason="Names, carrying category, weight, and catalog notes come from the Player's Handbook equipment tables." />
        </AppPanel>
        </AppDisclosure>
      )}

      <AppPanel title="Inventory" aside={<span className="appsheet-status-word">{inventory.length} item types</span>}>
        {displayInventory.length ? (
          <div className="appsheet-inventory-list" data-testid="appsheet-inventory">
            {displayInventory.map(({ item, qty }) => {
              const armor = ARMOR_BY_ID[item.id];
              const storage = STORAGE_BY_ITEM_ID[item.id];
              const armorEquipped = armor?.category === "Main Armor"
                ? card.mainArmorId === item.id
                : armor?.category === "Add-on Armor"
                  ? (card.addonArmorIds ?? []).includes(item.id)
                  : armor?.category === "Extra"
                    ? (card.extraArmorIds ?? []).includes(item.id)
                    : false;
              const storageEquipped = (card.equippedStorageIds ?? []).includes(item.id);
              const locations = slotAssignmentOptions(item.carry, card.equippedStorageIds, item.id, item.slotLocation);
              const assignments = card.slotAssignments?.[item.id] ?? [];
              return (
              <div key={item.id}>
                <span className="appsheet-item-mark">{item.category.slice(0, 1)}</span>
                <span className="appsheet-item-name"><b>{item.name}</b><small>{item.category} · {item.carry}{item.unique ? " · Unique" : ""}</small>
                  {!armor && !storage && item.carry !== "Insignificant" && <span className="appsheet-item-assignments">
                    {Array.from({ length: qty }, (_, index) => (
                      <label key={index}>Item {index + 1}
                        <select
                          aria-label={`${item.name} item ${index + 1} carrying slot`}
                          disabled={model.readOnly}
                          value={assignments[index] ?? ""}
                          onChange={(event) => automation.setSlotAssignment(item.id, index, event.target.value as SlotAssignment || null)}
                        >
                          <option value="">Unassigned</option>
                          {locations.map((location) => <option key={location.value} value={location.value}>{location.label}</option>)}
                        </select>
                      </label>
                    ))}
                  </span>}
                </span>
                {armor || storage ? (
                  <select
                    aria-label={`${item.name} ${storage ? "equipped state" : "worn state"}`}
                    disabled={model.readOnly}
                    value={(armor ? armorEquipped : storageEquipped) ? "equipped" : "unequipped"}
                    onChange={(event) => {
                      const equip = event.target.value === "equipped";
                      if (storage) {
                        if (equip !== storageEquipped) automation.toggleStorage(item.id);
                      } else if (armor?.category === "Main Armor") automation.chooseMainArmor(equip ? item.id : "");
                      else if (armor?.category === "Add-on Armor" && equip !== armorEquipped) automation.toggleAddonArmor(item.id);
                      else if (armor?.category === "Extra") automation.setExtra(armor.subcategory!, equip ? item.id : "");
                    }}
                  ><option value="equipped">Equipped</option><option value="unequipped">Unequipped</option></select>
                ) : <span className="appsheet-item-slot">{slots.byItem[item.id] ?? (item.carry === "Insignificant" ? "No slot" : "Unassigned")}</span>}
                <span className="appsheet-item-weight">{Math.round(item.weightLb * qty * 10) / 10} lb</span>
                <NumericStepper value={qty} label={`${item.name} quantity`} disabled={model.readOnly || storageEquipped} onChange={(next) => automation.changeQty(item.id, next - qty)} />
              </div>
              );
            })}
          </div>
        ) : <p className="appsheet-empty-copy">Choose a class to receive its starting equipment, then add a background kit or catalog items.</p>}
        <div className="appsheet-coin-editor">
          <span><b>Gold pieces</b><small>Use the controls instead of retyping the total.</small></span>
          <NumericStepper value={card.coins ?? 0} label="gold pieces" disabled={model.readOnly} onChange={(coins) => model.setFields({ coins: String(coins) }, { coins })} />
        </div>
      </AppPanel>

      <AppDisclosure
        title="Carrying setup"
        summary={`${card.equippedStorageIds?.length ?? 0} storage equipped · ${slots.unstowed.reduce((sum, entry) => sum + entry.count, 0)} unassigned`}
        aside={slots.unstowed.length ? <span className="appsheet-incomplete">Check load</span> : undefined}
      >
      <div className="appsheet-two-column appsheet-disclosure-grid">
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
                  <span><small className="appsheet-weapon-label">Damage</small>{custom?.damage || facts?.damage || "—"}</span>
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
