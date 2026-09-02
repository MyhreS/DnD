import { ARMOR } from "@/data/armor";
import { BACKGROUNDS } from "@/data/backgrounds";
import { CLASSES, getClass } from "@/data/classes";
import { ITEMS } from "@/data/items";
import { SHEET_SKILL_FIELD, SKILLS } from "@/data/skills";
import { ABILITY_KEYS } from "@/lib/ability-keys";
import type { ArmorPiece, HunterCard, InventoryEntry, SheetData } from "@/types";
import { automationFor, calculatedSheetFields, matchCatalogItem, structuredCardFromSheet } from "./characterAutomation";

export interface MigrationDecision {
  field: string;
  source: string;
  targetId: string;
  targetName: string;
  confidence: number;
}

export interface LegacyMigrationResult {
  patch: Partial<HunterCard> & { sheet: SheetData };
  decisions: MigrationDecision[];
  manualOverrides: string[];
}

const MAPPED_SOURCE_FIELDS = new Set([
  "name", "class", "subclass", "level", "background",
  ...ABILITY_KEYS.map((key) => `${key}Score`),
  ...SKILLS.flatMap((skill) => [`${SHEET_SKILL_FIELD[skill.name]}P`, SHEET_SKILL_FIELD[skill.name]]),
  ...Array.from({ length: 20 }, (_, row) => [`eq_${row}_0`, `eq_${row}_1`, `eq_${row}_2`, `eq_${row}_3`]).flat(),
  "mainArmor", "headGear", "scarf", "gloves", "boots",
  ...Array.from({ length: 6 }, (_, index) => [`addon${index + 1}`, `studs${index + 1}`]).flat(),
]);

