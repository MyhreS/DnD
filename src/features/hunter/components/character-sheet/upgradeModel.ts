import type { AbilityKey, HunterCard, HunterClass } from "@/types";
import { armorClassFor, featsOf } from "@/lib/character";
import { getClass, levelFeatureDetails, levelFeatureNames } from "@/data/classes";
import { TRANSFORMATION_EFFECT_BY_ID } from "@/data/transformations";
import { levelForInsight } from "@/lib/insight";
import { FEAT_SKILL_PICKS, FEATS, FIGHTING_STYLE_FEATS, featPickKey, type FeatOption } from "@/data/feats";
import { forbiddenRevelationLevel, forbiddenRevelationOptions, MANEUVERS, MANEUVER_KEY, MANEUVER_LEVELS } from "@/data/characterOptions";
import type { SheetAutomationState } from "@/types";

export type UpgradeFeature = {
  key: string;
  level: number;
  name: string;
  text: string;
  choice: boolean;
};

const RECORDED_CHOICE = /^(ability score improvement|epic boon|fighting style|additional fighting style|forbidden revelation|student of war|hunter's prey|one form)/i;

/** Path features that ask the player to pick something, rather than only
 * describing a benefit. */
const SUBCLASS_CHOICE_FEATURES = new Set(["Student of War", "Hunter's Prey", "One Form"]);

function baseName(name: string): string {
  return name.replace(/\s*\([^)]*\)\s*$/, "").trim();
}

export function earnedLevel(card: HunterCard): number {
  return Math.max(card.level, levelForInsight(card.insight ?? 0));
}

export function upgradeFeatures(klass: HunterClass | undefined, subclassId: string | null | undefined, fromLevel: number, toLevel: number): UpgradeFeature[] {
  if (!klass || toLevel <= fromLevel) return [];
  const subclass = klass.subclasses.find((entry) => entry.id === subclassId);
  const rows: UpgradeFeature[] = [];
  for (let level = fromLevel + 1; level <= toLevel; level += 1) {
    const names = levelFeatureNames(klass, subclass, level);
    for (const name of names) {
      const normalized = baseName(name).toLowerCase();
      const matches = (entry: { name: string }) => (
        entry.name.toLowerCase() === normalized
        || normalized.startsWith(entry.name.toLowerCase())
        || entry.name.toLowerCase().startsWith(normalized)
      );
      // A feature gained again (Ability Score Improvement at 8/12/16, Warden
      // Indomitable at 13/17) is described once, at its first level.
      const detail = levelFeatureDetails(klass, subclass, level).find(matches)
        ?? [...(klass.features ?? []), ...(subclass?.features ?? [])]
          .filter((entry) => entry.level < level && matches(entry))
          .sort((a, b) => b.level - a.level)[0];
      rows.push({
        key: `${level}:${name}`,
        level,
        name,
        text: detail?.text ?? "This feature is added to your class progression when the upgrade is saved.",
        choice: RECORDED_CHOICE.test(name),
      });
    }
    // Path features that need a pick join the flow as their own rows. A path
    // that replaces the progression already lists them above.
    if (subclass && !(subclass.replacesProgression && level >= 3)) {
      for (const feature of subclass.features.filter((entry) => entry.level === level && SUBCLASS_CHOICE_FEATURES.has(entry.name))) {
        rows.push({ key: `${level}:${feature.name}`, level, name: feature.name, text: feature.text, choice: true });
      }
    }
    // Combat Superiority is the one class rule that asks for several picks at
    // one level, so each pick gets its own row and reuses the ordinary
    // single-choice control rather than needing a multi-select of its own.
    if (subclass?.id === "battle-master") {
      const slot = MANEUVER_LEVELS.find((entry) => entry.level === level);
      if (slot) {
        const before = MANEUVER_LEVELS.filter((entry) => entry.level < level).reduce((sum, entry) => sum + entry.count, 0);
        for (let index = 1; index <= slot.count; index += 1) {
          rows.push({
            key: `${level}:${MANEUVER_KEY}:${before + index}`,
            level,
            name: `Maneuver ${before + index}`,
            text: "Choose a maneuver from the subclass's Maneuver Options. You can use only one maneuver per attack, and each time you learn new maneuvers you may replace one you already know.",
            choice: true,
          });
        }
      }
    }
    for (const feature of subclass?.features.filter((entry) => entry.level === level) ?? []) {
      if (rows.some((entry) => entry.level === level && entry.name === feature.name)) continue;
      rows.push({
        key: `${level}:subclass:${feature.name}`,
        level,
        name: feature.name,
        text: feature.text,
        choice: RECORDED_CHOICE.test(feature.name),
      });
    }
  }
  return rows;
}

