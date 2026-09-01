import { abilityModifier, formatModifier } from "@/data/abilities";
import { ARMOR_BY_ID } from "@/data/armor";
import { BACKGROUNDS } from "@/data/backgrounds";
import { CLASSES, getClass } from "@/data/classes";
import { SHEET_SKILL_FIELD, SKILLS, skillAbility } from "@/data/skills";
import { ABILITY_KEYS } from "@/lib/ability-keys";
import { WEAPON_FACTS, weaponDamageLabel } from "@/data/weapons";
import { armorClassFor, maxHp, maxSanity, proficiencyBonus, studdedAddonIdsOf, weaponAttackBonus } from "@/lib/character";
import { armorFor } from "@/lib/customItems";
import { carryCondition, resolveInventory, resolveStorage, totalCarriedWeight } from "@/lib/inventory";
import { computeSlots } from "@/lib/slots";
import { catalogIdForName } from "@/lib/startingEquipment";
import type { HunterCard, LegacyEquipmentLine, SheetData } from "@/types";

export interface PendingChoice {
  label: string;
  remaining: number;
  options?: string[];
  reason: string;
}

export interface CharacterAutomationResult {
  fields: SheetData;
  reasons: Record<string, string>;
  pending: {
    classSkills?: PendingChoice;
    background?: PendingChoice;
    subclass?: PendingChoice;
    levelChoices?: PendingChoice;
    featSkills?: PendingChoice;
    whispers?: PendingChoice;
  };
}

const SOURCE = {
  class: "C&S Core Rulebook, Hunter Classes",
  creation: "C&S Core Rulebook, Create Your Character",
  background: "C&S Core Rulebook, Backgrounds",
  armor: "C&S Core Rulebook, Armor Part 1–2",
  equipment: "C&S Core Rulebook, Equipment, Weight and Item Slots",
};

function getSubclass(classId: string, subclassId: string | null | undefined) {
  if (!subclassId) return undefined;
  return getClass(classId)?.subclasses.find((subclass) => subclass.id === subclassId);
}

function put(fields: SheetData, reasons: Record<string, string>, key: string, value: string | boolean, reason: string) {
  fields[key] = value;
  reasons[key] = reason;
}

function classIdFromName(value: unknown): string {
  if (typeof value !== "string") return "";
  const normalized = value.trim().toLowerCase().replace(/^hunter\s+/, "");
  return CLASSES.find((klass) => klass.name.toLowerCase() === normalized || klass.title.toLowerCase() === value.trim().toLowerCase())?.id ?? "";
}

function intField(sheet: SheetData | undefined, key: string, fallback: number): number {
  const raw = sheet?.[key];
  const value = typeof raw === "string" ? Number.parseInt(raw, 10) : NaN;
  return Number.isFinite(value) ? value : fallback;
}

function featureText(card: HunterCard): string {
  const klass = getClass(card.classId);
  if (!klass) return "";
  const level = Math.max(1, Math.min(20, card.level));
  const subclass = getSubclass(klass.id, card.subclassId);
  const rows: string[] = [];
  for (let current = 1; current <= level; current += 1) {
    const progression = klass.progression.find((row) => row.level === current);
    const names = progression?.features && progression.features !== "—" ? progression.features : "";
    const extras = progression && current === level
      ? Object.entries(progression.extras).map(([name, value]) => `${name}: ${value}`).join(" · ")
      : "";
    if (names || extras) rows.push(`Level ${current}: ${[names, extras].filter(Boolean).join(" · ")}`);
    const detail = [
      ...(klass.features ?? []).filter((feature) => feature.level === current),
      ...(subclass?.features ?? []).filter((feature) => feature.level === current),
    ];
    for (const feature of detail) rows.push(`${feature.name} — ${feature.text}`);
  }
  return rows.join("\n\n");
}

