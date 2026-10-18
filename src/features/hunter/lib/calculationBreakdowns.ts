// "How is this calculated?" — step-by-step breakdowns of the sheet's
// calculated values, with the numbers and the rulebook page. They reuse the
// same helpers as the sheet (characterAutomation.ts, lib/character.ts), and a
// test checks every breakdown's total against the value the sheet shows.
import { ABILITIES, abilityModifier, formatModifier } from "@/data/abilities";
import { getClass, isZealot } from "@/data/classes";
import { skillAbility, SHEET_SKILL_FIELD, SKILLS } from "@/data/skills";
import { featsOf, proficiencyBonus, weaponAttackParts, withClassAbilityBonuses, wornArmorWeight } from "@/lib/character";
import { carryCondition, resolveInventory, resolveStorage, totalCarriedWeight, totalWeight } from "@/lib/inventory";
import type { AbilityKey, HunterCard } from "@/types";
import { saveProficiency, skillProficiencyState } from "./characterAutomation";

export interface Breakdown {
  title: string;
  lines: Array<{ label: string; value: string }>;
  total: string;
  /** What the total row is called (default "Total"). */
  totalLabel?: string;
  /** One sentence on the rule, with its page. */
  note?: string;
}

const ABILITY_NAME = Object.fromEntries(ABILITIES.map((ability) => [ability.key, ability.name])) as Record<AbilityKey, string>;
const signed = (value: number) => formatModifier(value);

function abilityScoreBreakdown(stored: HunterCard, card: HunterCard, key: AbilityKey): Breakdown {
  const final = card.abilities[key];
  const savedScore = stored.abilities[key];
  const base = stored.baseAbilities?.[key];
  const lines: Breakdown["lines"] = [];
  if (base != null) {
    lines.push({ label: "Point-buy score", value: String(base) });
    if (savedScore !== base) lines.push({ label: "Background, feats and level-up increases", value: signed(savedScore - base) });
  } else {
    lines.push({ label: "Saved score", value: String(savedScore) });
  }
  if (final !== savedScore) lines.push({ label: "Primal Champion", value: signed(final - savedScore) });
  return { title: `${ABILITY_NAME[key]} score`, lines, total: String(final) };
}

function modifierBreakdown(card: HunterCard, key: AbilityKey): Breakdown {
  const score = card.abilities[key];
  return {
    title: `${ABILITY_NAME[key]} modifier`,
    lines: [{ label: `${ABILITY_NAME[key]} score`, value: String(score) }, { label: "Minus 10, halved, rounded down", value: `(${score} − 10) ÷ 2` }],
    total: signed(abilityModifier(score)),
    note: "Ability modifier = (score − 10) ÷ 2, rounded down ([page 8]).",
  };
}

function saveBreakdown(card: HunterCard, key: AbilityKey): Breakdown {
  const klass = getClass(card.classId);
  const prof = proficiencyBonus(card.level || 1);
  const mod = abilityModifier(card.abilities[key]);
  const { proficient, fromSlipperyMind, fromResilient } = saveProficiency(card, key);
  const source = klass?.savingThrows.includes(key) ? `${klass.title} saving throw` : fromSlipperyMind ? "Slippery Mind" : fromResilient ? "Resilient feat" : "";
  return {
    title: `${ABILITY_NAME[key]} saving throw`,
    lines: [
      { label: `${ABILITY_NAME[key]} modifier`, value: signed(mod) },
      { label: proficient ? `Proficiency Bonus (${source})` : "Not proficient", value: signed(proficient ? prof : 0) },
    ],
    total: signed(mod + (proficient ? prof : 0)),
  };
}

function skillBreakdown(card: HunterCard, skill: string): Breakdown {
  const key = skillAbility(skill);
  const prof = proficiencyBonus(card.level || 1);
  const mod = abilityModifier(card.abilities[key]);
  const { allSkills, expertise, experience } = skillProficiencyState(card);
  const multiplier = expertise.has(skill) ? 2 : allSkills.has(skill) ? 1 : 0;
  const bonus = multiplier ? prof * multiplier : experience;
  const label = multiplier === 2 ? "Expertise (Proficiency Bonus × 2)" : multiplier === 1 ? "Proficiency Bonus" : experience ? "Experience (half Proficiency Bonus)" : "Not proficient";
  return {
    title: skill,
    lines: [{ label: `${ABILITY_NAME[key]} modifier`, value: signed(mod) }, { label, value: signed(bonus) }],
    total: signed(mod + bonus),
  };
}