const ABILITY_BY_NAME: Record<string, AbilityKey> = {
  strength: "str", dexterity: "dex", constitution: "con",
  intelligence: "int", wisdom: "wis", charisma: "cha",
};

/** core-rulebook.txt [page 96]: "To take a feat, you must meet any prerequisite
 * in its description." Only the mechanically parseable clauses are enforced —
 * a clause this does not recognise never hides a feat. */
function meetsPrerequisite(feat: FeatOption, card: HunterCard, klass: HunterClass | undefined): boolean {
  for (const raw of feat.prerequisite.split(",")) {
    const clause = raw.trim();
    if (!clause) continue;
    const level = clause.match(/^Level\s+(\d+)\+$/i);
    if (level) {
      if (earnedLevel(card) < Number(level[1])) return false;
      continue;
    }
    const ability = clause.match(/^([A-Za-z]+)(?:\s+or\s+([A-Za-z]+))?\s+(\d+)\+$/i);
    if (ability) {
      const keys = [ability[1], ability[2]].filter(Boolean).map((name) => ABILITY_BY_NAME[name!.toLowerCase()]);
      if (keys.length && keys.every(Boolean) && !keys.some((key) => card.abilities[key!] >= Number(ability[3]))) return false;
      continue;
    }
    const armor = clause.match(/^(Light|Medium|Heavy)\s+Armor\s+Training$/i);
    if (armor) {
      const fromFeat = (armor[1].toLowerCase() === "heavy" && featsOf(card).includes("Heavily Armored"))
        || (armor[1].toLowerCase() === "medium" && featsOf(card).includes("Moderately Armored"));
      if (!fromFeat && !(klass?.armorTraining ?? []).some((entry) => entry.toLowerCase() === `${armor[1].toLowerCase()} armor`)) return false;
      continue;
    }
    if (/^Shield Arm$/i.test(clause) && !armorClassFor(card).shieldArm) return false;
  }
  return true;
}

/** core-rulebook.txt [page 96]: "A feat can be taken only once unless its
 * description states otherwise in a Repeatable subsection." */
const REPEATABLE_FEATS = new Set(["Ability Score Improvement", "Skilled"]);

export function featOptionsFor(feature: UpgradeFeature, card?: HunterCard, klass?: HunterClass, keepName?: string): FeatOption[] {
  // Ability Score Improvement and Epic Boon read "the Ability Score
  // Improvement feat ... or another feat of your choice for which you
  // qualify" ([pages 50, 57]), and with no category named any category is
  // allowed ([page 96]) — Origin and General included. Fighting Style feats
  // need the Fighting Style feature ([pages 103–104]), so they join only for
  // a class that has gained it by this level.
  const hasFightingStyle = !!klass?.progression.some((row) => row.level <= feature.level && /fighting style/i.test(row.features));
  const all = /^(ability score improvement|epic boon)/i.test(feature.name)
    ? FEATS.filter((feat) => feat.category !== "Fighting Style" || hasFightingStyle)
    : /fighting style/i.test(feature.name)
      ? FIGHTING_STYLE_FEATS
      : [];
  if (!card) return all;
  const held = new Set(featsOf(card));
  // A feat this hunter already holds in this slot always stays selectable —
  // the DM's earlier ruling stands and is never retroactively stripped.
  return all.filter((feat) => feat.name === keepName || (
    (REPEATABLE_FEATS.has(feat.name) || !held.has(feat.name))
    && meetsPrerequisite(feat, card, klass)
  ));
}

export type RecordedChoiceOption = { value: string; label: string; detail: string };

