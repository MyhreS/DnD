import { BLOODVIAL_ITEM_ID, BLOODVIAL_PURITY_BY_ID } from "@/data/bloodvial";
import { ARMOR_BY_ID } from "@/data/armor";
import { STORAGE_BY_ITEM_ID } from "@/data/storage";
import { availableSlotAssignmentOptions } from "@/lib/slots";
import type { BloodvialPurity, Item, SlotAssignment } from "@/types";
import { useCharacterAutomation } from "../papersheet/characterAutomationContext";
import { AppBloodvialPurity } from "./AppBloodvialPurity";
import { BloodvialIcon, CatalogCategoryIcon, type CatalogIconName } from "./CatalogIcons";
import { NumericStepper } from "./appSheetShared";

const FIREARM = /rifle|pistol|gun|musket|blunderbuss|cannon|carbine/i;

/** One inventory line as a card in the game catalogue's style: icon, name,
 * tags, count, and the line's own controls (carrying slots, armor worn state,
 * Bloodvial purity and Spend, Wear for storage). */
export function InventoryCard({ item, qty, purity, slotLabel, placements, worn, readOnly, loose }: {
  item: Item;
  qty: number;
  purity?: BloodvialPurity;
  slotLabel?: string;
  /** Where this line's units are: shown as chips ("1 × Right Hand"). */
  placements?: Array<{ label: string; count: number }>;
  /** Set for something worn right now (armor, a belt): shown as "Worn · …", no count. */
  worn?: string;
  readOnly: boolean;
  /** The Inventory page: equipping happens on the Equipment page, so no slot controls. */
  loose: boolean;
}) {
  const automation = useCharacterAutomation();
  const { card } = automation;
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
  const purityName = purity ? BLOODVIAL_PURITY_BY_ID[purity].name : "";
  const icon: CatalogIconName = item.category === "Weapon" && FIREARM.test(item.name) ? "Firearm" : item.category as CatalogIconName;
  const tags = [item.category, item.carry, `${Math.round(item.weightLb * qty * 10) / 10} lb`, ...(item.unique ? ["Unique"] : []), ...(!loose && !armor && slotLabel ? [slotLabel] : [])];

  return (
    <article className={`inventory-card catalog-card is-${item.category.toLowerCase()}`}>
      <span className="catalog-card-art">{purity ? <BloodvialIcon purity={purity} /> : <CatalogCategoryIcon category={icon} />}</span>
      <div className="catalog-card-body">
        <b>{item.name}{purity ? ` · ${purityName}` : ""}</b>
        <span className="catalog-card-tags">{tags.map((tag) => <em key={tag}>{tag}</em>)}</span>
        {(worn || placements?.length) && <span className="inventory-card-where" aria-label={`Where: ${worn ?? placements!.map((entry) => `${entry.count} ${entry.label}`).join(", ")}`}>
          {worn
            ? <strong className="is-equipped">{worn}</strong>
            : placements!.map((entry) => <strong key={entry.label} className={entry.label === "Unassigned" ? "is-loose" : "is-equipped"}>{entry.count} × {entry.label === "Unassigned" ? "Not equipped" : entry.label}</strong>)}
        </span>}
      </div>
      <div className="inventory-card-count">
        {worn ? null : <NumericStepper value={qty} label={`${item.name}${purity ? ` ${purityName}` : ""} quantity`} disabled={readOnly} onChange={(next) => automation.changeQty(item.id, next - qty, purity)} />}
      </div>
      <div className="inventory-card-extras">
        {!loose && !armor && item.carry !== "Insignificant" && <span className="appsheet-item-assignments inventory-card-slots">
          {Array.from({ length: qty }, (_, index) => (
            <label key={index}>Item {index + 1}
              <select
                aria-label={`${item.name} item ${index + 1} carrying slot`}
                disabled={readOnly}
                value={assignments[index] ?? ""}
                onChange={(event) => automation.setSlotAssignment(item.id, index, event.target.value as SlotAssignment || null)}
              >
                <option value="">Unassigned</option>
                {availableSlotAssignmentOptions(card, item.id, index, item.carry, item.slotLocation).map((location) => <option key={location.value} value={location.value}>{location.label}</option>)}
              </select>
            </label>
          ))}
        </span>}
        {armor && !worn && <label className="inventory-card-worn">Worn
          <select
            aria-label={`${item.name} worn state`}
            disabled={readOnly}
            value={armorEquipped ? "equipped" : "unequipped"}
            onChange={(event) => {
              const equip = event.target.value === "equipped";
              if (armor.category === "Main Armor") automation.chooseMainArmor(equip ? item.id : "");
              else if (armor.category === "Add-on Armor" && equip !== armorEquipped) automation.toggleAddonArmor(item.id);
              else if (armor.category === "Extra") automation.setExtra(armor.subcategory!, equip ? item.id : "");
            }}
          ><option value="equipped">Equipped</option><option value="unequipped">Unequipped</option></select>
        </label>}
        {item.id === BLOODVIAL_ITEM_ID && purity && <div className="inventory-card-blood"><AppBloodvialPurity purity={purity} readOnly={readOnly} onChange={(next) => automation.setBloodvialPurity(purity, next)} /></div>}
        <div className="inventory-card-actions">
          {purity && !readOnly && <button type="button" className="appsheet-spend-vial" data-haptic="success" aria-label={`Spend one ${purityName} Bloodvial`} onClick={() => automation.spendBloodvial(purity)}>Spend 1 <small>drink or give one · leaves an empty Vial</small></button>}
          {!loose && storage && !readOnly && !worn && <button type="button" className="appsheet-secondary-action" onClick={() => automation.toggleStorage(item.id)}>Wear</button>}
          {worn && storage && !readOnly && <button type="button" className="appsheet-secondary-action" onClick={() => automation.toggleStorage(item.id)}>Take off</button>}
        </div>
      </div>
    </article>
  );
}
