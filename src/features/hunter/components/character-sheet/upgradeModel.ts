import type { AbilityKey, HunterCard, HunterClass } from "@/types";
import { armorClassFor } from "@/lib/character";
import { levelForInsight } from "@/lib/insight";
import { EPIC_BOON_FEATS, FIGHTING_STYLE_FEATS, GENERAL_FEATS, type FeatOption } from "@/data/feats";
import { forbiddenRevelationLevel, forbiddenRevelationOptions, MANEUVERS, MANEUVER_KEY, MANEUVER_LEVELS } from "@/data/characterOptions";
import type { SheetAutomationState } from "@/types";

export type UpgradeFeature = {
  key: string;
  level: number;
  name: string;
  text: string;
  choice: boolean;
};

const RECORDED_CHOICE = /^(ability score improvement|epic boon|fighting style|additional fighting style|forbidden revelation)/i;

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
    const progression = klass.progression.find((entry) => entry.level === level);
    const names = progression?.features && progression.features !== "\u2014"
      ? progression.features.split(",").map((entry) => entry.trim()).filter(Boolean)
      : [];
    for (const name of names) {
      const normalized = baseName(name).toLowerCase();
      const detail = [...(klass.features ?? []), ...(subclass?.features ?? [])]
        .find((entry) => entry.level === level && (
          entry.name.toLowerCase() === normalized
          || normalized.startsWith(entry.name.toLowerCase())
          || entry.name.toLowerCase().startsWith(normalized)
        ));
      rows.push({
        key: `${level}:${name}`,
        level,
        name,
        text: detail?.text ?? "This feature is added to your class progression when the upgrade is saved.",
        choice: RECORDED_CHOICE.test(name),
      });
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
      if (!(klass?.armorTraining ?? []).some((entry) => entry.toLowerCase() === `${armor[1].toLowerCase()} armor`)) return false;
      continue;
    }
    if (/^Shield Arm$/i.test(clause) && !armorClassFor(card).shieldArm) return false;
  }
  return true;
}

export function featOptionsFor(feature: UpgradeFeature, card?: HunterCard, klass?: HunterClass, keepName?: string): FeatOption[] {
  const all = /^ability score improvement/i.test(feature.name)
    ? GENERAL_FEATS
    : /epic boon/i.test(feature.name)
      ? [...EPIC_BOON_FEATS, ...GENERAL_FEATS]
      : /fighting style/i.test(feature.name)
        ? FIGHTING_STYLE_FEATS
        : [];
  if (!card) return all;
  // A feat this hunter already holds always stays selectable — the DM's earlier
  // ruling stands and is never retroactively stripped.
  return all.filter((feat) => feat.name === keepName || meetsPrerequisite(feat, card, klass));
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
  if (selected.abilityPoints === 0) return true;
  const bonuses = state.levelAbilityBonuses?.[feature.key] ?? {};
  return Object.values(bonuses).reduce((sum, value) => sum + (value ?? 0), 0) === selected.abilityPoints;
}