function unresolvedLevelChoices(card: HunterCard): string[] {
  const klass = getClass(card.classId);
  if (!klass) return [];
  const acknowledged = card.lastSeenLevel ?? 0;
  return klass.progression
    .filter((row) => row.level <= card.level && row.level > acknowledged)
    .flatMap((row) => {
      const choices = row.features.split(",").map((entry) => entry.trim()).filter((entry) =>
        /^(hunter .+ subclass|ability score improvement|epic boon|fighting style|expertise|weapon mastery|forbidden revelation(?:\s*\([^)]*\))?)$/i.test(entry),
      );
      return choices.map((choice) => `Level ${row.level}: ${choice}`);
    });
}

function equipmentFields(card: HunterCard, fields: SheetData, reasons: Record<string, string>) {
  const slots = computeSlots(card);
  const legacy = card.sheetAutomation?.legacyEquipment ?? [];
  const lines = [
    ...resolveInventory(card).map(({ item, qty }) => ({
      name: `${qty > 1 ? `${qty} × ` : ""}${item.name}`,
      carrying: item.carry,
      slot: item.carry === "Insignificant" ? "—" : slots.byItem[item.id] ?? item.slotLocation ?? "—",
      weight: `${Math.round(item.weightLb * qty * 10) / 10} lb`,
    })),
    ...legacy,
  ].slice(0, 20);
  for (let row = 0; row < 20; row += 1) {
    const line = lines[row];
    put(fields, reasons, `eq_${row}_0`, line?.name ?? "", SOURCE.equipment);
    put(fields, reasons, `eq_${row}_1`, line?.carrying ?? "", SOURCE.equipment);
    put(fields, reasons, `eq_${row}_2`, line?.slot ?? "", SOURCE.equipment);
    put(fields, reasons, `eq_${row}_3`, line?.weight ?? "", SOURCE.equipment);
  }
  // character-sheet.txt [page 5] WEAPON DAMAGE: NAME | ATTACK BONUS |
  // DAMAGE TYPE | NOTES. One row per carried weapon type.
  const carriedWeapons = resolveInventory(card).filter(({ item }) => item.category === "Weapon").slice(0, 8);
  for (let row = 0; row < 8; row += 1) {
    const line = carriedWeapons[row];
    const custom = line && (card.customItems ?? []).find((entry) => entry.id === line.item.id);
    const facts = line && WEAPON_FACTS[line.item.id];
    const damageType = custom?.damage || weaponDamageLabel(facts || undefined);
    put(fields, reasons, `wd_${row}_0`, line ? `${line.qty > 1 ? `${line.qty} × ` : ""}${line.item.name}` : "", SOURCE.equipment);
    put(fields, reasons, `wd_${row}_1`, line ? (custom?.attackBonus || formatModifier(weaponAttackBonus(card, facts || undefined))) : "", SOURCE.equipment);
    put(fields, reasons, `wd_${row}_2`, line ? (damageType === "—" ? "" : damageType) : "", SOURCE.equipment);
    put(fields, reasons, `wd_${row}_3`, line ? (custom?.weaponNotes || facts?.properties || line.item.note || "") : "", SOURCE.equipment);
  }
  const storage = resolveStorage(card);
  put(fields, reasons, "storageItems", storage.map((item) => item.name).join(", "), SOURCE.equipment);
  put(fields, reasons, "slotHand", storage.some((item) => item.id === "sack"), SOURCE.equipment);
  put(fields, reasons, "slotBack", storage.some((item) => item.id === "backpack" || item.id === "carrying-harness"), SOURCE.equipment);
  put(fields, reasons, "slotHip", storage.some((item) => item.id === "tool-belt"), SOURCE.equipment);
  put(fields, reasons, "slotChest", storage.some((item) => item.id === "bandolier"), SOURCE.equipment);
  put(fields, reasons, "slotAnkle", storage.some((item) => item.id === "ankle-holster"), SOURCE.equipment);
}