/** Label for the finite-option picker, so one control serves both rules. */
export function recordedChoiceLabel(feature: UpgradeFeature): string {
  return isManeuverSlot(feature) ? "Choose maneuver" : "Choose Forbidden Revelation";
}

/** Hint shown until a finite-option choice is recorded. */
export function recordedChoiceHint(feature: UpgradeFeature): string {
  return isManeuverSlot(feature)
    ? "Choose one of the subclass's Maneuver Options. A maneuver already chosen in another slot is not offered again."
    : "Choose a Rite of this Revelation's level, or an eligible lower-level Rite performed with its printed Higher-Level Strain option.";
}

function isManeuverSlot(feature: UpgradeFeature): boolean {
  return feature.key.includes(`:${MANEUVER_KEY}:`);
}

export function recordedOptionsFor(feature: UpgradeFeature, state?: SheetAutomationState): RecordedChoiceOption[] {
  if (isManeuverSlot(feature)) {
    // A maneuver already recorded in another slot is not offered again; the
    // slot's own current value always stays selectable.
    const taken = new Set(
      Object.entries(state?.levelChoices ?? {})
        .filter(([key]) => key !== feature.key && key.includes(`:${MANEUVER_KEY}:`))
        .map(([, value]) => value),
    );
    const current = state?.levelChoices?.[feature.key];
    return MANEUVERS
      .filter((entry) => !taken.has(entry.name) || entry.name === current)
      .map((entry) => ({ value: entry.name, label: entry.name, detail: entry.text }));
  }
  // Student of War [page 52]: one more skill from the Brute's level-1 list.
  if (/^student of war$/i.test(feature.name)) {
    const brute = getClass("brute");
    return (brute?.skillChoices.options ?? []).map((skill) => ({ value: skill, label: skill, detail: "Gain proficiency in this skill." }));
  }
  // Hunter's Prey [page 60]: Colossus Slayer or Horde Breaker (swappable on a rest).
  if (/^hunter's prey$/i.test(feature.name)) {
    return [
      { value: "Colossus Slayer", label: "Colossus Slayer", detail: "Extra 1d8 damage to a creature below its Hit Point maximum, once per turn." },
      { value: "Horde Breaker", label: "Horde Breaker", detail: "An extra attack against a different creature within 5 feet of the first, once per turn." },
    ];
  }
  // One Form [page 85]: one permanent transformation, never the Lost one.
  if (/^one form$/i.test(feature.name)) {
    return Object.values(TRANSFORMATION_EFFECT_BY_ID).filter((effect) => effect.id !== "lost").map((effect) => ({ value: effect.name, label: effect.name, detail: effect.text }));
  }
  const revelationLevel = forbiddenRevelationLevel(feature.name);
  if (revelationLevel == null) return [];
  return forbiddenRevelationOptions(revelationLevel).map((rite) => ({
    value: rite.name,
    label: rite.level === revelationLevel ? rite.name : `${rite.name} at Level ${revelationLevel}`,
    detail: rite.level === revelationLevel
      ? `Level ${revelationLevel} ${rite.school}`
      : `Level ${rite.level} ${rite.school} using its printed Higher-Level Strain option`,
  }));
}

export function upgradeFeatureComplete(feature: UpgradeFeature, state: SheetAutomationState): boolean {
  if (!feature.choice) return true;
  const options = featOptionsFor(feature);
  if (options.length === 0) {
    const recorded = state.levelChoices?.[feature.key]?.trim();
    const finiteOptions = recordedOptionsFor(feature, state);
    return finiteOptions.length > 0
      ? finiteOptions.some((option) => option.value === recorded)
      : !!recorded;
  }
  const selected = options.find((feat) => feat.name === state.levelFeats?.[feature.key]);
  if (!selected) return false;
  if ((FEAT_SKILL_PICKS[selected.name] ?? []).some((pick) => !state.levelChoices?.[featPickKey(feature.key, pick.slot)])) return false;
  if (selected.abilityPoints === 0) return true;
  const bonuses = state.levelAbilityBonuses?.[feature.key] ?? {};
  return Object.values(bonuses).reduce((sum, value) => sum + (value ?? 0), 0) === selected.abilityPoints;
}
