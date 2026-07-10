import type { AbilityKey, AbilityScores, HunterCard, HunterClass } from "@/types";
import { abilityModifier } from "@/data/abilities";
import { acCategory, ARMOR_BY_ID } from "@/data/armor";
import { skillAbility } from "@/data/skills";
import { STORAGE_BY_ITEM_ID } from "@/data/storage";

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
 */
export function maxHp(klass: HunterClass, abilities: AbilityScores, level = 1): number {
  const con = abilityModifier(abilities.con);
  const lvl = Math.max(1, level);
  let hp = Math.max(1, klass.hitDie + con);
  for (let l = 2; l <= lvl; l++) hp += Math.max(1, dieAverage(klass.hitDie) + con);
  return hp;
}

/**
 * Maximum Sanity = the class base + the Wisdom modifier (per the handbook).
 * The Deepcaller's "Fracturing Mind" also permanently grants +1 Max Sanity per
 * level (uncapped, per master.json's Fracturing Mind).
 */
export function maxSanity(klass: HunterClass, abilities: AbilityScores, level = 1): number {
  const classBase =
    klass.id === "deepcaller"
      ? klass.maxSanity + Math.max(0, Math.min(20, level) - 1)
      : klass.maxSanity;
  return Math.max(0, classBase + abilityModifier(abilities.wis));
}

/**
 * Cumulative Insight required to REACH each level (index 0 → level 1), from the
 * handbook's Character Advancement table. Insight is the DM-awarded XP currency.
 */
export const INSIGHT_THRESHOLDS = [
  0, 6, 15, 30, 50, 75, 105, 140, 180, 225, 275, 330, 390, 455, 525, 600, 680, 765, 855, 950,
] as const;

/**
 * The highest level a hunter has EARNED for a total Insight (1–20).
 * Rulebook gate: this level only takes effect after a Long Rest — so the
 * applied `card.level` may lag this value until the hunter rests.
 */
export function levelForInsight(insight: number): number {
  let lvl = 1;
  for (let i = 0; i < INSIGHT_THRESHOLDS.length; i++) {
    if (insight >= INSIGHT_THRESHOLDS[i]) lvl = i + 1;
  }
  return lvl;
}

/**
 * Progress toward the next level, or null once level 20 is reached. Measured
 * from the hunter's APPLIED level too (a DM can grant levels directly, ahead
 * of Insight) — so a level 10 hunter counts toward level 11, never "Lv 2".
 */
export function insightToNext(
  card: Pick<HunterCard, "insight" | "level">,
): { nextLevel: number; remaining: number } | null {
  const insight = card.insight ?? 0;
  const lvl = Math.max(card.level, levelForInsight(insight));
  if (lvl >= 20) return null;
  return { nextLevel: lvl + 1, remaining: Math.max(0, INSIGHT_THRESHOLDS[lvl] - insight) };
}

/** The highest level a card's Insight has earned (1–20). */
export function earnedLevel(card: Pick<HunterCard, "insight">): number {
  return levelForInsight(card.insight ?? 0);
}

/** Whether a level-up is owed. Per the rulebook it only applies after a Long Rest. */
export function isLevelUpPending(card: Pick<HunterCard, "insight" | "level">): boolean {
  return earnedLevel(card) > card.level;
}

/** Initiative modifier (Dexterity), per the handbook. */
export function initiativeMod(abilities: AbilityScores): number {
  return abilityModifier(abilities.dex);
}

export interface ArmorClassResult {
  total: number;
  /** The Main Armor's base value (or 10 unarmored). */
  baseAc: number;
  /** Bonus from Add-on pieces (incl. the Shield Arm pairing rule). */
  addonBonus: number;
  /** Bonus from Studs upgrades (≥1 studded piece +1, five or more +2). */
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
  "mainArmorId" | "addonArmorIds" | "studdedAddons" | "studdedAddonIds" | "extraArmorIds"
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

/** Load-time normalization for character docs — applied ONCE, at the
 * api/players.ts read boundary, so every card in the app carries the current
 * shape: the legacy `studdedAddons` count becomes per-piece `studdedAddonIds`
 * (first-N worn add-ons; same AC and weight), `extraArmorIds` is deduped to
 * one Extra per subcategory, and `equippedStorageIds` is filtered to known
 * storage items (missing on legacy docs → nothing equipped). `droppedItems`
 * (#136) defaults to [] and sheds malformed entries; TTL expiry stays a
 * render/write concern (lib/inventory.ts activeDropped). Docs are not
 * rewritten — the next save persists the new shape (plus the legacy count
 * mirror for stale clients). */
export function normalizeCard(raw: HunterCard): HunterCard {
  return {
    ...raw,
    studdedAddonIds: studdedAddonIdsOf(raw),
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
  };
}

/** Max Add-on pieces: five, or six when the Main Armor has Balanced Fit
 * (one Add-on doesn't count toward the maximum). */
export function maxAddonPieces(mainArmorId: string | null | undefined): number {
  const main = mainArmorId ? ARMOR_BY_ID[mainArmorId] : undefined;
  return main?.special.startsWith("Balanced Fit") ? 6 : 5;
}

/** A pauldron + vambrace worn on the SAME arm complete one Shield Arm
 * (handbook Armor Types: the pair counts as +2 AC total; only one benefits). */
export function hasShieldArm(addonIds: string[]): boolean {
  const worn = new Set(addonIds);
  return (
    (worn.has("leather-pauldron-right") && worn.has("leather-vambrace-right")) ||
    (worn.has("leather-pauldron-left") && worn.has("leather-vambrace-left"))
  );
}

/** Add-on AC total with the handbook's rules: the Under Layer Jerkin only
 * counts beneath Main Armor, and a completed Shield Arm upgrades its
 * pauldron+vambrace sum (+1) to +2. */
function addonAcBonus(addonIds: string[], hasMain: boolean): number {
  let sum = 0;
  for (const id of addonIds) {
    const piece = ARMOR_BY_ID[id];
    if (!piece || piece.category !== "Add-on Armor") continue;
    if (id === "under-layer-leather-jerkin" && !hasMain) continue;
    sum += piece.acValue;
  }
  if (hasShieldArm(addonIds)) sum += 1;
  return sum;
}

/** Armor Class from the full worn set (Main + Add-ons + Studs) plus Dexterity.
 * Per the handbook, the combined base armor AC decides the Dex category. */
export function armorClass(
  abilities: AbilityScores,
  mainArmorId: string | null,
  addonArmorIds: string[] = [],
  studdedAddonIds: string[] = [],
): ArmorClassResult {
  const dexMod = abilityModifier(abilities.dex);
  const main = mainArmorId ? ARMOR_BY_ID[mainArmorId] : undefined;
  const baseAc = main ? main.acValue : 10;
  // Over-max stacks (e.g. a stored 6-piece set whose Balanced Fit main was
  // swapped away) never contribute beyond the legal allowance.
  const worn = addonArmorIds.slice(0, maxAddonPieces(mainArmorId));
  const addonBonus = addonAcBonus(worn, !!main);
  const studded = studdedAddonIds.filter((id) => worn.includes(id)).length;
  const studBonus = studded >= 5 ? 2 : studded >= 1 ? 1 : 0;
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
  );
}

