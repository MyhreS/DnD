import type { AbilityScores, CustomItem, HunterCard, HunterClass, SheetAutomationState } from "@/types";
import { abilityModifier } from "@/data/abilities";
import { acCategory, ARMOR_BY_ID } from "@/data/armor";
import { getClass } from "@/data/classes";
import { STORAGE_BY_ITEM_ID } from "@/data/storage";
import { ABILITY_KEYS } from "@/lib/ability-keys";
import { armorFor } from "@/lib/customItems";

export const DEFAULT_ABILITIES: AbilityScores = {
  str: 10,
  dex: 10,
  con: 10,
  int: 10,
  wis: 10,
  cha: 10,
};

/** Proficiency bonus by level: +2 at 1–4, then +1 every 4 levels (max +6). */
export function proficiencyBonus(level: number): number {
  return 2 + Math.floor((Math.max(1, Math.min(20, level)) - 1) / 4);
}

/** Average roll of a die (used for HP after level 1): d10 → 6. */
function dieAverage(die: number): number {
  return Math.floor(die / 2) + 1;
}

/**
 * Maximum HP: a full hit die + CON at level 1, then the die's average + CON for
 * each level after (minimum 1 per level).
 *
 * core-rulebook.txt [page 46] "Fixed Hit Points by Class" now states the
 * per-level gain as a FIXED TABLE keyed by class rather than a die formula.
 * `dieAverage(die) = floor(die / 2) + 1` reproduces that table exactly for all
 * six current classes (d12 → 7, d10 → 6, d8 → 5, d6 → 4), so the values are
 * correct today and the formula is deliberately left unchanged. A future class
 * whose printed fixed value diverges from its die average would need the table
 * itself — check this comment before adding one.
 */
export function maxHp(klass: HunterClass, abilities: AbilityScores, level = 1): number {
  const con = abilityModifier(abilities.con);
  const lvl = Math.max(1, level);
  let hp = Math.max(1, klass.hitDie + con);
  for (let l = 2; l <= lvl; l++) hp += Math.max(1, dieAverage(klass.hitDie) + con);
  return hp;
}

/**
 * Maximum Sanity = the class base + the Wisdom modifier in the established Hunter model.
 * The Deepcaller's current "Fracturing Mind" progression grants +1 Max
 * Sanity per level and explicitly caps the resulting Max Sanity at 26.
 */
export function maxSanity(klass: HunterClass, abilities: AbilityScores, level = 1): number {
  const startingMaximum = klass.maxSanity + abilityModifier(abilities.wis);
  return Math.max(0, klass.id === "deepcaller"
    ? Math.min(26, startingMaximum + Math.max(0, Math.min(20, level) - 1))
    : startingMaximum);
}

/** core-rulebook.txt [page 29] "Bloodied": "A creature is Bloodied while its
 * current Hit Points are equal to or less than half its Hit Point maximum,
 * rounded down." */
export function isBloodied(currentHp: number | null | undefined, maxHp: number | null | undefined): boolean {
  if (typeof currentHp !== "number" || typeof maxHp !== "number") return false;
  if (!Number.isFinite(currentHp) || !Number.isFinite(maxHp) || maxHp <= 0) return false;
  return currentHp <= Math.floor(maxHp / 2);
}

// Initiative is derived in `characterAutomation.ts` alone. core-rulebook.txt
// [page 15] "Initiative": combat begins with "a Dexterity check called an
// Initiative roll", so the modifier is the Dexterity modifier from the
// [page 32] "Ability Scores and Modifiers" table. The former `initiativeMod()`
// helper here became dead once `deriveSheetFromCard()` started delegating to
// that single projection.

export interface ArmorClassResult {
  total: number;
  /** The Main Armor's base value (or 10 unarmored). */
  baseAc: number;
  /** Bonus from Add-on pieces (incl. the Shield Arm pairing rule). */
  addonBonus: number;
  /** Bonus from Studs upgrades (three or more studded pieces +1, five or
   * more +2 — core-rulebook.txt [page 35] "Studs"). */
  studBonus: number;
  /** Base armor AC (main + add-ons + upgrades) — decides the Dex category. */
  baseArmorAc: number;
  /** True when a pauldron + vambrace on the SAME arm complete a Shield Arm —
   * always derived from the worn set, never persisted. */
  shieldArm: boolean;
  category: string;
  dexRule: string;
  dexApplied: number;
}

/** Worn-armor slice of a HunterCard the AC/weight math needs. Keeps the
 * legacy `studdedAddons` count so normalization and the save mirror type-check. */
export type WornArmor = Pick<
  HunterCard,
  "mainArmorId" | "addonArmorIds" | "studdedAddons" | "studdedAddonIds" | "extraArmorIds" | "customItems"
>;