function hpBreakdown(card: HunterCard): Breakdown | null {
  const klass = getClass(card.classId);
  if (!klass) return null;
  const level = Math.max(1, Math.min(20, card.level || 1));
  const con = abilityModifier(card.abilities.con);
  const feats = new Set(featsOf(card));
  const perLevel = Math.floor(klass.hitDie / 2) + 1 + Math.max(0, con);
  const first = Math.max(1, klass.hitDie + con);
  const lines: Breakdown["lines"] = [{ label: `Level 1: d${klass.hitDie} at its maximum ${klass.hitDie} + Constitution ${signed(con)}`, value: String(first) }];
  if (level > 1) lines.push({ label: `Levels 2–${level}: ${Math.floor(klass.hitDie / 2) + 1}${con > 0 ? ` + Constitution ${signed(con)}` : ""} each × ${level - 1}`, value: signed(perLevel * (level - 1)) });
  if (feats.has("Tough")) lines.push({ label: "Tough: +2 per level", value: signed(level * 2) });
  if (feats.has("Boon of Fortitude")) lines.push({ label: "Boon of Fortitude", value: "+40" });
  const total = first + perLevel * (level - 1) + (feats.has("Tough") ? level * 2 : 0) + (feats.has("Boon of Fortitude") ? 40 : 0);
  return { title: "Maximum Hit Points", lines, total: String(total), note: "Level 1 takes the full Hit Die; each later level adds the class's fixed value, plus Constitution only when positive ([page 46])." };
}

function sanityBreakdown(card: HunterCard): Breakdown | null {
  const klass = getClass(card.classId);
  if (!klass) return null;
  const level = Math.max(1, Math.min(20, card.level || 1));
  const wis = abilityModifier(card.abilities.wis);
  const lines: Breakdown["lines"] = [{ label: `${klass.title} base Sanity`, value: String(klass.maxSanity) }, { label: "Wisdom modifier", value: signed(wis) }];
  let total = klass.maxSanity + wis;
  if (klass.id === "deepcaller") {
    const fracturing = Math.max(0, (isZealot(card) ? 3 : level) - 1);
    lines.push({ label: "Fracturing Mind: +1 per level after the first (max 26)", value: signed(fracturing) });
    total = Math.min(26, total + fracturing);
  }
  return { title: "Maximum Sanity", lines, total: String(Math.max(0, total)) };
}

function proficiencyBreakdown(card: HunterCard): Breakdown {
  const level = Math.max(1, Math.min(20, card.level || 1));
  return {
    title: "Proficiency Bonus",
    lines: [{ label: "Level", value: String(level) }, { label: "Levels 1–4: +2 · 5–8: +3 · 9–12: +4 · 13–16: +5 · 17–20: +6", value: "" }],
    total: signed(proficiencyBonus(level)),
    note: "Set by your level on the class table.",
  };
}

function loadBreakdown(card: HunterCard): Breakdown {
  const str = card.abilities.str;
  const weight = totalCarriedWeight(card);
  const condition = carryCondition(str, weight);
  return {
    title: "Load",
    lines: [
      { label: "Carried weight (inventory, worn armor, worn storage)", value: `${weight} lb` },
      { label: `Featherweight up to Strength ${str} × 2`, value: `${str * 2} lb` },
      { label: `Normal up to × 5`, value: `${str * 5} lb` },
      { label: `Encumbered up to × 10 (−10 ft)`, value: `${str * 10} lb` },
      { label: `Heavily Encumbered up to × 15 (−20 ft)`, value: `${str * 15} lb` },
    ],
    total: condition.label,
    totalLabel: "Your load",
    note: condition.note,
  };
}

function attackBreakdown(card: HunterCard, attack: "Melee" | "Ranged"): Breakdown {
  const ability = attack === "Melee" ? "Strength" : "Dexterity";
  const mod = abilityModifier(attack === "Melee" ? card.abilities.str : card.abilities.dex);
  const prof = proficiencyBonus(card.level || 1);
  return {
    title: `${attack} attack bonus`,
    lines: [{ label: `${ability} modifier`, value: signed(mod) }, { label: "Proficiency Bonus", value: signed(prof) }],
    total: signed(mod + prof),
    note: `${attack} attack bonus = ${ability} modifier + Proficiency Bonus, with a weapon you are proficient with ([page 43]).`,
  };
}

