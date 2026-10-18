import { ITEMS } from "@/data/items";
import { STORAGE_BY_ITEM_ID } from "@/data/storage";
import { wornEquipment } from "@/features/hunter/lib/inventoryPlacement";
import { resolveInventory } from "@/lib/inventory";
import { computeSlots, SLOT_LOCATION_LABEL } from "@/lib/slots";
import { useCharacterAutomation } from "../papersheet/characterAutomationContext";
import { useCharacterSheetPageNavigation } from "../character-sheet/characterSheetPageNavigation";
import { InventoryCard } from "./InventoryCard";
import { CatalogCategoryIcon } from "./CatalogIcons";
import "./catalog-browser.css";
import { InventoryAddPageMenu } from "./InventoryAddPages";
import {
  AppPanel,
  AppSection,
  DerivedValue,
  NumericStepper,
  type AppSheetModel,
} from "./appSheetShared";
import { breakdownFor } from "../../lib/calculationBreakdowns";

/** The inventory's sections, in the order players look for things. Anything
 * of a category not listed lands in "Other". */
const INVENTORY_GROUPS: Array<{ title: string; categories: string[] }> = [
  { title: "Weapons", categories: ["Weapon"] },
  { title: "Ammunition", categories: ["Ammunition"] },
  { title: "Armor", categories: ["Armor"] },
  { title: "Consumables", categories: ["Consumable"] },
  { title: "Tools", categories: ["Tool"] },
  { title: "Gear", categories: ["Gear"] },
  { title: "Valuables", categories: ["Valuable"] },
];
const GROUPED = new Set(INVENTORY_GROUPS.flatMap((group) => group.categories));
INVENTORY_GROUPS.push({ title: "Other", categories: [] });

export function AppGearSection({
  model,
  defaultOpen = false,
  hideArmor = false,
  hideGoldSummary = false,
  manageEquipmentSeparately = false,
}: {
  model: AppSheetModel;
  defaultOpen?: boolean;
  hideArmor?: boolean;
  hideGoldSummary?: boolean;
  manageEquipmentSeparately?: boolean;
}) {
  const automation = useCharacterAutomation();
  const pageNavigation = useCharacterSheetPageNavigation();
  const { card, result } = automation;
  const inventory = resolveInventory(card).filter(({ item }) => !hideArmor || item.category !== "Armor");
  const slots = computeSlots(card);
  // Everything worn right now, which is held outside the inventory lines.
  const wornItems = manageEquipmentSeparately ? wornEquipment(card) : [];
  const wornStorage = (card.equippedStorageIds ?? []).flatMap((id) => {
    const definition = STORAGE_BY_ITEM_ID[id];
    const item = ITEMS.find((entry) => entry.id === id);
    return definition && item ? [{ definition, item }] : [];
  });

  return (
    <AppSection title="Gear & carrying" defaultOpen={defaultOpen}>
      <div className="appsheet-focus-strip appsheet-gear-summary">
        {!hideGoldSummary && <DerivedValue label="Gold" value={card.coins ?? 0} reason="Saved gold pieces; coins do not consume carrying slots." />}
        <DerivedValue label="Carried weight" value={result.fields.weight} reason={result.reasons.weight} breakdown={breakdownFor(card, "weight")} />
        <DerivedValue label="Load" value={result.fields.weightCondition} reason={result.reasons.weightCondition} breakdown={breakdownFor(card, "weightCondition")} />
        <DerivedValue label="Unassigned" value={slots.unstowed.reduce((sum, entry) => sum + entry.count, 0)} reason="Significant and oversized items stay unassigned until you choose a carrying slot." />
      </div>

      <AppPanel title="Inventory" aside={!model.readOnly ? (
        <button type="button" className="appsheet-inventory-add" data-testid="appsheet-inventory-add" onClick={() => pageNavigation.pushPage({ id: "inventory-add", title: "Add to inventory", eyebrow: "Choose item source", content: <InventoryAddPageMenu /> })}>
          <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M8 3v10M3 8h10" /></svg>
          Add
        </button>
      ) : <span className="appsheet-status-word">{inventory.length} item types</span>}>
        {inventory.length || wornItems.length ? (
          <div className="inventory-groups" data-testid="appsheet-inventory">
            {[
              { title: "Worn", cards: wornItems.map(({ item, label }) => (
                <InventoryCard key={`worn:${item.id}`} item={item} qty={1} worn={label} readOnly={model.readOnly} loose={manageEquipmentSeparately} />
              )) },
              ...INVENTORY_GROUPS.map(({ title, categories }) => ({
                title,
                cards: inventory.filter(({ item }) => (categories.length ? categories.includes(item.category) : !GROUPED.has(item.category))).map(({ item, qty, purity }) => (
                  <InventoryCard
                    key={purity ? `${item.id}#${purity}` : item.id}
                    item={item}
                    qty={qty}
                    purity={purity}
                    slotLabel={slots.byItem[item.id] ?? (item.carry === "Insignificant" ? "No slot" : "Unassigned")}
                    readOnly={model.readOnly}
                    loose={manageEquipmentSeparately}
                    placements={manageEquipmentSeparately ? slots.placements[item.id] : undefined}
                  />
                )),
              })),
            ].filter((group) => group.cards.length).map((group) => (
              <section key={group.title} className="inventory-group" aria-label={group.title}>
                <h4>{group.title}<small>{group.cards.length}</small></h4>
                <div className={`appsheet-inventory-list inventory-card-grid${manageEquipmentSeparately ? " appsheet-inventory-loose" : ""}`}>{group.cards}</div>
              </section>
            ))}
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
        <div className="appsheet-coin-editor inventory-gold-card">
          <span className="catalog-card-art"><CatalogCategoryIcon category="Coins" /></span>
          <span><b>Gold pieces</b><small>Coins take no carrying slot.</small></span>
          <NumericStepper value={card.coins ?? 0} label="gold pieces" disabled={model.readOnly} onChange={(coins) => model.setFields({ coins: String(coins) }, { coins })} />
        </div>
      </AppPanel>
    </AppSection>
  );
}