export function automationFor(card: HunterCard): CharacterAutomationResult {
  const fields: SheetData = {};
  const reasons: Record<string, string> = {};
  const pending: CharacterAutomationResult["pending"] = {};
  const klass = getClass(card.classId);
  const level = Math.max(1, Math.min(20, card.level || 1));
  const prof = proficiencyBonus(level);
  const background = BACKGROUNDS.find((entry) => entry.id === card.backgroundId);
  const featNames = new Set([background?.feat, ...(card.feats ?? [])].filter(Boolean));
  const speedModifier = intField(card.sheet, "speedModifier", 0);
  const initiativeModifier = intField(card.sheet, "initiativeModifier", 0);
  const passiveModifier = intField(card.sheet, "passivePerceptionModifier", 0);
  const acModifier = intField(card.sheet, "acModifier", 0);
  const armor = armorClassFor(card);
  const weight = totalCarriedWeight(card);
  const condition = carryCondition(card.abilities.str, weight);

  put(fields, reasons, "name", card.name, "Your saved hunter name");
  put(fields, reasons, "level", String(level), "Character level");
  put(fields, reasons, "insight", String(card.insight ?? 0), "DM-awarded Insight");
  put(fields, reasons, "profBonus", formatModifier(prof), `${SOURCE.creation}; level ${level}`);
  put(fields, reasons, "background", background?.name ?? card.background, background ? SOURCE.background : "Your written background");

  if (!background) pending.background = { label: "Background", remaining: 1, options: BACKGROUNDS.map((entry) => entry.name), reason: "A background grants skills, a feat, tools, and equipment." };
  if (klass) {
    put(fields, reasons, "class", klass.name, `${SOURCE.class}: ${klass.title}`);
    const subclass = getSubclass(klass.id, card.subclassId);
    put(fields, reasons, "subclass", subclass?.name ?? "", `${SOURCE.class}; subclass begins at level 3`);
    if (level >= 3 && klass.subclasses.length > 0 && !klass.subclassOptional && !card.subclassId) pending.subclass = { label: `${klass.name} path`, remaining: 1, options: klass.subclasses.map((entry) => entry.name), reason: "Your class progression grants a subclass at level 3." };
    put(fields, reasons, "sanityDice", klass.sanityDie, `${klass.title} core traits`);
    const hp = maxHp(klass, card.abilities, level)
      + (featNames.has("Tough") ? level * 2 : 0)
      + (featNames.has("Boon of Fortitude") ? 40 : 0);
    const sanity = maxSanity(klass, card.abilities, level);
    put(fields, reasons, "hpMax", String(hp), `${klass.name} Hit Die d${klass.hitDie} + Constitution modifier at each level`);
    put(fields, reasons, "hpCur", String(card.currentHp ?? hp), "Current HP, defaulting to calculated maximum");
    put(fields, reasons, "sanityMax", String(sanity), `${klass.name} base Sanity + Wisdom modifier${klass.id === "deepcaller" ? " + Fracturing Mind" : ""}`);
    // core-rulebook.txt [page 42]: "Start with 0 Madness and do not track
    // Current Sanity." Madness is the tracked pool and the Insane condition is
    // derived from it ([page 23]), so no `sanityCur` value is calculated,
    // written, or offered as an editable field any more.
    put(fields, reasons, "hdMax", String(level), `${klass.title}: one Hit Die per level`);
    put(fields, reasons, "hdCur", String(Math.max(0, Math.min(level, intField(card.sheet, "hdCur", level)))), "Current available Hit Dice, defaulting to the full level allowance");
    if (klass.caster) {
      const progression = klass.progression.find((row) => row.level === level);
      const strainMax = Number(progression?.extras.Strains ?? 0);
      const strainLevel = progression?.extras["Strain Level"] ?? "—";
      const strainCurrent = Math.max(0, Math.min(strainMax, intField(card.sheet, "strainCur", strainMax)));
      put(fields, reasons, "strainMax", String(strainMax), `${klass.title} level ${level} progression`);
      put(fields, reasons, "strainCur", String(strainCurrent), "Current available Strains, defaulting to the full allowance");
      put(fields, reasons, "strainLevel", String(strainLevel), `${klass.title} level ${level} progression`);
    }
    // core-rulebook.txt [page 58] Roving, [page 103] Speedy, [page 106] Boon of
    // Speed, [page 40] carrying condition. `speedModifier` is kept as-is: a
    // player who compensated by hand still owns that override.
    const roving = klass.id === "scout" && level >= 6 && armor.category !== "Heavy Armor" ? 10 : 0;
    const featSpeed = (featNames.has("Speedy") ? 10 : 0) + (featNames.has("Boon of Speed") ? 30 : 0);
    const speedReasons = [
      `${klass.title} core traits`,
      roving ? "+10 ft from Roving while not wearing Heavy armor" : "",
      featNames.has("Speedy") ? "+10 ft from Speedy" : "",
      featNames.has("Boon of Speed") ? "+30 ft from Boon of Speed" : "",
      condition.speedDelta ? `${formatModifier(condition.speedDelta)} ft from ${condition.label}` : "",
      speedModifier ? `custom modifier ${formatModifier(speedModifier)} ft` : "",
    ].filter(Boolean).join(" · ");
    put(fields, reasons, "speed", `${klass.speedFt + roving + featSpeed + condition.speedDelta + speedModifier} ft`, speedReasons);
    put(fields, reasons, "armorLight", klass.armorTraining.includes("Light armor"), `${klass.title} Armor Training`);
    put(fields, reasons, "armorMedium", klass.armorTraining.includes("Medium armor"), `${klass.title} Armor Training`);
    put(fields, reasons, "armorHeavy", klass.armorTraining.includes("Heavy armor"), `${klass.title} Armor Training`);
    put(fields, reasons, "wepSimple", /simple/i.test(klass.weaponProficiencies), `${klass.title} Weapon Proficiencies`);
    put(fields, reasons, "wepMartial", /martial/i.test(klass.weaponProficiencies), `${klass.title} Weapon Proficiencies`);
    // core-rulebook.txt [page 43]: Strength for melee weapon attacks, Dexterity
    // for ranged. Individual weapon properties (Finesse, Thrown) can override
    // which ability applies, so these are the baseline figures only.
    put(fields, reasons, "meleeAttack", formatModifier(abilityModifier(card.abilities.str) + prof), "Strength modifier + proficiency; Finesse weapons may use Dexterity instead");
    put(fields, reasons, "rangedAttack", formatModifier(abilityModifier(card.abilities.dex) + prof), "Dexterity modifier + proficiency");
    const classSkills = card.sheetAutomation?.classSkills ?? card.skillProficiencies.filter((skill) => klass.skillChoices.options.includes(skill));
    const valid = classSkills.filter((skill) => klass.skillChoices.options.includes(skill));
    if (valid.length < klass.skillChoices.count) pending.classSkills = { label: "Class skills", remaining: klass.skillChoices.count - valid.length, options: klass.skillChoices.options, reason: `${klass.title} grants ${klass.skillChoices.count} choices.` };
    const chosen = [
      card.feats?.length ? `Chosen feats: ${card.feats.join(", ")}` : "",
      card.sheetAutomation?.expertiseSkills?.length ? `Expertise: ${card.sheetAutomation.expertiseSkills.join(", ")}` : "",
      card.sheetAutomation?.weaponMasteries?.length ? `Weapon Mastery: ${card.sheetAutomation.weaponMasteries.join(", ")}` : "",
      Object.entries(card.sheetAutomation?.levelChoices ?? {}).length
        ? `Level choices: ${Object.values(card.sheetAutomation?.levelChoices ?? {}).join(", ")}`
        : "",
    ].filter(Boolean).join("\n");
    const text = [featureText(card), chosen].filter(Boolean).join("\n\n");
    put(fields, reasons, "features1", text, `${klass.title} progression through level ${level}`);
    const choices = unresolvedLevelChoices(card);
    if (choices.length) pending.levelChoices = { label: "Level choices", remaining: choices.length, options: choices, reason: "These level features require a player decision." };
  }

  if (background?.feat === "Skilled" && (card.featSkills?.length ?? 0) < 3) pending.featSkills = { label: "Skilled feat proficiencies", remaining: 3 - (card.featSkills?.length ?? 0), reason: "Skilled grants any combination of three skill or tool proficiencies." };

  // Slippery Mind — core-rulebook.txt [page 65]: the Stalker gains Wisdom and
  // Charisma saving throw proficiency at level 15.
  const slipperyMind = card.classId === "stalker" && level >= 15;
  for (const key of ABILITY_KEYS) {
    const score = card.abilities[key];
    const mod = abilityModifier(score);
    const fromSlipperyMind = slipperyMind && (key === "wis" || key === "cha");
    const saveProficient = (klass?.savingThrows.includes(key) ?? false) || fromSlipperyMind;
    put(fields, reasons, `${key}Score`, String(score), card.baseAbilities ? "Bought score + background adjustment + structured level increases" : "Saved ability score");
    put(fields, reasons, `${key}Mod`, formatModifier(mod), `Modifier from ${score}`);
    put(fields, reasons, `${key}SaveP`, saveProficient, saveProficient ? (fromSlipperyMind && !klass?.savingThrows.includes(key) ? `${klass?.title} Slippery Mind saving throw proficiency` : `${klass?.title} saving throw proficiency`) : "Not granted by class");
    put(fields, reasons, `${key}Save`, formatModifier(mod + (saveProficient ? prof : 0)), saveProficient ? `Ability modifier + proficiency ${formatModifier(prof)}` : "Ability modifier only");
  }

  const backgroundSkills = background?.skills ?? [];
  const allSkills = new Set([...card.skillProficiencies, ...backgroundSkills, ...(card.featSkills ?? []).filter((choice) => SKILLS.some((skill) => skill.name === choice))]);
  const expertise = new Set(card.sheetAutomation?.expertiseSkills ?? []);
  for (const skill of SKILLS) {
    const key = skillAbility(skill.name);
    const proficient = allSkills.has(skill.name);
    const field = SHEET_SKILL_FIELD[skill.name];
    put(fields, reasons, `${field}P`, proficient, proficient ? (backgroundSkills.includes(skill.name) ? `${background?.name} background` : `${klass?.title ?? "Saved"} proficiency`) : "Not selected");
    const multiplier = expertise.has(skill.name) ? 2 : proficient ? 1 : 0;
    put(fields, reasons, field, formatModifier(abilityModifier(card.abilities[key]) + prof * multiplier), expertise.has(skill.name) ? `${key.toUpperCase()} modifier + Expertise` : proficient ? `${key.toUpperCase()} modifier + proficiency` : `${key.toUpperCase()} modifier`);
  }
  put(fields, reasons, "initiative", formatModifier(abilityModifier(card.abilities.dex) + (featNames.has("Alert") ? prof : 0) + initiativeModifier), `${featNames.has("Alert") ? "Dexterity modifier + proficiency from Alert" : "Dexterity modifier"}${initiativeModifier ? ` + custom modifier ${formatModifier(initiativeModifier)}` : ""}`);
  // core-rulebook.txt [page 43]: Passive Perception = 10 + the full Wisdom
  // (Perception) check modifier, so Expertise doubles proficiency here too.
  const perceptionMultiplier = expertise.has("Perception") ? 2 : allSkills.has("Perception") ? 1 : 0;
  put(fields, reasons, "passivePerception", String(10 + abilityModifier(card.abilities.wis) + prof * perceptionMultiplier + passiveModifier), `10 + Wisdom modifier${perceptionMultiplier === 2 ? " + Perception Expertise" : perceptionMultiplier === 1 ? " + Perception proficiency" : ""}${passiveModifier ? ` + custom modifier ${formatModifier(passiveModifier)}` : ""}`);
  const tools = [klass?.toolProficiencies !== "—" ? klass?.toolProficiencies : null, background?.tool, ...(card.featSkills ?? []).filter((choice) => !SKILLS.some((skill) => skill.name === choice))].filter(Boolean);
  put(fields, reasons, "tools", [...new Set(tools)].join(", "), `${SOURCE.class} and ${SOURCE.background}. A tool proficiency adds your Proficiency Bonus to checks with that tool; when a skill also applies, add it once and roll with Advantage.`);
  put(fields, reasons, "feats", [background?.feat, ...(card.feats ?? [])].filter(Boolean).join("\n"), `${SOURCE.background} and level-up choices`);

  put(fields, reasons, "ac", String(armor.total + acModifier), `${SOURCE.armor}: base ${armor.baseArmorAc} + Dexterity ${formatModifier(armor.dexApplied)}${acModifier ? ` + custom modifier ${formatModifier(acModifier)}` : ""}`);
  put(fields, reasons, "armorCategory", armor.category, `${SOURCE.armor}; category comes from base armor AC ${armor.baseArmorAc}`);
  put(fields, reasons, "shieldArm", armor.shieldArm, "Pauldron + vambrace on the same arm");
  put(fields, reasons, "mainArmor", card.mainArmorId ? armorFor(card, card.mainArmorId)?.name ?? "" : "", SOURCE.armor);
  const addons = card.addonArmorIds ?? [];
  const studded = new Set(studdedAddonIdsOf(card));
  for (let index = 0; index < 6; index += 1) {
    put(fields, reasons, `addon${index + 1}`, addons[index] ? armorFor(card, addons[index])?.name ?? "" : "", SOURCE.armor);
    put(fields, reasons, `studs${index + 1}`, !!addons[index] && studded.has(addons[index]), SOURCE.armor);
  }
  const extras = (card.extraArmorIds ?? []).map((id) => ARMOR_BY_ID[id]).filter(Boolean);
  // The four Extra subcategories of core-rulebook.txt [page 38] plus "Robe",
  // the slot the unique Robe of the Deepcallers occupies. Without the fifth
  // field a worn Robe is invisible on every derived and printed sheet.
  for (const [field, subcategory] of [["headGear", "Head Gear"], ["scarf", "Scarf"], ["gloves", "Gloves"], ["boots", "Boots"], ["robe", "Robe"]] as const) {
    put(fields, reasons, field, extras.find((piece) => piece.subcategory === subcategory)?.name ?? "", SOURCE.armor);
  }
  const special = [card.mainArmorId ? armorFor(card, card.mainArmorId)?.special : null, ...addons.map((id) => armorFor(card, id)?.special), ...extras.map((piece) => piece.special)].filter(Boolean);
  put(fields, reasons, "special", [...new Set(special)].join("\n"), SOURCE.armor);
  put(fields, reasons, "impressions", extras.map((piece) => piece.impression).filter(Boolean).join("\n"), SOURCE.armor);
  put(fields, reasons, "weight", `${weight} lb`, `${SOURCE.equipment}; inventory + worn armor + worn storage`);
  put(fields, reasons, "weightCondition", condition.label, `${SOURCE.creation}; compared with Strength ${card.abilities.str}`);
  equipmentFields(card, fields, reasons);

  if (klass?.caster) {
    const riteMod = abilityModifier(card.abilities.int);
    put(fields, reasons, "riteAbility", "Intelligence", `${klass.title}: Rite Performing Ability`);
    put(fields, reasons, "riteMod", formatModifier(riteMod), "Intelligence modifier");
    put(fields, reasons, "riteDC", String(8 + prof + riteMod), "8 + proficiency + Intelligence modifier");
    put(fields, reasons, "riteAttack", formatModifier(prof + riteMod), "Proficiency + Intelligence modifier");
    // Zealot Whispers — core-rulebook.txt [page 76]: "You prepare a number of
    // Whispers equal to the number shown for a Hunter Deepcaller of your level,
    // plus one additional Whisper."
    const zealotBonus = card.subclassId === "hunter-zealot" && level >= 3 ? 1 : 0;
    const allowed = Number(klass.progression.find((row) => row.level === level)?.extras["Prepared Whispers"] ?? 0) + (featNames.has("Listener") ? 1 : 0) + zealotBonus;
    const remaining = Math.max(0, allowed - (card.preparedWhispers?.length ?? 0));
    if (remaining) pending.whispers = { label: "Prepared Whispers", remaining, reason: `${klass.title} level ${level} allows ${allowed}.` };
  }
  if (!klass?.caster && featNames.has("Listener")) {
    const remaining = Math.max(0, 1 - (card.preparedWhispers?.length ?? 0));
    if (remaining) pending.whispers = { label: "Listener whisper", remaining, reason: "Listener grants one Whisper of your choice." };
  }
  put(fields, reasons, "coins", String(card.coins ?? 0), "Saved gold pieces");
  put(fields, reasons, "transformation", String(card.transformationLevel ?? 0), "Current Transformation Level");
  put(fields, reasons, "bloodTinge", card.bloodTinge === true, "Current Blood Tinge state. Gained once per round when damage leaves you at 1–9 HP; lost on a Long Rest.");

  return { fields, reasons, pending };
}