/** Worn Add-on ids carrying the Studs upgrade. Reads the per-piece array,
 * falling back to the legacy numeric count (mapped to the FIRST N worn
 * add-ons) for docs not yet normalized — AC and weight depend only on the
 * count, so the fallback is observably identical to the old math. */
export function studdedAddonIdsOf(card: WornArmor): string[] {
  const addons = card.addonArmorIds ?? [];
  if (Array.isArray(card.studdedAddonIds)) {
    return card.studdedAddonIds.filter((id) => addons.includes(id));
  }
  const legacy = card.studdedAddons;
  const count =
    typeof legacy === "number" && Number.isFinite(legacy)
      ? Math.max(0, Math.min(addons.length, Math.floor(legacy)))
      : 0;
  return addons.slice(0, count);
}

/** Keep only the FIRST Extra per subcategory (one hat, one scarf, …), dropping
 * later duplicates and ids that aren't known Extra pieces. */
function dedupeExtras(ids: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const id of ids) {
    const piece = ARMOR_BY_ID[id];
    if (!piece || piece.category !== "Extra") continue;
    const key = piece.subcategory ?? id;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(id);
  }
  return out;
}

/** Load-time normalization for character docs. It preserves every final score,
 * restores the structured point-buy/background layers when they still exist,
 * upgrades automation state to v3, and keeps the independent Madness migration
 * lossless. Existing Standard and Maduhausu saves remain numerically unchanged. */
export function normalizeCard(raw: HunterCard): HunterCard {
  const legacyRaw = raw as HunterCard & Record<string, unknown>;
  const legacyState = raw.sheetAutomation as (Record<string, unknown> & Partial<SheetAutomationState>) | undefined;
  const levelAbilityBonuses = legacyState?.levelAbilityBonuses ?? {};
  const backgroundBonuses = Object.fromEntries(ABILITY_KEYS.map((key) => {
    const value = legacyState?.backgroundBonuses?.[key];
    return [key, typeof value === "number" && Number.isInteger(value) && value >= 0 && value <= 2 ? value : 0];
  })) as Partial<Record<(typeof ABILITY_KEYS)[number], number>>;
  const baseAbilities = raw.baseAbilities ?? Object.fromEntries(ABILITY_KEYS.map((key) => [
    key,
    raw.abilities[key]
      - (backgroundBonuses[key] ?? 0)
      - Object.values(levelAbilityBonuses).reduce((sum, entry) => sum + (entry?.[key] ?? 0), 0),
  ])) as AbilityScores;
  const normalizedState: Record<string, unknown> | undefined = legacyState
    ? { ...legacyState, version: 3, backgroundBonuses }
    : undefined;
  const klass = getClass(raw.classId);
  const sheetSanityMax = Number.parseInt(String(raw.sheet?.sanityMax ?? ""), 10);
  const sheetSanity = Number.parseInt(String(raw.sheet?.sanityCur ?? ""), 10);
  // Before Madness became independent, the app displayed it as the gap from
  // the old uncapped calculated maximum. Preserve that exact displayed value
  // once, even though the current Deepcaller maximum now correctly caps at 26.
  const previousMaxSanity = klass
    ? Math.max(0, klass.maxSanity
      + abilityModifier(raw.abilities.wis)
      + (klass.id === "deepcaller" ? Math.max(0, Math.min(20, raw.level) - 1) : 0))
    : Number.isFinite(sheetSanityMax) ? Math.max(0, sheetSanityMax) : Math.max(0, raw.sanity ?? 0);
  const previousSanity = raw.sanity ?? (Number.isFinite(sheetSanity) ? sheetSanity : previousMaxSanity);
  const madness = typeof raw.madness === "number" && Number.isFinite(raw.madness)
    ? Math.max(0, Math.floor(raw.madness))
    : Math.max(0, previousMaxSanity - previousSanity);
  const customItems = (Array.isArray(raw.customItems) ? raw.customItems : []).filter(
    (item): item is CustomItem => !!item
      && typeof item.id === "string"
      && typeof item.name === "string"
      && item.name.trim().length > 0
      && typeof item.weightLb === "number"
      && Number.isFinite(item.weightLb)
      && item.weightLb >= 0,
  );
  const normalized = {
    ...legacyRaw,
    baseAbilities,
    sheetAutomation: normalizedState as SheetAutomationState | undefined,
    sanity: typeof raw.sanity === "number" && Number.isFinite(raw.sanity) ? Math.max(0, raw.sanity) : raw.sanity,
    madness,
    // core-rulebook.txt [page 44]: "A Hunter can have no more than two Favors."
    favors: typeof raw.favors === "number" && Number.isFinite(raw.favors)
      ? Math.max(0, Math.min(2, Math.floor(raw.favors)))
      : raw.favors,
    customItems,
    studdedAddonIds: studdedAddonIdsOf(raw),
    // core-rulebook.txt [page 26] "Getting same Transformations": "Active
    // Transformations do not stack with themselves." A duplicate id is never
    // meaningful, so collapse it on load — no data is lost.
    ...(Array.isArray(raw.activeTransformations)
      ? { activeTransformations: Array.from(new Set(raw.activeTransformations.filter((id): id is string => typeof id === "string" && id !== ""))) }
      : {}),
    extraArmorIds: dedupeExtras(raw.extraArmorIds ?? []),
    equippedStorageIds: Array.from(
      new Set(
        (Array.isArray(raw.equippedStorageIds) ? raw.equippedStorageIds : []).filter(
          (id) => STORAGE_BY_ITEM_ID[id],
        ),
      ),
    ),
    droppedItems: (Array.isArray(raw.droppedItems) ? raw.droppedItems : []).filter(
      (d) =>
        !!d &&
        typeof d.itemId === "string" &&
        typeof d.qty === "number" &&
        d.qty > 0 &&
        typeof d.droppedAt === "number" &&
        Number.isFinite(d.droppedAt),
    ),
  } as HunterCard & Record<string, unknown>;
  if (normalized.abilityMode !== "pointbuy" && normalized.abilityMode !== "maduhausu") delete normalized.abilityMode;
  return normalized;
}