/** A carried weapon's attack bonus, step by step. */
export function weaponBreakdown(card: HunterCard, name: string, facts: { properties: string; attack: "Melee" | "Ranged"; category?: string } | undefined): Breakdown {
  const parts = weaponAttackParts(card, facts);
  return {
    title: `${name} attack bonus`,
    lines: [
      { label: `${parts.ability} modifier`, value: signed(parts.abilityMod) },
      { label: parts.proficient ? "Proficiency Bonus" : "Not proficient with this weapon", value: signed(parts.prof) },
    ],
    total: signed(parts.total),
    note: `${parts.why} Damage adds the same ${parts.ability} modifier.`,
  };
}

/** Breakdown for a calculated sheet field (the automation's field keys). */
export function breakdownFor(stored: HunterCard, key: string): Breakdown | null {
  const card = withClassAbilityBonuses(stored);
  const ability = /^(str|dex|con|int|wis|cha)(Score|Mod|Save)$/.exec(key);
  if (ability) {
    const abilityKey = ability[1] as AbilityKey;
    return ability[2] === "Score" ? abilityScoreBreakdown(stored, card, abilityKey) : ability[2] === "Mod" ? modifierBreakdown(card, abilityKey) : saveBreakdown(card, abilityKey);
  }
  const skill = SKILLS.find((entry) => SHEET_SKILL_FIELD[entry.name] === key);
  if (skill) return skillBreakdown(card, skill.name);
  switch (key) {
    case "hpMax": return hpBreakdown(card);
    case "sanityMax": return sanityBreakdown(card);
    case "profBonus": return proficiencyBreakdown(card);
    case "weightCondition": return loadBreakdown(card);
    case "weight": {
      const worn = new Set([card.mainArmorId, ...(card.addonArmorIds ?? []), ...(card.extraArmorIds ?? [])]);
      const round = (value: number) => Math.round(value * 10) / 10;
      const carried = round(totalWeight(resolveInventory(card).filter(({ item }) => !worn.has(item.id))));
      const armor = round(wornArmorWeight(card));
      const storage = round(resolveStorage(card).reduce((sum, entry) => sum + entry.weightLb, 0));
      return {
        title: "Carried weight",
        lines: [{ label: "Inventory", value: `${carried} lb` }, { label: "Worn armor (incl. studs)", value: `${armor} lb` }, { label: "Worn belts, bandoliers and other storage", value: `${storage} lb` }],
        total: `${totalCarriedWeight(card)} lb`,
        note: "Coins weigh nothing. Weight sets your Load: tap Load to see the limits for your Strength.",
      };
    }
    case "meleeAttack": return attackBreakdown(card, "Melee");
    case "rangedAttack": return attackBreakdown(card, "Ranged");
    case "riteMod":
    case "riteDC":
    case "riteAttack": {
      const klass = getClass(card.classId);
      if (!klass?.caster) return null;
      const mod = abilityModifier(card.abilities.int);
      const prof = proficiencyBonus(card.level || 1);
      const base = [{ label: "Intelligence modifier (Rite Performing Ability)", value: signed(mod) }];
      if (key === "riteMod") return { title: "Rite modifier", lines: base, total: signed(mod) };
      if (key === "riteDC") return { title: "Rite save DC", lines: [{ label: "Base", value: "8" }, ...base, { label: "Proficiency Bonus", value: signed(prof) }], total: String(8 + prof + mod), note: "Rite Save DC = 8 + Rite Performing modifier + Proficiency Bonus ([page 75])." };
      return { title: "Rite attack bonus", lines: [...base, { label: "Proficiency Bonus", value: signed(prof) }], total: signed(prof + mod), note: "Rite Attack = Rite Performing modifier + Proficiency Bonus ([page 75])." };
    }
    case "hdMax": {
      const klass = getClass(card.classId);
      return klass ? { title: "Hit Dice", lines: [{ label: "One Hit Die per level", value: String(card.level) }, { label: "Die type", value: `d${klass.hitDie}` }], total: `${card.level} × d${klass.hitDie}`, note: `Each die you spend: roll d${klass.hitDie} ${signed(abilityModifier(card.abilities.con))} (Constitution). Spend up to your Proficiency Bonus per Short Rest, in a Safe Zone ([page 43]).` } : null;
    }
    default: return null;
  }
}