/** Recalculate every rules-driven sheet field while preserving fields that a
 * migrated Hunter explicitly keeps as a manual override. This is the single
 * projection used whenever structured character decisions are written back to
 * the saved character sheet snapshot. */
export function calculatedSheetFields(card: HunterCard): SheetData {
  const overrides = new Set(card.sheetAutomation?.manualOverrides ?? []);
  return Object.fromEntries(
    Object.entries(automationFor(card).fields).filter(([key]) => !overrides.has(key)),
  );
}

export function matchCatalogItem(value: string): string | null {
  return catalogIdForName(value);
}

export function structuredCardFromSheet(card: HunterCard): { card: HunterCard; legacyEquipment: LegacyEquipmentLine[] } {
  const sheet = card.sheet ?? {};
  const classId = classIdFromName(sheet.class) || card.classId;
  const background = BACKGROUNDS.find((entry) => entry.name.toLowerCase() === String(sheet.background ?? "").trim().toLowerCase());
  const abilities = { ...card.abilities };
  for (const key of ABILITY_KEYS) abilities[key] = Math.max(3, Math.min(30, intField(sheet, `${key}Score`, abilities[key])));
  const quantities = new Map<string, number>();
  const legacyEquipment: LegacyEquipmentLine[] = [];
  for (let row = 0; row < 20; row += 1) {
    const name = typeof sheet[`eq_${row}_0`] === "string" ? String(sheet[`eq_${row}_0`]).trim() : "";
    if (!name) continue;
    const itemId = matchCatalogItem(name);
    const qty = Number.parseInt(name, 10) || 1;
    if (itemId) quantities.set(itemId, (quantities.get(itemId) ?? 0) + qty);
    else legacyEquipment.push({ name, carrying: String(sheet[`eq_${row}_1`] ?? ""), slot: String(sheet[`eq_${row}_2`] ?? ""), weight: String(sheet[`eq_${row}_3`] ?? "") });
  }
  const skillProficiencies = SKILLS.filter((skill) => sheet[`${SHEET_SKILL_FIELD[skill.name]}P`] === true).map((skill) => skill.name);
  const next: HunterCard = {
    ...card,
    name: typeof sheet.name === "string" ? sheet.name.trim() : card.name,
    classId,
    level: Math.max(1, Math.min(20, intField(sheet, "level", card.level))),
    backgroundId: background?.id,
    background: background?.name ?? card.background,
    abilities,
    baseAbilities: { ...abilities },
    skillProficiencies,
    inventory: [...quantities].map(([itemId, qty]) => ({ itemId, qty })),
  };
  return { card: next, legacyEquipment };
}