/** Max Add-on pieces: five, or six when the Main Armor has Balanced Fit
 * (one Add-on doesn't count toward the maximum). */
export function maxAddonPieces(
  mainArmorId: string | null | undefined,
  customItems: CustomItem[] = [],
): number {
  const main = mainArmorId ? armorFor({ customItems }, mainArmorId) : undefined;
  return main?.special.startsWith("Balanced Fit") ? 6 : 5;
}

/** A pauldron + vambrace worn on the SAME arm complete one Shield Arm
 * (the pair counts as +2 AC total; only one benefits). */
export function hasShieldArm(addonIds: string[]): boolean {
  const worn = new Set(addonIds);
  return (
    (worn.has("leather-pauldron-right") && worn.has("leather-vambrace-right")) ||
    (worn.has("leather-pauldron-left") && worn.has("leather-vambrace-left"))
  );
}

/** Add-on AC total with the established armor rules: the Under Layer Jerkin only
 * counts beneath Main Armor, and a completed Shield Arm upgrades its
 * pauldron+vambrace sum (+1) to +2. */
function addonAcBonus(addonIds: string[], hasMain: boolean, customItems: CustomItem[]): number {
  let sum = 0;
  for (const id of addonIds) {
    const piece = armorFor({ customItems }, id);
    if (!piece || piece.category !== "Add-on Armor") continue;
    if (id === "under-layer-leather-jerkin" && !hasMain) continue;
    sum += piece.acValue;
  }
  if (hasShieldArm(addonIds)) sum += 1;
  return sum;
}

/** Armor Class from the full worn set (Main + Add-ons + Studs) plus Dexterity.
 * The combined base armor AC decides the Dexterity category. */
export function armorClass(
  abilities: AbilityScores,
  mainArmorId: string | null,
  addonArmorIds: string[] = [],
  studdedAddonIds: string[] = [],
  customItems: CustomItem[] = [],
): ArmorClassResult {
  const dexMod = abilityModifier(abilities.dex);
  const main = mainArmorId ? armorFor({ customItems }, mainArmorId) : undefined;
  const baseAc = main ? main.acValue : 10;
  // Over-max stacks (e.g. a stored 6-piece set whose Balanced Fit main was
  // swapped away) never contribute beyond the legal allowance.
  const worn = addonArmorIds.slice(0, maxAddonPieces(mainArmorId, customItems));
  const addonBonus = addonAcBonus(worn, !!main, customItems);
  const studded = studdedAddonIds.filter((id) => worn.includes(id)).length;
  // core-rulebook.txt [page 35] "Studs": at least THREE studded Add-on pieces
  // grant +1 AC; five grant +2 AC.
  const studBonus = studded >= 5 ? 2 : studded >= 3 ? 1 : 0;
  const baseArmorAc = baseAc + addonBonus + studBonus;
  const cat = acCategory(baseArmorAc);
  const dexApplied = cat.applyDex(dexMod);
  return {
    total: baseArmorAc + dexApplied,
    baseAc,
    addonBonus,
    studBonus,
    baseArmorAc,
    shieldArm: hasShieldArm(worn),
    category: cat.label,
    dexRule: cat.dexRule,
    dexApplied,
  };
}

/** AC for a card's full worn set. */
export function armorClassFor(
  card: Pick<HunterCard, "abilities"> & WornArmor,
): ArmorClassResult {
  return armorClass(
    card.abilities,
    card.mainArmorId,
    card.addonArmorIds ?? [],
    studdedAddonIdsOf(card),
    card.customItems ?? [],
  );
}

