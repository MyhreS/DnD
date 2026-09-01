import { ITEMS } from "@/data/items";
import { WEAPON_FACTS, weaponDamageLabel } from "@/data/weapons";
import { ARMOR_BY_ID } from "@/data/armor";
import { STORAGE_BY_ITEM_ID } from "@/data/storage";
import { resolveUnassignedInventory } from "@/features/hunter/lib/inventoryPlacement";
import { resolveInventory } from "@/lib/inventory";
import { availableSlotAssignmentOptions, computeSlots, SLOT_LOCATION_LABEL } from "@/lib/slots";
import type { SlotAssignment } from "@/types";
import { useCharacterAutomation } from "../papersheet/characterAutomationContext";
import { useCharacterSheetPageNavigation } from "../character-sheet/characterSheetPageNavigation";
import { InventoryAddPageMenu } from "./InventoryAddPages";
import { AppWeaponDamageBonuses } from "./AppWeaponReference";
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
  hideArmor = false,
  hideGoldSummary = false,
  includeDamageBonuses = false,
  manageEquipmentSeparately = false,
}: {
  model: AppSheetModel;
  defaultOpen?: boolean;
  hideArmor?: boolean;
  hideGoldSummary?: boolean;
  includeDamageBonuses?: boolean;
  manageEquipmentSeparately?: boolean;
}) {
  const automation = useCharacterAutomation();
  const pageNavigation = useCharacterSheetPageNavigation();
  const { card, result } = automation;
  const inventory = (manageEquipmentSeparately ? resolveUnassignedInventory(card) : resolveInventory(card))
    .filter(({ item }) => !hideArmor || item.category !== "Armor");
  const slots = computeSlots(card);
  const weapons = inventory.filter(({ item }) => item.category === "Weapon");
  const wornStorage = (card.equippedStorageIds ?? []).flatMap((id) => {
    const definition = STORAGE_BY_ITEM_ID[id];
    const item = ITEMS.find((entry) => entry.id === id);
    return definition && item ? [{ definition, item }] : [];
  });

  return (
    <AppSection title="Gear & carrying" defaultOpen={defaultOpen}>
      <div className="appsheet-focus-strip appsheet-gear-summary">
        {!hideGoldSummary && <DerivedValue label="Gold" value={card.coins ?? 0} reason="Saved gold pieces; coins do not consume carrying slots." />}
        <DerivedValue label="Carried weight" value={result.fields.weight} reason={result.reasons.weight} />
        <DerivedValue label="Load" value={result.fields.weightCondition} reason={result.reasons.weightCondition} />
        <DerivedValue label="Unassigned" value={slots.unstowed.reduce((sum, entry) => sum + entry.count, 0)} reason="Significant and oversized items stay unassigned until you choose a carrying slot." />
      </div>

      <AppPanel title="Inventory" aside={!model.readOnly ? (
        <button type="button" className="appsheet-inventory-add" data-testid="appsheet-inventory-add" onClick={() => pageNavigation.pushPage({ id: "inventory-add", title: "Add to inventory", eyebrow: "Choose item source", content: <InventoryAddPageMenu /> })}>
          <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M8 3v10M3 8h10" /></svg>
          Add
        </button>
      ) : <span className="appsheet-status-word">{inventory.length} item types</span>}>
        {inventory.length ? (
          <div className={`appsheet-inventory-list${manageEquipmentSeparately ? " appsheet-inventory-loose" : ""}`} data-testid="appsheet-inventory">
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
                  {!manageEquipmentSeparately && !armor && item.carry !== "Insignificant" && <span className="appsheet-item-assignments">
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
                ) : !manageEquipmentSeparately && <span className="appsheet-item-slot">{slots.byItem[item.id] ?? (item.carry === "Insignificant" ? "No slot" : "Unassigned")}</span>}
                <span className="appsheet-item-weight">{Math.round(item.weightLb * qty * 10) / 10} lb</span>
                <NumericStepper value={qty} label={`${item.name} quantity`} disabled={model.readOnly} onChange={(next) => automation.changeQty(item.id, next - qty)} />
                {!manageEquipmentSeparately && storage && !model.readOnly && <button type="button" className="appsheet-secondary-action" onClick={() => automation.toggleStorage(item.id)}>Wear</button>}
              </div>
              );
            })}
          </div>
        ) : <p className="appsheet-empty-copy">{manageEquipmentSeparately ? "Everything is equipped. Add another item or return equipment to Inventory." : "Choose a class to receive its starting equipment, then add a background kit or catalog items."}</p>}
        {!manageEquipmentSeparately && wornStorage.length > 0 && <div className="appsheet-storage-list" data-testid="appsheet-worn-storage">
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
        <AutoReason reason="Weapon damage, properties, and mastery come from the C&S Core Rulebook weapons table." />
      </AppPanel>
      {includeDamageBonuses && <AppWeaponDamageBonuses card={card} klass={automation.klass} />}
      </AppDisclosure>

    </AppSection>
  );
}
