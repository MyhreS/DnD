import { abilityModifier } from "@/data/abilities";
import type { HunterCard, HunterClass } from "@/types";
import { AppPanel, AutoReason } from "./appSheetShared";

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
      detail: `Melee weapons normally use Strength (${signed(abilityModifier(card.abilities.str))}); Finesse weapons may instead use Dexterity (${signed(abilityModifier(card.abilities.dex))}), which ranged weapons use.`,
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

export function AppWeaponDamageBonuses({ card, klass, contextLabel = "Class & feats", reason = "Conditional damage bonuses use this hunter's class, subclass, progression, and selected feats." }: {
  card: HunterCard;
  klass: HunterClass | undefined;
  contextLabel?: string;
  reason?: string;
}) {
  if (!klass) return null;
  const bonuses = bonusesFor(card, klass);
  return <AppPanel title="Potential damage bonuses" aside={<span className="appsheet-status-word">{contextLabel}</span>}>
    <div className="appsheet-weapon-bonuses">{bonuses.map((bonus) => <div key={bonus.label}><span><b>{bonus.label}</b><small>{bonus.detail}</small></span><strong>{bonus.value}</strong></div>)}</div>
    <AutoReason reason={reason} />
  </AppPanel>;
}
