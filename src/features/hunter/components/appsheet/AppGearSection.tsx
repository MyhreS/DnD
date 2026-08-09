import { useCallback, useMemo, useRef, useState } from "react";
import { ITEMS } from "@/data/items";
import { WEAPON_FACTS, weaponDamageLabel } from "@/data/weapons";
import { ARMOR_BY_ID } from "@/data/armor";
import { STORAGE_BY_ITEM_ID } from "@/data/storage";
import { resolveInventory } from "@/lib/inventory";
import { availableSlotAssignmentOptions, computeSlots, SLOT_LOCATION_LABEL } from "@/lib/slots";
import type { SlotAssignment } from "@/types";
import { useCharacterAutomation } from "../papersheet/characterAutomationContext";
import { CarryingCustomization } from "./CarryingCustomization";
import { InventoryAddDialog } from "./InventoryAddDialog";
import { CatalogItemForm, UniqueItemForm, type FoundItemDraft } from "./InventoryAddForms";
import {
  AppDisclosure,
  AppPanel,
  AppSection,
  AutoReason,
  DerivedValue,
  NumericStepper,
  type AppSheetModel,
} from "./appSheetShared";

export function AppGearSection({
  model,
  defaultOpen = false,
  quickView = false,
}: {
  model: AppSheetModel;
  defaultOpen?: boolean;
  quickView?: boolean;
}) {
  const automation = useCharacterAutomation();
  const { card, result } = automation;
  const [catalogId, setCatalogId] = useState("");
  const [addMenuOpen, setAddMenuOpen] = useState(false);
  const [showFound, setShowFound] = useState(false);
  const addButtonRef = useRef<HTMLButtonElement>(null);
  const [found, setFound] = useState<FoundItemDraft>({
    name: "",
    category: "Gear",
    carry: "Significant",
    weightLb: 0,
    note: "",
    attackBonus: "",
    damage: "",
    weaponNotes: "",
  });
  const closeAddMenu = useCallback(() => setAddMenuOpen(false), []);
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

  function addUniqueItem() {
    automation.addCustomItem(found);
    setFound({ name: "", category: "Gear", carry: "Significant", weightLb: 0, note: "", attackBonus: "", damage: "", weaponNotes: "" });
    setShowFound(false);
  }

  return (
    <AppSection title="Gear & carrying" defaultOpen={defaultOpen}>
      <div className="appsheet-focus-strip appsheet-gear-summary">
        <DerivedValue label="Gold" value={card.coins ?? 0} reason="Saved gold pieces; coins do not consume carrying slots." />
        <DerivedValue label="Carried weight" value={result.fields.weight} reason={result.reasons.weight} />
        <DerivedValue label="Load" value={result.fields.weightCondition} reason={result.reasons.weightCondition} />
        <DerivedValue label="Unassigned" value={slots.unstowed.reduce((sum, entry) => sum + entry.count, 0)} reason="Significant and oversized items stay unassigned until you choose a carrying slot." />
      </div>

      <AppPanel title="Inventory" aside={!model.readOnly && !quickView ? (
        <button ref={addButtonRef} type="button" className="appsheet-inventory-add" data-testid="appsheet-inventory-add" aria-haspopup="dialog" aria-expanded={addMenuOpen} onClick={() => setAddMenuOpen(true)}>
          <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M8 3v10M3 8h10" /></svg>
          Add
        </button>
      ) : <span className="appsheet-status-word">{inventory.length} item types</span>}>
        {!model.readOnly && quickView && (
          <details className="appsheet-catalog-picker" data-testid="appsheet-catalog-picker">
            <summary>Add from rules library</summary>
            <div className="appsheet-catalog-picker-content">
              <CatalogItemForm catalog={catalog} catalogId={catalogId} setCatalogId={setCatalogId} onAdd={addCatalogItem} />
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

      {quickView && (
        <AppDisclosure
          title={quickView ? "Carrying customization" : "Carrying setup"}
          summary={`${slots.unstowed.reduce((sum, entry) => sum + entry.count, 0)} unassigned`}
          aside={slots.unstowed.length ? <span className="appsheet-incomplete">Check load</span> : undefined}
        >
          <CarryingCustomization classId={card.classId} slots={slots} showWardenReference={quickView} />
        </AppDisclosure>
      )}

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

      {!model.readOnly && quickView && (
        <AppDisclosure title="Record a unique item" summary="For weapons or gear found outside the handbook">
        <AppPanel title="Item found outside the handbook" className="appsheet-found-panel">
          {!showFound ? (
            <button type="button" className="appsheet-secondary-action" onClick={() => setShowFound(true)}>Record unique weapon or gear</button>
          ) : (
            <UniqueItemForm found={found} setFound={setFound} onCancel={() => setShowFound(false)} onAdd={addUniqueItem} />
          )}
        </AppPanel>
        </AppDisclosure>
      )}
      {!model.readOnly && !quickView && addMenuOpen && <InventoryAddDialog triggerRef={addButtonRef} catalog={catalog} catalogId={catalogId} setCatalogId={setCatalogId} found={found} setFound={setFound} addCatalogItem={addCatalogItem} addUniqueItem={addUniqueItem} onClose={closeAddMenu} />}
    </AppSection>
  );
}
