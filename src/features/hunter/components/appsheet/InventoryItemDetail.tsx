import { ARMOR_BY_ID } from "@/data/armor";
import { BLOODVIAL_PURITY_BY_ID } from "@/data/bloodvial";
import { STORAGE_BY_ITEM_ID } from "@/data/storage";
import { WEAPON_FACTS } from "@/data/weapons";
import { resolveInventory } from "@/lib/inventory";
import { SLOT_LOCATION_LABEL } from "@/lib/slots";
import type { BloodvialPurity, Item } from "@/types";
import { useCharacterAutomation } from "../papersheet/characterAutomationContext";
import { BloodvialIcon, CatalogCategoryIcon, type CatalogIconName } from "./CatalogIcons";
import { InventoryItemWeapon } from "./InventoryItemWeapon";
import { ItemStat } from "./InventoryItemParts";
import "./item-detail.css";

const FIREARM = /rifle|pistol|gun|musket|blunderbuss|cannon|carbine/i;

const CARRY_NOTE: Record<string, string> = {
  Insignificant: "Takes no carrying slot",
  Significant: "Takes one carrying slot",
  Oversized: "Needs a hand or the back",
};

/** The page an inventory card opens: everything about one item, laid out
 * for reading at the table rather than as a table row. */
export function InventoryItemDetail({ item, qty, purity, where }: { item: Item; qty: number; purity?: BloodvialPurity; where: string[] }) {
  const { card } = useCharacterAutomation();
  const facts = WEAPON_FACTS[item.id];
  const custom = (card.customItems ?? []).find((entry) => entry.id === item.id);
  const armor = ARMOR_BY_ID[item.id];
  const storage = STORAGE_BY_ITEM_ID[item.id];
  const blood = purity ? BLOODVIAL_PURITY_BY_ID[purity] : undefined;
  const icon: CatalogIconName = item.category === "Weapon" && FIREARM.test(item.name) ? "Firearm" : item.category as CatalogIconName;
  const kind = facts && facts.category !== "Unarmed" ? `${facts.category} ${facts.attack} Weapon` : armor ? armor.category : item.category;
  const firedBy = item.category === "Ammunition"
    ? resolveInventory(card).filter(({ item: weapon }) => /Bullet/.test(WEAPON_FACTS[weapon.id]?.properties ?? "")).map(({ item: weapon }) => weapon.name)
    : [];

  return <article className={`item-detail is-${item.category.toLowerCase()}`}>
    <header className="item-detail-hero">
      <span className="item-detail-art">{purity ? <BloodvialIcon purity={purity} /> : <CatalogCategoryIcon category={icon} />}</span>
      <div>
        <small>{kind}{item.unique ? " · Unique" : ""}</small>
        <h3>{item.name}{blood ? <em>{blood.name}</em> : null}</h3>
        <span className="item-detail-where">
          <strong>{qty} carried</strong>
          {where.map((entry) => <strong key={entry} className="is-equipped">{entry}</strong>)}
        </span>
      </div>
    </header>

    {facts && facts.damage !== "—" && <InventoryItemWeapon name={item.name} facts={facts} custom={custom ? { attackBonus: custom.attackBonus, damage: custom.damage } : undefined} />}

    {!facts && (custom?.attackBonus || custom?.damage) && <div className="item-detail-stats">
      {custom.attackBonus && <ItemStat label="Attack" caption="to hit, recorded when found">{custom.attackBonus}</ItemStat>}
      {custom.damage && <ItemStat label="Damage" caption="Recorded when found">{custom.damage}</ItemStat>}
    </div>}

    {armor && <>
      <div className="item-detail-stats">
        <ItemStat label="Armor Class" caption={armor.category === "Main Armor" ? "Base AC while worn" : "Added to your AC"}>{armor.ac}</ItemStat>
        {armor.subcategory && <ItemStat label="Worn on" caption="One per spot">{armor.subcategory}</ItemStat>}
      </div>
      {armor.special && <section className="item-detail-feature is-active"><header><small>While worn</small></header><p>{armor.special}</p></section>}
      {armor.impression && <p className="item-detail-quote">Others read you as {armor.impression}.</p>}
    </>}

    {blood && <>
      <div className="item-detail-stats">
        {blood.healing && <ItemStat label="Heals" caption="Hit Points">{blood.healing}</ItemStat>}
        {blood.madnessRemoved != null && <ItemStat label="Calms" caption="Madness removed">−{blood.madnessRemoved}</ItemStat>}
        <ItemStat label="Grit save" caption="When you drink">DC {blood.gritDc}</ItemStat>
      </div>
      {blood.choices.length > 0 && <section className="item-detail-section"><h4>Choose one</h4><ul className="item-detail-bonuses">{blood.choices.map((choice) => <li key={choice}><span><small>{choice}</small></span></li>)}</ul></section>}
      <p className="item-detail-callout is-warning"><b>If the Grit save fails</b>You gain {blood.transformationLevelsOnFailure} Transformation {blood.transformationLevelsOnFailure === 1 ? "Level" : "Levels"} and {blood.madnessOnFailure} Madness.</p>
      <p className="item-detail-quote">{blood.note}</p>
    </>}

    {storage && <div className="item-detail-stats">
      <ItemStat label="Gives" caption={storage.gives.only ? `${storage.gives.only.join(" or ")} only` : "Significant item slots"}>{storage.gives.count} × {SLOT_LOCATION_LABEL[storage.gives.location]}</ItemStat>
      <ItemStat label="Worn on" caption={storage.requires ? `Uses a ${storage.requires.kind} slot` : "Takes no slot"}>{storage.requires ? SLOT_LOCATION_LABEL[storage.requires.location] : "Ankle"}</ItemStat>
    </div>}

    {firedBy.length > 0 && <p className="item-detail-callout is-good"><b>Fired by</b>{firedBy.join(", ")}</p>}

    {(custom?.weaponNotes || (item.note && !blood && !armor && !storage)) && <p className="item-detail-quote">{custom?.weaponNotes || item.note}</p>}

    <div className="item-detail-facts">
      <ItemStat label="Weight" caption={item.weightLb === 0 ? "Too light to count" : qty > 1 ? `${Math.round(item.weightLb * qty * 10) / 10} lb for ${qty}` : "Each"}>{item.weightLb === 0 ? "None" : `${item.weightLb} lb`}</ItemStat>
      <ItemStat label="Carry" caption={CARRY_NOTE[item.carry]}>{item.carry}</ItemStat>
      {item.priceGp != null && <ItemStat label="Value" caption="From the item cost list">{item.priceGp === "varies" ? "Varies" : `${item.priceGp} gp`}</ItemStat>}
    </div>
  </article>;
}
