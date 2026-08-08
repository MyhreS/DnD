import { Link } from "react-router-dom";
import { abilityModifier } from "@/data/abilities";
import { WEAPON_FACTS, weaponDamageLabel } from "@/data/weapons";
import { resolveInventory } from "@/lib/inventory";
import type { HunterCard, HunterClass, Item } from "@/types";
import { AppDisclosure, AppPanel, AutoReason } from "./appSheetShared";

interface DamageBonus {
  label: string;
  value: string;
  detail: string;
}

function signed(value: number): string {
  return value >= 0 ? `+${value}` : String(value);
}

function bonusesFor(card: HunterCard, klass: HunterClass): DamageBonus[] {
  const progression = klass.progression.find((row) => row.level === card.level);
  const bonuses: DamageBonus[] = [
    {
      label: "Ability modifier",
      value: "Add to each hit",
      detail: `Melee weapons use Strength (${signed(abilityModifier(card.abilities.str))}); ranged weapons use Dexterity (${signed(abilityModifier(card.abilities.dex))}).`,
    },
  ];
  if (klass.id === "scout") bonuses.push({ label: "Hunter's Mark", value: card.level >= 20 ? "+1d10" : "+1d6", detail: "On each hit against your marked quarry." });
  if (klass.id === "stalker") bonuses.push({ label: "Sneak Attack", value: `+${progression?.extras["Sneak Attack"] ?? "1d6"}`, detail: "Once per turn with a Finesse or Ranged weapon when its conditions are met." });
  if (klass.id === "bloodbound" && card.level >= 9) bonuses.push({ label: "Brutal Strike", value: card.level >= 17 ? "+2d10" : "+1d10", detail: "On one Strength-based hit after forgoing Reckless Attack advantage." });
  if (card.subclassId === "berserker") bonuses.push({ label: "Frenzy", value: "+d6s", detail: "While Blood Frenzy and Reckless Attack are active, add d6s equal to your Blood Frenzy Damage bonus to your first Strength-based hit." });
  if (card.subclassId === "battle-master") bonuses.push({ label: "Maneuvers", value: card.level >= 18 ? "+1d12" : card.level >= 10 ? "+1d10" : "+1d8", detail: "A chosen maneuver can add a Superiority Die to a qualifying attack's damage." });
  if (card.subclassId === "zealot") bonuses.push(
    { label: "Eldritch Armament", value: "Rite modifier", detail: "Use your Rite Performing ability for a proficient weapon's attack and damage; it may deal Eldritch Power damage." },
    { label: "Patron's Blow", value: "+1d8 / Strain level", detail: "Once per turn on a weapon hit, spend one Strain for extra Eldritch Power damage." },
  );
  if (card.subclassId === "commander" && card.level >= 6) bonuses.push({ label: "Commander's Strike", value: "+Directive die", detail: "A companion's reaction weapon hit can add your Bands Directive Die." });
  if (card.subclassId === "warbringer") bonuses.push({ label: "Combat Inspiration", value: "+Directive die", detail: "A creature with your Bands Directive Die can add it to a hit's damage." });
  const feats = [card.feat, ...(card.feats ?? [])];
  if (feats.includes("Savage Attacker")) bonuses.push({ label: "Savage Attacker", value: "Reroll damage dice", detail: "Once per turn on a weapon hit, roll the weapon's damage dice twice and use either roll." });
  if (feats.includes("Great Weapon Master")) bonuses.push({ label: "Great Weapon Master", value: `+${progression?.profBonus ?? 2}`, detail: "Once per turn when a Heavy weapon hits as part of the Attack action." });
  if (feats.includes("Charger")) bonuses.push({ label: "Charger", value: "+1d8", detail: "Once per turn after moving at least 10 feet straight before a melee hit." });
  return bonuses;
}

function WeaponRow({ item, quantity, card }: { item: Item; quantity: number; card: HunterCard }) {
  const custom = (card.customItems ?? []).find((entry) => entry.id === item.id);
  const facts = WEAPON_FACTS[item.id];
  const ability = facts?.attack === "Ranged" ? "Dexterity" : "Strength";
  const modifier = facts?.attack === "Ranged" ? abilityModifier(card.abilities.dex) : abilityModifier(card.abilities.str);
  return (
    <details className="appsheet-rite-reference appsheet-weapon-reference">
      <summary>
        <span><b>{item.name}{quantity > 1 ? ` ×${quantity}` : ""}</b><small>{facts?.attack ?? "Weapon"} · {facts?.properties ?? custom?.weaponNotes ?? item.note ?? "DM-set details"}</small></span>
        <span>{custom?.damage || weaponDamageLabel(facts)}</span>
      </summary>
      <div>
        <dl>
          <div><dt>Damage die</dt><dd>{facts?.damage ?? "DM-set"}</dd></div>
          <div><dt>Damage type</dt><dd>{facts?.damageType ?? "DM-set"}</dd></div>
          <div><dt>Damage roll</dt><dd>{custom?.damage ? "Use the DM-set weapon rule" : `${signed(modifier)} ${ability} modifier`}</dd></div>
          <div><dt>Mastery</dt><dd>{facts?.mastery ?? "DM-set"}</dd></div>
        </dl>
        <p className="appsheet-weapon-reference-note">{custom?.weaponNotes || facts?.properties || item.note || "Check the table ruling for this weapon."}</p>
      </div>
    </details>
  );
}

export function AppWeaponReference({ card, klass }: { card: HunterCard; klass: HunterClass | undefined }) {
  if (!klass) return null;
  const weapons = resolveInventory(card).filter(({ item }) => item.category === "Weapon");
  const bonuses = bonusesFor(card, klass);
  return (
    <AppDisclosure title="Weapons" summary={`${weapons.length} carried type${weapons.length === 1 ? "" : "s"} · ${klass.weaponProficiencies}`} className="appsheet-weapons-disclosure">
      <AppPanel title="Carried weapon reference" aside={<span className="appsheet-status-word">Damage & type</span>}>
        {weapons.length ? <div className="appsheet-rite-reference-list">{weapons.map(({ item, qty }) => <WeaponRow key={item.id} item={item} quantity={qty} card={card} />)}</div> : <p className="appsheet-empty-copy">Add a weapon in Gear & carrying to see its damage and type here.</p>}
      </AppPanel>
      <AppPanel title="Potential damage bonuses" aside={<span className="appsheet-status-word">Level {card.level}</span>}>
        <div className="appsheet-weapon-bonuses">
          {bonuses.map((bonus) => <div key={bonus.label}><span><b>{bonus.label}</b><small>{bonus.detail}</small></span><strong>{bonus.value}</strong></div>)}
        </div>
        <AutoReason reason="Weapon damage and properties come from the handbook Weapons table. Conditional bonuses use this hunter's current class, subclass, level, and selected feats." />
        <Link to="/codex?group=Game%20Card&q=weapons">Open the complete weapons table in Codex</Link>
      </AppPanel>
    </AppDisclosure>
  );
}