/** Weight of everything WORN (main + add-ons + extras + 3 lb per Studs
 * upgrade) — worn armor counts toward carried weight. */
export function wornArmorWeight(card: WornArmor): number {
  const ids = [
    ...(card.mainArmorId ? [card.mainArmorId] : []),
    ...(card.addonArmorIds ?? []),
    ...(card.extraArmorIds ?? []),
  ];
  const pieces = ids.reduce((sum, id) => sum + (ARMOR_BY_ID[id]?.weightLb ?? 0), 0);
  const studs = studdedAddonIdsOf(card).length * 3;
  return Math.round((pieces + studs) * 10) / 10;
}

/** Saving-throw modifier for one ability (adds proficiency if the class is proficient). */
export function saveModifier(
  klass: HunterClass,
  abilities: AbilityScores,
  key: AbilityKey,
  level: number,
): number {
  const base = abilityModifier(abilities[key]);
  return base + (klass.savingThrows.includes(key) ? proficiencyBonus(level) : 0);
}

/** Skill-check modifier (ability modifier + proficiency if proficient in the skill). */
export function skillModifier(
  abilities: AbilityScores,
  skillName: string,
  proficient: boolean,
  level: number,
): number {
  const base = abilityModifier(abilities[skillAbility(skillName)]);
  return base + (proficient ? proficiencyBonus(level) : 0);
}

export interface RiteStats {
  ability: AbilityKey;
  abilityLabel: string;
  modifier: number;
  saveDc: number;
  attack: number;
}

/** Deepcaller rite stats: Save DC = 8 + INT + prof; Attack = INT + prof. */
export function riteStats(abilities: AbilityScores, level: number): RiteStats {
  const mod = abilityModifier(abilities.int);
  const prof = proficiencyBonus(level);
  return {
    ability: "int",
    abilityLabel: "Intelligence",
    modifier: mod,
    saveDc: 8 + mod + prof,
    attack: mod + prof,
  };
}

// --- Subclass path helpers ---

/** Sentinel subclass id: the Deepcaller who explicitly STAYS on the base path
 * (rather than leaving it for the Hunter Zealot prestige class). Not a real
 * subclass in the data — it means "decided: no prestige". */
export const DEEPCALLER_STAY_ID = "deepcaller-path";

/** The Hunter Zealot prestige class id (the Deepcaller's only subclass). */
export const ZEALOT_ID = "hunter-zealot";

/** True when this hunter has burned the book — all Deepcaller class features
 * are replaced by the Zealot's (per Burn the Book). */
export function isZealot(card: Pick<HunterCard, "subclassId">): boolean {
  return card.subclassId === ZEALOT_ID;
}

/** Display name for a chosen path, covering the "stay Deepcaller" sentinel. */
export function subclassDisplayName(
  subclassName: string | undefined,
  subclassId: string | null | undefined,
): string | undefined {
  if (subclassId === DEEPCALLER_STAY_ID) return "The Deepcaller Path";
  return subclassName;
}

/** True when this hunter was created the "character sheet way" — a free-form
 * paper sheet (`card.sheet`) instead of the structured builder. */
export function isSheetCard(card: Pick<HunterCard, "sheet">): boolean {
  return !!card.sheet;
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
    abilityMode: "pointbuy",
    skillProficiencies: [],
    mainArmorId: null,
    addonArmorIds: [],
    studdedAddons: 0,
    studdedAddonIds: [],
    extraArmorIds: [],
    transformationLevel: 0,
    activeTransformations: [],
    insight: 0,
    bloodTinge: false,
    preparedWhispers: [],
    coins: 0,
    equippedStorageIds: [],
    notes: "",
    createdAt: now,
    updatedAt: now,
  };
}

/** A fresh card for a hunter built the "character sheet way": the free-form
 * paper sheet (`sheet`) instead of the builder's structured fields. */
export function emptySheetCard(params: {
  ownerUid: string;
  email: string;
  displayName: string;
}): HunterCard {
  return { ...emptyCard(params), sheet: {} };
}