/** Weight of everything WORN (main + add-ons + extras + 5 lb per Studs
 * upgrade, core-rulebook.txt [page 35]) — worn armor counts toward carried
 * weight. */
export function wornArmorWeight(card: WornArmor): number {
  const ids = [
    ...(card.mainArmorId ? [card.mainArmorId] : []),
    ...(card.addonArmorIds ?? []),
    ...(card.extraArmorIds ?? []),
  ];
  const pieces = ids.reduce((sum, id) => sum + (armorFor(card, id)?.weightLb ?? 0), 0);
  const studs = studdedAddonIdsOf(card).length * 5;
  return Math.round((pieces + studs) * 10) / 10;
}

/** A fresh, unsaved card skeleton for a brand-new hunter. */
export function emptyCard(params: {
  ownerUid: string;
  email: string;
  displayName: string;
}): HunterCard {
  const now = Date.now();
  return {
    id: crypto.randomUUID(),
    ownerUid: params.ownerUid,
    ownerEmail: params.email,
    ownerName: params.displayName,
    name: "",
    classId: "",
    subclassId: null,
    background: "",
    level: 1,
    lastSeenLevel: 1,
    feats: [],
    abilities: { ...DEFAULT_ABILITIES },
    baseAbilities: { ...DEFAULT_ABILITIES },
    abilityMode: "pointbuy",
    skillProficiencies: [],
    mainArmorId: null,
    addonArmorIds: [],
    studdedAddons: 0,
    studdedAddonIds: [],
    extraArmorIds: [],
    transformationLevel: 0,
    madness: 0,
    activeTransformations: [],
    insight: 0,
    bloodTinge: false,
    notTonight: true,
    favors: 0,
    sleeplessCounter: 0,
    exhaustion: 0,
    preparedWhispers: [],
    coins: 0,
    customItems: [],
    equippedStorageIds: [],
    notes: "",
    createdAt: now,
    updatedAt: now,
  };
}

/** A fresh card for the canonical character-sheet creation flow. */
export function emptySheetCard(params: {
  ownerUid: string;
  email: string;
  displayName: string;
}): HunterCard {
  return {
    ...emptyCard(params),
    sheet: {},
    sheetAutomation: {
      version: 3,
      classSkills: [],
      backgroundBonuses: {},
      setupComplete: false,
    },
  };
}

/** Whether a class's weapon-proficiency sentence covers a given weapon.
 * core-rulebook.txt [page 12]: proficiency is what allows the Proficiency Bonus
 * to be added to a weapon's attack rolls. Classes state this as prose, and the
 * Stalker's line narrows Martial weapons to named properties
 * ("Simple weapons and Martial weapons with the Finesse or Light property"),
 * so the property restriction is parsed out rather than special-cased by id.
 * Unarmed strikes are always available, so they are never gated. */
export function isWeaponProficient(
  proficiencies: string,
  facts: { category?: string; properties: string },
): boolean {
  if (facts.category === "Simple") return /simple/i.test(proficiencies);
  if (facts.category !== "Martial") return true;
  if (!/martial/i.test(proficiencies)) return false;
  const restriction = /martial weapons with the ([^.]+?) propert/i.exec(proficiencies)?.[1];
  if (!restriction) return true;
  return restriction
    .split(/\s+or\s+|,\s*/)
    .map((word) => word.trim())
    .filter(Boolean)
    .some((word) => new RegExp(`\\b${word}\\b`, "i").test(facts.properties));
}

/** Attack bonus for a carried weapon: the ability the weapon uses, plus the
 * Proficiency Bonus only when the hunter is actually proficient with it.
 * core-rulebook.txt [page 43]: melee weapons use Strength, ranged weapons use
 * Dexterity, and a Finesse weapon may use either — the app shows the better of
 * the two, which is always the player's choice in practice. [page 12] gates the
 * Proficiency Bonus itself, so a Deepcaller holding a Greatsword adds only the
 * ability modifier. */
export function weaponAttackBonus(
  card: HunterCard,
  facts: { properties: string; attack: "Melee" | "Ranged"; category?: string } | undefined,
): number {
  const klass = getClass(card.classId);
  const proficient = !facts || !klass || isWeaponProficient(klass.weaponProficiencies, facts);
  const prof = proficient ? proficiencyBonus(card.level || 1) : 0;
  const str = abilityModifier(card.abilities?.str ?? 10);
  const dex = abilityModifier(card.abilities?.dex ?? 10);
  if (!facts) return prof + str;
  if (/Finesse/i.test(facts.properties)) return prof + Math.max(str, dex);
  return prof + (facts.attack === "Ranged" ? dex : str);
}
