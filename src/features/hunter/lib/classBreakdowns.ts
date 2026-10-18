// "How is this calculated?" for the values a Hunter's class sets: Hit Die,
// Sanity Die, Strains, the Rite Performing ability, level, class resource uses
// and weapon damage. Same shape and pages as calculationBreakdowns.ts.
import { abilityModifier, formatModifier } from "@/data/abilities";
import { getClass, isZealot } from "@/data/classes";
import type { WeaponFacts } from "@/data/weapons";
import { proficiencyBonus, weaponAttackParts } from "@/lib/character";
import { INSIGHT_BY_LEVEL, levelForInsight } from "@/lib/insight";
import type { HunterCard } from "@/types";
import type { Breakdown } from "./calculationBreakdowns";
import { classResources } from "./characterAutomation";

/** Page of each class's "Core Hunter … Traits" table in core-rulebook.txt. */
const CLASS_TRAITS_PAGE: Record<string, number> = { brute: 49, scout: 56, stalker: 63, deepcaller: 69, bloodbound: 80, warden: 87 };

const levelOf = (card: HunterCard) => Math.max(1, Math.min(20, card.level || 1));

function hitDieBreakdown(card: HunterCard): Breakdown | null {
  const klass = getClass(card.classId);
  if (!klass) return null;
  const con = abilityModifier(card.abilities.con);
  return {
    title: "Hit Die",
    lines: [
      { label: `${klass.title} class (Core Traits, [page ${CLASS_TRAITS_PAGE[klass.id] ?? 43}])`, value: `D${klass.hitDie} per level` },
      { label: "Hit Dice you have: one per level", value: String(levelOf(card)) },
      { label: "Each die heals: the roll + Constitution", value: `1d${klass.hitDie} ${formatModifier(con)}` },
    ],
    total: `d${klass.hitDie}`,
    totalLabel: "Your Hit Die",
    note: `Your class sets the die. On a Short Rest in a Safe Zone, spend up to your Proficiency Bonus (${proficiencyBonus(levelOf(card))}) of them; a Long Rest in a Safe Zone gives them all back ([page 43]).`,
  };
}

function sanityDieBreakdown(card: HunterCard): Breakdown | null {
  const klass = getClass(card.classId);
  if (!klass) return null;
  const wis = abilityModifier(card.abilities.wis);
  return {
    title: "Sanity Die",
    lines: [
      { label: `${klass.title} class (Core Traits, [page ${CLASS_TRAITS_PAGE[klass.id] ?? 43}])`, value: klass.sanityDie },
      { label: "Long Rest: roll it and add Wisdom", value: `${klass.sanityDie} ${formatModifier(wis)}` },
    ],
    total: klass.sanityDie,
    totalLabel: "Your Sanity Die",
    note: "You always have one Sanity Die. Roll it once when you finish a Long Rest, add your Wisdom modifier and reduce your Madness by the total, to a minimum of 0 ([page 43]).",
  };
}

function strainBreakdown(card: HunterCard, key: "strainMax" | "strainLevel"): Breakdown | null {
  const klass = getClass(card.classId);
  if (!klass?.caster) return null;
  const level = levelOf(card);
  const row = klass.progression.find((entry) => entry.level === level);
  const value = String(row?.extras[key === "strainMax" ? "Strains" : "Strain Level"] ?? "—");
  return {
    title: key === "strainMax" ? "Strains" : "Strain level",
    lines: [{ label: "Your level", value: String(level) }, { label: `${klass.title} Features table, ${key === "strainMax" ? "Strains" : "Strain Level"} column`, value }],
    total: value,
    note: key === "strainMax"
      ? "The class table sets how many Strains you have for your Rites. You regain all spent Strains on a Short or Long Rest ([page 69])."
      : "All your Strains are this level. A Rite performed with one counts as a Rite of this level ([page 69]).",
  };
}

function riteAbilityBreakdown(card: HunterCard): Breakdown | null {
  const klass = getClass(card.classId);
  if (!klass?.caster) return null;
  return {
    title: "Rite Performing ability",
    lines: [{ label: isZealot(card) ? "Hunter Zealot (keeps the Deepcaller's)" : klass.title, value: "Intelligence" }, { label: "Intelligence modifier", value: formatModifier(abilityModifier(card.abilities.int)) }],
    total: "Intelligence",
    note: "Your class decides it: Intelligence is the Deepcaller's Rite Performing Ability ([page 70]). It sets your Rite modifier, save DC and attack bonus.",
  };
}

function levelBreakdown(card: HunterCard): Breakdown {
  const insight = card.insight ?? 0;
  const level = levelOf(card);
  const earned = levelForInsight(insight);
  const next = INSIGHT_BY_LEVEL[level + 1];
  const lines: Breakdown["lines"] = [{ label: "Your total Insight", value: String(insight) }, { label: `Level ${level} needs`, value: `${INSIGHT_BY_LEVEL[level]} Insight` }];
  if (next != null) lines.push({ label: `Level ${level + 1} needs`, value: `${next} Insight` });
  return {
    title: "Level",
    lines,
    total: String(level),
    note: earned > level
      ? `Your Insight already reaches level ${earned}. You take it after a Long Rest, through Upgrade character ([page 46]).`
      : "Your level is the highest one your total Insight reaches on the Character Advancement table, taken after a Long Rest ([page 46]).",
  };
}

function resourceBreakdown(card: HunterCard, key: string): Breakdown | null {
  const resource = classResources(card).find((entry) => entry.key === key);
  if (!resource) return null;
  return { title: resource.label, lines: resource.lines, total: String(resource.max), totalLabel: "Uses", note: resource.note };
}

/** A carried weapon's damage: the table die plus the attack's ability modifier. */
export function weaponDamageBreakdown(card: HunterCard, name: string, facts: WeaponFacts | undefined): Breakdown | null {
  if (!facts) return null;
  const parts = weaponAttackParts(card, facts);
  const versatile = /Versatile \((\w+)\)/.exec(facts.properties)?.[1];
  const lines: Breakdown["lines"] = [
    { label: `${facts.category} ${facts.attack} weapon, weapons table ([page 111])`, value: `${facts.damage} ${facts.damageType}` },
    { label: `${parts.ability} modifier (the same as the attack)`, value: formatModifier(parts.abilityMod) },
  ];
  if (versatile) lines.push({ label: "Versatile: held in two hands", value: `${versatile} instead` });
  return {
    title: `${name} damage`,
    lines,
    total: `${facts.damage} ${formatModifier(parts.abilityMod)}`,
    totalLabel: "Roll",
    note: "You add the same ability modifier you use for the attack to the damage roll ([page 43]). Class extras, such as Hunter's Mark, are listed under Damage bonuses.",
  };
}

/** Breakdowns for the class-set keys; null when the key isn't one of them. */
export function classBreakdownFor(card: HunterCard, key: string): Breakdown | null | undefined {
  if (key.startsWith("resource:")) return resourceBreakdown(card, key.slice("resource:".length));
  switch (key) {
    case "hitDie": return hitDieBreakdown(card);
    case "sanityDice": return sanityDieBreakdown(card);
    case "strainMax":
    case "strainLevel": return strainBreakdown(card, key);
    case "riteAbility": return riteAbilityBreakdown(card);
    case "level": return levelBreakdown(card);
    default: return undefined;
  }
}
