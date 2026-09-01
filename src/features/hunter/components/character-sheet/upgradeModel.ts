import type { AbilityKey, HunterCard, HunterClass } from "@/types";
import { armorClassFor } from "@/lib/character";
import { levelForInsight } from "@/lib/insight";
import { EPIC_BOON_FEATS, FIGHTING_STYLE_FEATS, GENERAL_FEATS, type FeatOption } from "@/data/feats";
import { forbiddenRevelationLevel, forbiddenRevelationOptions } from "@/data/characterOptions";
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

export function recordedOptionsFor(feature: UpgradeFeature): RecordedChoiceOption[] {
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
    const finiteOptions = recordedOptionsFor(feature);
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