function normalize(value: unknown): string {
  return String(value ?? "")
    .normalize("NFKD")
    .replace(/[’']/g, "")
    .replace(/\bhunter\b/gi, "")
    .replace(/[^a-z0-9]+/gi, " ")
    .trim()
    .toLowerCase();
}

function levenshtein(a: string, b: string): number {
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  let previous = Array.from({ length: b.length + 1 }, (_, index) => index);
  for (let i = 1; i <= a.length; i += 1) {
    const current = [i];
    for (let j = 1; j <= b.length; j += 1) {
      current[j] = Math.min(
        current[j - 1] + 1,
        previous[j] + 1,
        previous[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
    }
    previous = current;
  }
  return previous[b.length];
}

function score(source: string, target: string): number {
  const a = normalize(source);
  const b = normalize(target);
  if (!a || !b) return 0;
  if (a === b) return 1;
  if (a.includes(b) || b.includes(a)) return 0.94;
  const edit = 1 - levenshtein(a, b) / Math.max(a.length, b.length);
  const aTokens = new Set(a.split(" "));
  const bTokens = new Set(b.split(" "));
  const common = [...aTokens].filter((token) => bTokens.has(token)).length;
  const union = new Set([...aTokens, ...bTokens]).size;
  return Math.max(0, Math.min(0.93, edit * 0.7 + (union ? common / union : 0) * 0.3));
}

function best<T extends { id: string; name: string }>(source: unknown, options: T[], fallback: T): { value: T; confidence: number } {
  const ranked = options
    .map((value) => ({ value, confidence: score(String(source ?? ""), value.name) }))
    .sort((a, b) => b.confidence - a.confidence || a.value.name.localeCompare(b.value.name));
  return ranked[0]?.confidence ? ranked[0] : { value: fallback, confidence: 0 };
}

function hasValue(value: string | boolean | undefined): boolean {
  return value === true || (typeof value === "string" && value.trim() !== "");
}

function numberField(sheet: SheetData, key: string, fallback: number): number {
  const parsed = Number.parseInt(String(sheet[key] ?? ""), 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function equipmentQuantity(value: string): number {
  const suffix = /\(\s*(\d+)\s*(?:-\s*(\d+)\s*)?\)\s*$/.exec(value);
  if (suffix) return Math.max(0, Number(suffix[1]) - Number(suffix[2] ?? 0));
  const match = /^\s*(\d+)\s*(?:[x×]|\s)\s*/i.exec(value);
  return match ? Math.max(0, Number(match[1])) : 1;
}

function recordDecision(decisions: MigrationDecision[], field: string, source: unknown, target: { id: string; name: string }, confidence: number) {
  decisions.push({ field, source: String(source ?? ""), targetId: target.id, targetName: target.name, confidence: Math.round(confidence * 100) / 100 });
}

function armorMatch(sheet: SheetData, field: string, options: ArmorPiece[], decisions: MigrationDecision[]): string | undefined {
  const source = sheet[field];
  if (!hasValue(source)) return undefined;
  if (/^(?:no|none|n\/a|unarmou?red)$/i.test(String(source).trim())) return undefined;
  const catalogItem = ITEMS.find((item) => item.id === matchCatalogItem(String(source)));
  if (catalogItem && catalogItem.category !== "Armor") return undefined;
  const match = best(source, options, options[0]);
  if (match.confidence < 0.45) return undefined;
  recordDecision(decisions, field, source, match.value, match.confidence);
  return match.value.id;
}

function mergeInventory(existing: InventoryEntry[], migrated: InventoryEntry[]): InventoryEntry[] {
  const quantities = new Map(existing.map((entry) => [entry.itemId, entry.qty]));
  for (const entry of migrated) quantities.set(entry.itemId, Math.max(quantities.get(entry.itemId) ?? 0, entry.qty));
  return [...quantities].map(([itemId, qty]) => ({ itemId, qty }));
}

/** Convert one legacy paper sheet without player interaction. Every fuzzy match
 * is recorded, and the complete original equipment text is retained as audit
 * metadata even though the closest catalog items become the live inventory. */
export function migrateLegacyCharacter(card: HunterCard, migratedAt: number): LegacyMigrationResult {
  const sheet = card.sheet ?? {};
  const decisions: MigrationDecision[] = [];
  const inferred = structuredCardFromSheet({
    ...card,
    abilities: card.abilities ?? { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
    skillProficiencies: card.skillProficiencies ?? [],
    inventory: card.inventory ?? [],
  });

  const classSource = sheet.class || card.classId;
  const currentClass = getClass(inferred.card.classId);
  const classMatch = currentClass
    ? { value: currentClass, confidence: score(String(classSource), currentClass.name) || 1 }
    : best(classSource, CLASSES, CLASSES.find((entry) => entry.id === "warden") ?? CLASSES[0]);
  recordDecision(decisions, "class", classSource, classMatch.value, classMatch.confidence);

  const backgroundSource = sheet.background || card.background || card.backgroundId || classMatch.value.name;
  const exactBackground = BACKGROUNDS.find((entry) => entry.id === card.backgroundId);
  const backgroundMatch = exactBackground
    ? { value: exactBackground, confidence: score(String(backgroundSource), exactBackground.name) || 1 }
    : best(backgroundSource, BACKGROUNDS, BACKGROUNDS.find((entry) => entry.id === "drifter") ?? BACKGROUNDS[0]);
  recordDecision(decisions, "background", backgroundSource, backgroundMatch.value, backgroundMatch.confidence);

  const level = Math.max(1, Math.min(20, numberField(sheet, "level", card.level || 1)));
  const abilities = { ...inferred.card.abilities };
  const baseAbilities = { ...abilities };

  const checkedSkills = SKILLS.filter((skill) => sheet[`${SHEET_SKILL_FIELD[skill.name]}P`] === true).map((skill) => skill.name);
  const classSkills = checkedSkills.filter((skill) => classMatch.value.skillChoices.options.includes(skill)).slice(0, classMatch.value.skillChoices.count);
  for (const option of classMatch.value.skillChoices.options) {
    if (classSkills.length >= classMatch.value.skillChoices.count) break;
    if (!classSkills.includes(option) && !backgroundMatch.value.skills.includes(option)) classSkills.push(option);
  }
  const skillProficiencies = [...new Set([...(card.skillProficiencies ?? []), ...checkedSkills, ...classSkills, ...backgroundMatch.value.skills])];

  let subclassId = card.subclassId;
  if (level >= 3 && classMatch.value.subclasses.length) {
    const source = sheet.subclass || subclassId;
    const existing = classMatch.value.subclasses.find((entry) => entry.id === subclassId);
    const match = existing ? { value: existing, confidence: score(String(source), existing.name) || 1 } : best(source, classMatch.value.subclasses, classMatch.value.subclasses[0]);
    subclassId = match.value.id;
    recordDecision(decisions, "subclass", source, match.value, match.confidence);
  } else {
    subclassId = undefined;
  }

  const sheetQuantities = new Map<string, number>();
  const originalEquipment = [];
  let equipmentCoins = 0;
  for (let row = 0; row < 20; row += 1) {
    const name = String(sheet[`eq_${row}_0`] ?? "").trim();
    if (!name) continue;
    originalEquipment.push({ name, carrying: String(sheet[`eq_${row}_1`] ?? ""), slot: String(sheet[`eq_${row}_2`] ?? ""), weight: String(sheet[`eq_${row}_3`] ?? "") });
    const gp = /^(\d+)\s*gp$/i.exec(name);
    if (gp) { equipmentCoins += Number(gp[1]); continue; }
    const itemText = name.replace(/\(\s*\d+\s*(?:-\s*\d+\s*)?\)\s*$/i, "").trim();
    const migrationAlias = /^(?:vile|vial|vials|bloodvial|bloodvials)$/i.test(itemText) ? "blood-vial" : undefined;
    const exactId = migrationAlias ?? matchCatalogItem(itemText);
    const exact = exactId ? ITEMS.find((item) => item.id === exactId) : undefined;
    const match = exact ? { value: exact, confidence: 1 } : best(name.replace(/^\s*\d+\s*(?:[x×]|\s)?/i, ""), ITEMS, ITEMS[0]);
    recordDecision(decisions, `equipment.${row + 1}`, name, match.value, match.confidence);
    const quantity = equipmentQuantity(name);
    if (quantity > 0) sheetQuantities.set(match.value.id, (sheetQuantities.get(match.value.id) ?? 0) + quantity);
  }
  const migratedInventory = [...sheetQuantities].map(([itemId, qty]) => ({ itemId, qty }));

  const mainArmorId = armorMatch(sheet, "mainArmor", ARMOR.filter((entry) => entry.category === "Main Armor"), decisions) ?? card.mainArmorId ?? null;
  const addonArmorIds = Array.from({ length: 6 }, (_, index) => armorMatch(sheet, `addon${index + 1}`, ARMOR.filter((entry) => entry.category === "Add-on Armor"), decisions)).filter((id): id is string => !!id);
  const studdedAddonIds = addonArmorIds.filter((_, index) => sheet[`studs${index + 1}`] === true);
  const extraFields = [["headGear", "Head Gear"], ["scarf", "Scarf"], ["gloves", "Gloves"], ["boots", "Boots"]] as const;
  const extraArmorIds = extraFields.map(([field, subcategory]) => armorMatch(sheet, field, ARMOR.filter((entry) => entry.category === "Extra" && entry.subcategory === subcategory), decisions)).filter((id): id is string => !!id);
  const wornArmorIds = new Set([mainArmorId, ...addonArmorIds, ...extraArmorIds].filter(Boolean));

  const converted: HunterCard = {
    ...inferred.card,
    name: String(sheet.name ?? card.name ?? "Unnamed hunter").trim() || "Unnamed hunter",
    classId: classMatch.value.id,
    subclassId,
    level,
    backgroundId: backgroundMatch.value.id,
    background: backgroundMatch.value.name,
    feat: backgroundMatch.value.feat,
    abilities,
    baseAbilities,
    skillProficiencies,
    currentHp: numberField(sheet, "hpCur", card.currentHp ?? numberField(sheet, "hpMax", 1)),
    // core-rulebook.txt [page 42]: "Start with 0 Madness and do not track
    // Current Sanity." A migrated hunter therefore carries no Current Sanity
    // value; `normalizeCard` already derives Madness from any legacy pair.
    coins: Math.max(card.coins ?? 0, numberField(sheet, "coins", 0) + equipmentCoins),
    transformationLevel: numberField(sheet, "transformation", card.transformationLevel ?? 0),
    bloodTinge: sheet.bloodTinge === true || card.bloodTinge === true,
    mainArmorId,
    addonArmorIds: addonArmorIds.length ? addonArmorIds : (card.addonArmorIds ?? []),
    studdedAddonIds: studdedAddonIds.length ? studdedAddonIds : (card.studdedAddonIds ?? []),
    extraArmorIds: extraArmorIds.length ? extraArmorIds : (card.extraArmorIds ?? []),
    inventory: mergeInventory(card.inventory ?? [], migratedInventory.filter((entry) => !wornArmorIds.has(entry.itemId))),
    sheetAutomation: {
      version: 3,
      classSkills,
      backgroundBonuses: {},
      startingKitApplied: true,
      setupComplete: true,
      startingKitInventory: [],
      startingKitCoins: 0,
      migratedAt,
      legacyEquipment: [],
      migrationOriginalEquipment: originalEquipment,
      manualOverrides: [],
    },
  };
  const calculated = automationFor(converted);
  const manualOverrides = Object.keys(sheet).filter((key) => {
    if (MAPPED_SOURCE_FIELDS.has(key) || !(key in calculated.fields) || !hasValue(sheet[key])) return false;
    return calculated.fields[key] !== sheet[key];
  });
  converted.sheetAutomation = { ...converted.sheetAutomation!, manualOverrides };
  const nextSheet = { ...sheet, ...calculatedSheetFields(converted) };

  return {
    patch: {
      name: converted.name,
      classId: converted.classId,
      subclassId: converted.subclassId ?? null,
      level: converted.level,
      backgroundId: converted.backgroundId,
      background: converted.background,
      feat: converted.feat,
      abilities: converted.abilities,
      baseAbilities: converted.baseAbilities,
      skillProficiencies: converted.skillProficiencies,
      currentHp: converted.currentHp,
      sanity: converted.sanity,
      coins: converted.coins,
      transformationLevel: converted.transformationLevel,
      bloodTinge: converted.bloodTinge,
      mainArmorId: converted.mainArmorId,
      addonArmorIds: converted.addonArmorIds,
      studdedAddonIds: converted.studdedAddonIds,
      extraArmorIds: converted.extraArmorIds,
      inventory: converted.inventory,
      sheetAutomation: converted.sheetAutomation,
      sheet: nextSheet,
    },
    decisions,
    manualOverrides,
  };
}
