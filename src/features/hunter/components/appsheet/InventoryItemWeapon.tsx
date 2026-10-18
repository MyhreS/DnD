import { WEAPON_MASTERY_DESCRIPTIONS, WEAPON_PROPERTY_DESCRIPTIONS, type WeaponFacts } from "@/data/weapons";
import { formatModifier } from "@/data/abilities";
import { isWeaponProficient, weaponAttackBonus, weaponAttackParts } from "@/lib/character";
import { useCharacterAutomation } from "../papersheet/characterAutomationContext";
import { ExplainValue } from "../character-sheet/CharacterSheetExplain";
import { weaponBreakdown } from "../../lib/calculationBreakdowns";
import { weaponDamageBreakdown } from "../../lib/classBreakdowns";
import { weaponDamageBonuses } from "../../lib/weaponDamageBonuses";
import { ItemStat } from "./InventoryItemParts";

/** "Ammunition (100/400; Bullet), Two-Handed" → ["Ammunition", "Range", "Two-Handed"],
 * the names the property glossary knows. */
function propertyNames(properties: string): string[] {
  const names = Object.keys(WEAPON_PROPERTY_DESCRIPTIONS).filter((name) => name !== "Range" && new RegExp(`\\b${name}\\b`).test(properties));
  return /\(\d+\/\d+/.test(properties) ? [...names, "Range"] : names;
}

function rangeOf(facts: WeaponFacts): { value: string; caption: string } {
  const range = /\((\d+)\/(\d+)/.exec(facts.properties);
  if (range && facts.attack === "Ranged") return { value: `${range[1]} ft`, caption: `Long range ${range[2]} ft` };
  const reach = /\bReach\b/.test(facts.properties) ? "10 ft" : "5 ft";
  return { value: reach, caption: range ? `Thrown ${range[1]}/${range[2]} ft` : "Melee reach" };
}

/** A weapon's item page: the numbers you roll, what its properties and
 * mastery do, and the bonuses this hunter can add. */
export function InventoryItemWeapon({ name, facts, custom }: { name: string; facts: WeaponFacts; custom?: { attackBonus?: string; damage?: string } }) {
  const { card, klass, state } = useCharacterAutomation();
  const parts = weaponAttackParts(card, facts);
  const range = rangeOf(facts);
  const mastered = (state.weaponMasteries ?? []).includes(name);
  const hasMastery = facts.mastery && facts.mastery !== "—";
  const classCovers = klass ? isWeaponProficient(klass.weaponProficiencies, facts) : true;
  const heavy = /Heavy/.test(facts.properties) && (facts.attack === "Melee" ? card.abilities.str < 13 : card.abilities.dex < 13);
  const light = /\bLight\b/.test(facts.properties);
  const bonuses = klass ? weaponDamageBonuses(card, klass).filter((bonus) =>
    bonus.label !== "Ability modifier"
    && !(facts.attack === "Ranged" && /Blood-Tensed|Brutal Strike|Frenzy|Charger/.test(bonus.label))
    && !(bonus.label === "Off-hand Attack" && !light)
    && !(bonus.label === "Great Weapon Master" && !/Heavy/.test(facts.properties))) : [];

  return <>
    <div className="item-detail-stats">
      <ItemStat label="Attack" caption="to hit">
        {custom?.attackBonus || <ExplainValue breakdown={weaponBreakdown(card, name, facts)}>{formatModifier(weaponAttackBonus(card, facts))}</ExplainValue>}
      </ItemStat>
      <ItemStat label="Damage" caption={facts.damageType}>
        {custom?.damage || <ExplainValue breakdown={weaponDamageBreakdown(card, name, facts)}>{`${facts.damage} ${formatModifier(parts.abilityMod)}`}</ExplainValue>}
      </ItemStat>
      <ItemStat label={facts.attack === "Ranged" ? "Range" : "Reach"} caption={range.caption}>{range.value}</ItemStat>
      <ItemStat label="Uses" caption={`${parts.ability} modifier ${formatModifier(parts.abilityMod)}`}>{parts.ability.slice(0, 3).toUpperCase()}</ItemStat>
    </div>

    <p className={`item-detail-callout ${parts.proficient ? "is-good" : "is-warning"}`}>
      <b>{parts.proficient ? "Proficient" : "Not proficient"}</b>
      {parts.proficient
        ? classCovers
          ? `${klass?.title ?? "Your class"} is trained in ${klass?.weaponProficiencies ?? "this weapon"}, and this is a ${facts.category} weapon. Your Proficiency Bonus is added to hit.`
          : "Your Zealot path or a feat gives you Martial weapon training. Your Proficiency Bonus is added to hit."
        : `${klass?.title ?? "Your class"} is trained in ${klass?.weaponProficiencies ?? "other weapons"}. You can still use it, without your Proficiency Bonus.`}
    </p>
    {heavy && <p className="item-detail-callout is-warning"><b>Too heavy for you</b>Heavy needs {facts.attack === "Melee" ? "Strength" : "Dexterity"} 13. Below that, attack rolls with it have Disadvantage.</p>}

    {hasMastery && <section className={`item-detail-feature ${mastered ? "is-active" : ""}`}>
      <header><small>Weapon Mastery</small><b>{facts.mastery}</b><em>{mastered ? "You have mastered it" : "Not one of your masteries"}</em></header>
      <p>{WEAPON_MASTERY_DESCRIPTIONS[facts.mastery]}</p>
    </section>}

    {propertyNames(facts.properties).length > 0 && <section className="item-detail-section">
      <h4>Properties</h4>
      <div className="item-detail-properties">
        {propertyNames(facts.properties).map((property) => <details key={property}>
          <summary>{property}</summary>
          <p>{WEAPON_PROPERTY_DESCRIPTIONS[property]}</p>
        </details>)}
      </div>
    </section>}

    {bonuses.length > 0 && <section className="item-detail-section">
      <h4>Damage you can add</h4>
      <ul className="item-detail-bonuses">
        {bonuses.map((bonus) => <li key={bonus.label}><span><b>{bonus.label}</b><small>{bonus.detail}</small></span><strong>{bonus.value}</strong></li>)}
      </ul>
    </section>}
  </>;
}
