import type { HunterCard, HunterClass } from "@/types";
import { levelForInsight } from "@/lib/insight";
import { EPIC_BOON_FEATS, FIGHTING_STYLE_FEATS, GENERAL_FEATS, type FeatOption } from "@/data/feats";
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

export function featOptionsFor(feature: UpgradeFeature): FeatOption[] {
  if (/^ability score improvement/i.test(feature.name)) return GENERAL_FEATS;
  if (/epic boon/i.test(feature.name)) return [...EPIC_BOON_FEATS, ...GENERAL_FEATS];
  if (/fighting style/i.test(feature.name)) return FIGHTING_STYLE_FEATS;
  return [];
}

export function upgradeFeatureComplete(feature: UpgradeFeature, state: SheetAutomationState): boolean {
  if (!feature.choice) return true;
  const options = featOptionsFor(feature);
  if (options.length === 0) return !!state.levelChoices?.[feature.key]?.trim();
  const selected = options.find((feat) => feat.name === state.levelFeats?.[feature.key]);
  if (!selected) return false;
  if (selected.abilityPoints === 0) return true;
  const bonuses = state.levelAbilityBonuses?.[feature.key] ?? {};
  return Object.values(bonuses).reduce((sum, value) => sum + (value ?? 0), 0) === selected.abilityPoints;
}
