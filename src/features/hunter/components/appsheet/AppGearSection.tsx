import { ITEMS } from "@/data/items";
import { WEAPON_FACTS, weaponDamageLabel } from "@/data/weapons";
import { STORAGE_BY_ITEM_ID } from "@/data/storage";
import { resolveUnassignedInventory } from "@/features/hunter/lib/inventoryPlacement";
import { resolveInventory } from "@/lib/inventory";
import { computeSlots, SLOT_LOCATION_LABEL } from "@/lib/slots";
import { formatModifier } from "@/data/abilities";
import { isWeaponProficient, weaponAttackBonus } from "@/lib/character";
import { useCharacterAutomation } from "../papersheet/characterAutomationContext";
import { useCharacterSheetPageNavigation } from "../character-sheet/characterSheetPageNavigation";
import { InventoryCard } from "./InventoryCard";
import { CatalogCategoryIcon } from "./CatalogIcons";
import "./catalog-browser.css";
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
          <div className={`appsheet-inventory-list inventory-card-grid${manageEquipmentSeparately ? " appsheet-inventory-loose" : ""}`} data-testid="appsheet-inventory">
            {inventory.map(({ item, qty, purity }) => (
              <InventoryCard
                key={purity ? `${item.id}#${purity}` : item.id}
                item={item}
                qty={qty}
                purity={purity}
                slotLabel={slots.byItem[item.id] ?? (item.carry === "Insignificant" ? "No slot" : "Unassigned")}
                readOnly={model.readOnly}
                loose={manageEquipmentSeparately}
              />
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

      <AppDisclosure title="Weapon details" summary={`${weapons.length} carried weapon ${weapons.length === 1 ? "type" : "types"}`}>
      <AppPanel title="Carried weapons" aside={<span className="appsheet-status-word">Rules-linked</span>}>
        {weapons.length ? (
          <div className="appsheet-weapon-table">
            <div className="heading"><span>Weapon</span><span>Attack</span><span>Damage</span><span>Properties</span><span>Mastery</span></div>
            {weapons.map(({ item, qty }) => {
              const custom = (card.customItems ?? []).find((entry) => entry.id === item.id);
              const facts = WEAPON_FACTS[item.id];
              // core-rulebook.txt [page 109] Heavy: Disadvantage on attack rolls
              // if a Melee Heavy weapon and Strength is under 13, or a Ranged
              // Heavy weapon and Dexterity is under 13. The app does not roll
              // attacks, so this is advisory only.
              const heavyWarning = facts && /Heavy/.test(facts.properties)
                && (facts.attack === "Melee" ? card.abilities.str < 13 : card.abilities.dex < 13)
                ? `Heavy: ${facts.attack === "Melee" ? "Strength" : "Dexterity"} under 13 — attack rolls with this weapon have Disadvantage.`
                : "";
              // core-rulebook.txt [page 12]: the Proficiency Bonus applies only to
              // weapons you are proficient with, so the Attack column omits it
              // otherwise. Say so, or the lower number looks like a bug.
              const proficiencyWarning = facts && automation.klass && !isWeaponProficient(automation.klass.weaponProficiencies, facts)
                ? `Not proficient: ${automation.klass.title} covers ${automation.klass.weaponProficiencies.toLowerCase()} — attacks add no Proficiency Bonus.`
                : "";
              return (
                <div key={item.id}>
                  <span><b>{item.name}</b>{qty > 1 ? ` ×${qty}` : ""}{heavyWarning && <small>{heavyWarning}</small>}{proficiencyWarning && <small>{proficiencyWarning}</small>}</span>
                  <span><small className="appsheet-weapon-label">Attack</small>{custom?.attackBonus || formatModifier(weaponAttackBonus(card, facts))}</span>
                  <span><small className="appsheet-weapon-label">Damage</small>{custom?.damage || weaponDamageLabel(facts)}</span>
                  <span><small className="appsheet-weapon-label">Properties</small>{custom?.weaponNotes || facts?.properties || item.note || "—"}</span>
                  <span><small className="appsheet-weapon-label">Mastery</small>{facts?.mastery || "—"}</span>
                </div>
              );
            })}
          </div>
        ) : <p className="appsheet-empty-copy">Carried catalog weapons appear here automatically.</p>}
        <AutoReason reason="Damage, properties and mastery come from the C&S Core Rulebook weapons table; the attack bonus is the ability modifier this weapon uses, plus your Proficiency Bonus where you are proficient with it." />
      </AppPanel>
      {includeDamageBonuses && <AppWeaponDamageBonuses card={card} klass={automation.klass} />}
      </AppDisclosure>

    </AppSection>
  );
}
