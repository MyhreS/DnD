import { getClass } from "@/data/classes";
import { abilityModifier } from "@/data/abilities";
import {
  armorClassFor,
  initiativeMod,
  maxHp,
  maxSanity,
  proficiencyBonus,
} from "@/lib/character";
import type { AbilityKey, HunterCard, SheetData } from "@/types";

const ABILITY_KEYS: AbilityKey[] = ["str", "dex", "con", "int", "wis", "cha"];

/** "+2" / "0" / "-1" — how the paper sheet writes modifiers. */
const fmtMod = (n: number): string => (n > 0 ? `+${n}` : String(n));

/**
 * Derive an initial paper-sheet view from a card's STRUCTURED fields — for
 * hunters that predate the sheet (legacy builder cards, test-run bot cards),
 * which have no `card.sheet` at all. Without this they render a completely
 * blank sheet. Fills what the structured data knows (identity, abilities,
 * saves, vitals, AC, speed…) and leaves the rest empty — the goal is a
 * meaningful sheet, not a complete one. Pure; empty-string/false values are
 * omitted so the derived map only carries real content.
 */
export function deriveSheetFromCard(card: HunterCard): SheetData {
  const klass = getClass(card.classId);
  const level = Math.max(1, Math.min(20, card.level || 1));
  const prof = proficiencyBonus(level);
  const sheet: SheetData = {};
  const put = (k: string, v: string | boolean | undefined) => {
    if (v === undefined || v === "" || v === false) return;
    sheet[k] = v;
  };

  // Identity (these three back the card-level mirror — never blank when the
  // card itself has them).
  put("name", card.name);
  put("background", card.background);
  put("class", klass?.name);
  put("subclass", klass?.subclasses.find((s) => s.id === card.subclassId)?.name);
  put("level", String(level));
  put("insight", String(card.insight ?? 0));
  put("profBonus", fmtMod(prof));

  // Abilities, modifiers and saving throws (class saves get proficiency).
  for (const k of ABILITY_KEYS) {
    const score = card.abilities?.[k];
    if (typeof score !== "number" || !Number.isFinite(score)) continue;
    const mod = abilityModifier(score);
    put(`${k}Score`, String(score));
    put(`${k}Mod`, fmtMod(mod));
    const proficient = klass?.savingThrows.includes(k) ?? false;
    put(`${k}Save`, fmtMod(proficient ? mod + prof : mod));
    put(`${k}SaveP`, proficient);
  }

  // Vitals — the class + abilities give HP/Sanity maxima; the card's trackers
  // give current values (fall back to full when the card never tracked them).
  if (klass && card.abilities) {
    const hp = maxHp(klass, card.abilities, level);
    put("hpMax", String(hp));
    put("hpCur", String(card.currentHp ?? hp));
    const sanity = maxSanity(klass, card.abilities, level);
    put("sanityMax", String(sanity));
    put("sanityCur", String(card.sanity ?? sanity));
    put("sanityDice", klass.sanityDie);
    put("hdMax", String(level));
    put("hdCur", String(level));
    if (klass.caster) {
      const progression = klass.progression.find((row) => row.level === level);
      const strainMax = Number(progression?.extras.Strains ?? 0);
      put("strainMax", String(strainMax));
      put("strainCur", String(strainMax));
      put("strainLevel", progression?.extras["Strain Level"]);
    }
    put("speed", `${klass.speedFt} ft`);
  }

  if (card.abilities) {
    put("initiative", fmtMod(initiativeMod(card.abilities)));
    const passive =
      10 +
      abilityModifier(card.abilities.wis) +
      (card.skillProficiencies?.includes("Perception") ? prof : 0);
    put("passivePerception", String(passive));

    const ac = armorClassFor(card);
    put("ac", String(ac.total));
    put("armorCategory", ac.category);
  }

  if (typeof card.transformationLevel === "number" && card.transformationLevel > 0) {
    put("transformation", String(card.transformationLevel));
  }
  put("bloodTinge", card.bloodTinge === true);
  put("coins", String(card.coins ?? 0));
  put("feats", (card.feats ?? []).join(", "));

  return sheet;
}
