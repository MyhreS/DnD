import type { ReactNode } from "react";
import { BACKGROUNDS } from "@/data/backgrounds";
import { getClass } from "@/data/classes";
import { ITEMS } from "@/data/items";
import { SKILLS } from "@/data/skills";
import { STORAGE_BY_ITEM_ID } from "@/data/storage";
import { WEAPON_FACTS } from "@/data/weapons";
import { ABILITY_KEYS } from "@/lib/ability-keys";
import { maxAddonPieces } from "@/lib/character";
import { armorFor } from "@/lib/customItems";
import { startingKit } from "@/lib/startingEquipment";
import { BLOODVIAL_ITEM_ID } from "@/data/bloodvial";
import type {
  AbilityKey,
  BloodvialPurity,
  CustomItem,
  HunterCard,
  InventoryEntry,
  SheetAutomationState,
  SheetData,
  SlotAssignment,
} from "@/types";
import {
  abilityBuySummary,
  backgroundBonusSummary,
  scoreRangeFor,
  type BuyMode,
} from "../../lib/abilityBuy";
import { automationFor, calculatedSheetFields } from "../../lib/characterAutomation";
import { CharacterAutomationContext, type CharacterAutomationController, type SlotReplacement } from "./characterAutomationContext";

type Apply = (fields: SheetData, patch: Partial<HunterCard>) => void;

const ZERO_BONUS = (): Partial<Record<AbilityKey, number>> => Object.fromEntries(
  ABILITY_KEYS.map((key) => [key, 0]),
) as Partial<Record<AbilityKey, number>>;

function mergeInventory(base: InventoryEntry[], additions: InventoryEntry[]): InventoryEntry[] {
  const counts = new Map(base.map((entry) => [entry.itemId, entry.qty]));
  // Per-line extras (such as a Bloodvial's purity) survive quantity changes.
  const extras = new Map(base.map((entry) => [entry.itemId, entry.purity]));
  for (const entry of additions) {
    counts.set(entry.itemId, (counts.get(entry.itemId) ?? 0) + entry.qty);
    if (entry.purity) extras.set(entry.itemId, entry.purity);
  }
  return [...counts]
    .filter(([, qty]) => qty > 0)
    .map(([itemId, qty]) => {
      const purity = extras.get(itemId);
      return purity ? { itemId, qty, purity } : { itemId, qty };
    });
}

function removeInventory(base: InventoryEntry[], removals: InventoryEntry[]): InventoryEntry[] {
  return mergeInventory(base, removals.map((entry) => ({ ...entry, qty: -entry.qty })));
}

function withStartingKit(card: HunterCard): HunterCard {
  const state = card.sheetAutomation;
  const withoutOld = removeInventory(card.inventory ?? [], state?.startingKitInventory ?? []);
  const oldCoins = state?.startingKitCoins ?? 0;
  const grantedExtras = state?.startingKitExtraArmorIds ?? [];
  const extrasWithoutOld = (card.extraArmorIds ?? []).filter((id) => !grantedExtras.includes(id));
  const kit = startingKit(getClass(card.classId), BACKGROUNDS.find((entry) => entry.id === card.backgroundId));
  // A class kit is mandatory in its own right, so grant it as soon as the
  // player chooses a class. Background equipment is folded in later when a
  // background is selected; requiring both here left a new hunter temporarily
  // without their class-defining gear (such as the Deepcaller's robe and book).
  if (!card.classId) {
    return {
      ...card,
      inventory: withoutOld,
      coins: Math.max(0, (card.coins ?? 0) - oldCoins),
      extraArmorIds: extrasWithoutOld,
      sheetAutomation: {
        ...state!,
        startingKitApplied: false,
        startingKitInventory: [],
        startingKitCoins: 0,
        startingKitExtraArmorIds: [],
      },
    };
  }
  return {
    ...card,
    inventory: mergeInventory(withoutOld, kit.inventory),
    coins: Math.max(0, (card.coins ?? 0) - oldCoins) + kit.coins,
    extraArmorIds: [...extrasWithoutOld, ...kit.extraArmorIds.filter((id) => !extrasWithoutOld.includes(id))],
    sheetAutomation: {
      ...state!,
      startingKitApplied: true,
      startingKitInventory: kit.inventory,
      startingKitCoins: kit.coins,
      startingKitExtraArmorIds: kit.extraArmorIds,
      legacyEquipment: [
        ...(state?.legacyEquipment ?? []),
        ...kit.unmatched.map((name) => ({
          name,
          carrying: "Needs catalog data",
          slot: "—",
          weight: "—",
        })),
      ],
    },
  };
}

function normalizedAutomation(card: HunterCard): SheetAutomationState {
  if (card.sheetAutomation) {
    return {
      ...card.sheetAutomation,
      version: 3,
      backgroundBonuses: card.sheetAutomation.backgroundBonuses ?? ZERO_BONUS(),
    };
  }
  const klass = getClass(card.classId);
  const background = BACKGROUNDS.find((entry) => entry.id === card.backgroundId);
  const backgroundSkills = new Set(background?.skills ?? []);
  const classSkills = card.skillProficiencies.filter(
    (skill) => !backgroundSkills.has(skill) && (klass?.skillChoices.options.includes(skill) ?? false),
  );
  const backgroundBonuses = Object.fromEntries(ABILITY_KEYS.map((key) => [
    key,
    Math.max(0, card.abilities[key] - (card.baseAbilities?.[key] ?? card.abilities[key])),
  ])) as Partial<Record<AbilityKey, number>>;
  const existingWrittenSheet = !!card.sheet && Object.values(card.sheet).some(
    (value) => value === true || (typeof value === "string" && value.trim() !== ""),
  );
  return { version: 3, classSkills, backgroundBonuses, setupComplete: existingWrittenSheet };
}

function finalAbilities(
  card: HunterCard,
  bonuses: Partial<Record<AbilityKey, number>>,
  levelBonuses = card.sheetAutomation?.levelAbilityBonuses ?? {},
) {
  const base = card.baseAbilities ?? card.abilities;
  return Object.fromEntries(
    ABILITY_KEYS.map((key) => [
      key,
      base[key] + (bonuses[key] ?? 0) + Object.values(levelBonuses).reduce((sum, entry) => sum + (entry[key] ?? 0), 0),
    ]),
  ) as HunterCard["abilities"];
}

export function CharacterAutomationProvider({
  card,
  onApply,
  readOnly,
  children,
}: {
  card: HunterCard;
  onApply: Apply;
  readOnly: boolean;
  children: ReactNode;
}) {
  const result = automationFor(card);
  const state = normalizedAutomation(card);
  const klass = getClass(card.classId);
  const background = BACKGROUNDS.find((entry) => entry.id === card.backgroundId);
  const base = card.baseAbilities ?? card.abilities;
  const bonuses = state.backgroundBonuses ?? ZERO_BONUS();
  const mode: BuyMode = card.abilityMode ?? "pointbuy";
  const buySummary = abilityBuySummary(mode, base);
  const pointsLeft = buySummary.pointsLeft;
  const bonusSummary = backgroundBonusSummary(background?.abilityScores ?? [], bonuses, base, mode);
  // The three classes that grant Expertise do not grant the same number at
  // each occurrence. Keep the class-board amounts explicit instead of
  // assuming every row means two choices.
  const expertiseLimit = klass?.id === "scout"
    ? (card.level >= 2 ? 1 : 0) + (card.level >= 9 ? 2 : 0)
    : klass?.id === "stalker"
      ? (card.level >= 1 ? 2 : 0) + (card.level >= 6 ? 2 : 0)
      : klass?.id === "warden"
        ? (card.level >= 2 ? 2 : 0) + (card.level >= 9 ? 2 : 0)
        : 0;
  const masteryFeature = klass?.features?.find(
    (feature) => feature.name === "Weapon Mastery" && feature.level <= card.level,
  );
  const masteryWord = masteryFeature?.text.match(/mastery properties of (two|three|four|five|six)/i)?.[1]?.toLowerCase();
  const masteryFromTable = Number(
    klass?.progression.find((row) => row.level === card.level)?.extras["Weapon Mastery"] ?? 0,
  );
  const masteryCount = masteryFromTable || (masteryWord
    ? ({ two: 2, three: 3, four: 4, five: 5, six: 6 }[masteryWord] ?? 0)
    : 0);
  // Mastery options are derived from the weapons table rather than listed by
  // hand. The Stalker is proficient with Simple weapons and Martial weapons
  // with the Finesse or Light property (core-rulebook.txt [page 63]); a
  // "Melee weapons" mastery feature covers every melee row ([page 87]).
  const masteryWeapons = ITEMS.filter((item) => {
    if (item.category !== "Weapon") return false;
    const facts = WEAPON_FACTS[item.id];
    if (!facts) return false;
    if (klass?.id === "stalker") {
      return facts.category === "Simple"
        || (facts.category === "Martial" && /Finesse|Light/.test(facts.properties));
    }
    if (/Melee weapons/i.test(masteryFeature?.text ?? "")) return facts.attack === "Melee";
    return true;
  });
  // Zealot Whispers — core-rulebook.txt [page 76]: one additional prepared
  // Whisper from level 3.
  const whisperLimit = (
    klass?.caster
      ? Number(klass.progression.find((row) => row.level === card.level)?.extras["Prepared Whispers"] ?? 0)
      : 0
  ) + (background?.feat === "Listener" ? 1 : 0)
    + (card.subclassId === "hunter-zealot" && card.level >= 3 ? 1 : 0);

  function commit(partial: Partial<HunterCard>, refreshKit = false) {
    if (readOnly) return;
    let next: HunterCard = {
      ...card,
      ...partial,
      sheetAutomation: { ...state, ...(partial.sheetAutomation ?? {}) },
    };
    if (refreshKit) next = withStartingKit(next);
    const patch: Partial<HunterCard> = { ...partial, sheetAutomation: next.sheetAutomation };
    if (refreshKit) {
      patch.inventory = next.inventory;
      patch.coins = next.coins;
    }
    onApply(calculatedSheetFields(next), patch);
  }

  function chooseClass(classId: string) {
    const nextClass = getClass(classId);
    const classSkills = state.classSkills.filter((skill) => nextClass?.skillChoices.options.includes(skill));
    commit({
      classId,
      level: card.classId ? card.level : 1,
      lastSeenLevel: card.classId ? card.lastSeenLevel : 0,
      subclassId: null,
      skillProficiencies: [...new Set([...classSkills, ...(background?.skills ?? [])])],
      sheetAutomation: { ...state, classSkills },
    }, true);
  }

  function chooseBackground(backgroundId: string) {
    const nextBackground = BACKGROUNDS.find((entry) => entry.id === backgroundId);
    const nextBonuses = backgroundId === card.backgroundId ? bonuses : ZERO_BONUS();
    const nextClassSkills = state.classSkills.filter((skill) => !nextBackground?.skills.includes(skill));
    commit({
      backgroundId,
      background: nextBackground?.name ?? "",
      feat: nextBackground?.feat ?? null,
      featSkills: nextBackground?.feat === "Skilled" ? card.featSkills ?? [] : [],
      skillProficiencies: [...new Set([...nextClassSkills, ...(nextBackground?.skills ?? [])])],
      abilities: finalAbilities(card, nextBonuses),
      sheetAutomation: { ...state, classSkills: nextClassSkills, backgroundBonuses: nextBonuses },
    }, true);
  }

  function toggleClassSkill(skill: string) {
    if (!klass || background?.skills.includes(skill)) return;
    const classSkills = state.classSkills.includes(skill)
      ? state.classSkills.filter((entry) => entry !== skill)
      : state.classSkills.length < klass.skillChoices.count
        ? [...state.classSkills, skill]
        : state.classSkills;
    commit({
      skillProficiencies: [...new Set([...classSkills, ...(background?.skills ?? [])])],
      sheetAutomation: { ...state, classSkills },
    });
  }

  function toggleFeatSkill(choice: string) {
    const selected = card.featSkills ?? [];
    const featSkills = selected.includes(choice)
      ? selected.filter((entry) => entry !== choice)
      : selected.length < 3 ? [...selected, choice] : selected;
    const skillPicks = featSkills.filter((entry) => SKILLS.some((skill) => skill.name === entry));
    commit({
      featSkills,
      skillProficiencies: [...new Set([
        ...state.classSkills,
        ...(background?.skills ?? []),
        ...skillPicks,
      ])],
    });
  }

  function toggleExpertise(skill: string) {
    const selected = state.expertiseSkills ?? [];
    const expertiseSkills = selected.includes(skill)
      ? selected.filter((entry) => entry !== skill)
      : selected.length < expertiseLimit ? [...selected, skill] : selected;
    commit({ sheetAutomation: { ...state, expertiseSkills } });
  }

  function toggleMastery(weapon: string) {
    const selected = state.weaponMasteries ?? [];
    const weaponMasteries = selected.includes(weapon)
      ? selected.filter((entry) => entry !== weapon)
      : selected.length < masteryCount ? [...selected, weapon] : selected;
    commit({ sheetAutomation: { ...state, weaponMasteries } });
  }

  function toggleWhisper(id: string) {
    const selected = card.preparedWhispers ?? [];
    const preparedWhispers = selected.includes(id)
      ? selected.filter((entry) => entry !== id)
      : selected.length < whisperLimit ? [...selected, id] : selected;
    commit({ preparedWhispers });
  }

  function setLevelChoice(key: string, value: string) {
    const levelChoices = { ...(state.levelChoices ?? {}) };
    const choice = value.trim();
    if (choice) levelChoices[key] = value;
    else delete levelChoices[key];
    commit({ sheetAutomation: { ...state, levelChoices } });
  }

  function setUpgradeFeat(key: string, feat: string, nextBonuses: Partial<Record<AbilityKey, number>>) {
    const levelFeats = { ...(state.levelFeats ?? {}) };
    const levelAbilityBonuses = { ...(state.levelAbilityBonuses ?? {}) };
    const levelChoices = { ...(state.levelChoices ?? {}) };
    if (feat) {
      levelFeats[key] = feat;
      levelAbilityBonuses[key] = nextBonuses;
      const increases = ABILITY_KEYS.filter((ability) => (nextBonuses[ability] ?? 0) > 0)
        .map((ability) => `${ability.toUpperCase()} +${nextBonuses[ability]}`);
      levelChoices[key] = [feat, increases.join(", ")].filter(Boolean).join(" — ");
    } else {
      delete levelFeats[key];
      delete levelAbilityBonuses[key];
      delete levelChoices[key];
    }
    const managedBefore = new Set(Object.values(state.levelFeats ?? {}));
    const unmanagedFeats = (card.feats ?? []).filter((name) => !managedBefore.has(name));
    const nextState = { ...state, levelChoices, levelFeats, levelAbilityBonuses };
    commit({
      feats: [...new Set([...unmanagedFeats, ...Object.values(levelFeats)])],
      abilities: finalAbilities(card, bonuses, levelAbilityBonuses),
      sheetAutomation: nextState,
    });
  }

  function setBase(key: AbilityKey, value: number) {
    const nextBase = { ...base, [key]: value };
    const nextBuy = abilityBuySummary(mode, nextBase);
    const nextBonus = backgroundBonusSummary(background?.abilityScores ?? [], bonuses, nextBase, mode);
    if (!nextBuy.valid || !nextBonus.valid) return;
    commit({
      baseAbilities: nextBase,
      abilities: finalAbilities({ ...card, baseAbilities: nextBase }, bonuses),
    });
  }

  function setBonus(key: AbilityKey, value: number) {
    const nextBonuses = { ...bonuses, [key]: value };
    const nextSummary = backgroundBonusSummary(background?.abilityScores ?? [], nextBonuses, base, mode);
    if (!nextSummary.valid) return;
    commit({
      abilities: finalAbilities(card, nextBonuses),
      sheetAutomation: { ...state, backgroundBonuses: nextBonuses },
    });
  }

  function switchMode(nextMode: BuyMode) {
    if (nextMode === mode) return;
    const { minimum, maximum } = scoreRangeFor(nextMode);
    const nextBase = Object.fromEntries(ABILITY_KEYS.map((key) => [
      key,
      Math.max(minimum, Math.min(maximum, base[key])),
    ])) as HunterCard["abilities"];
    const nextBonus = backgroundBonusSummary(background?.abilityScores ?? [], bonuses, nextBase, nextMode);
    const nextBonuses = nextBonus.valid ? bonuses : ZERO_BONUS();
    commit({
      abilityMode: nextMode,
      baseAbilities: nextBase,
      abilities: finalAbilities({ ...card, baseAbilities: nextBase }, nextBonuses),
      sheetAutomation: { ...state, backgroundBonuses: nextBonuses },
    });
  }

  function changeQty(id: string, delta: number) {
    const inventory = mergeInventory(card.inventory ?? [], [{ itemId: id, qty: delta }]);
    const nextQty = inventory.find((entry) => entry.itemId === id)?.qty ?? 0;
    const keptAssignments = (card.slotAssignments?.[id] ?? []).filter(Boolean).slice(0, nextQty);
    const slotAssignments = { ...(card.slotAssignments ?? {}) };
    if (keptAssignments.length) slotAssignments[id] = keptAssignments;
    else delete slotAssignments[id];
    commit({ inventory, slotAssignments });
  }

  /** Bloodvial purity, core-rulebook.txt [page 123]. Stored on the existing
   * `blood-vial` inventory line — no separate item id. */
  function setBloodvialPurity(purity: BloodvialPurity) {
    const inventory = (card.inventory ?? []).map((entry) => (
      entry.itemId === BLOODVIAL_ITEM_ID ? { ...entry, purity } : entry
    ));
    commit({ inventory });
  }

  function slotStateWithout(replace?: SlotReplacement) {
    let inventory = card.inventory ?? [];
    let equippedStorageIds = card.equippedStorageIds ?? [];
    const slotAssignments = Object.fromEntries(
      Object.entries(card.slotAssignments ?? {}).flatMap(([itemId, values]) => {
        const assignments = [...values];
        if (replace?.storage) {
          for (let index = 0; index < assignments.length; index += 1) {
            if (assignments[index]?.startsWith(`storage:${replace.id}:`)) assignments[index] = null;
          }
        } else if (itemId === replace?.id && replace.index != null) assignments[replace.index] = null;
        while (assignments.length && !assignments[assignments.length - 1]) assignments.pop();
        return assignments.length ? [[itemId, assignments]] : [];
      }),
    );
    if (replace?.storage) {
      equippedStorageIds = equippedStorageIds.filter((id) => id !== replace.id);
      inventory = mergeInventory(inventory, [{ itemId: replace.id, qty: 1 }]);
    }
    return { inventory, equippedStorageIds, slotAssignments };
  }

  function addCatalogItemToSlot(id: string, target: SlotAssignment, replace?: SlotReplacement) {
    const base = slotStateWithout(replace);
    const index = base.inventory.find((entry) => entry.itemId === id)?.qty ?? 0;
    const assignments = [...(base.slotAssignments[id] ?? [])];
    assignments[index] = target;
    commit({
      inventory: mergeInventory(base.inventory, [{ itemId: id, qty: 1 }]),
      equippedStorageIds: base.equippedStorageIds,
      slotAssignments: { ...base.slotAssignments, [id]: assignments },
    });
  }

  function setSlotAssignment(id: string, index: number, location: SlotAssignment | null, replace?: SlotReplacement) {
    if (index < 0) return;
    const base = slotStateWithout(replace);
    const assignments: Array<SlotAssignment | null> = [...(base.slotAssignments[id] ?? [])];
    if (location) assignments[index] = location;
    else assignments[index] = null;
    const cleaned = assignments.slice(0, Math.max(0, (card.inventory ?? []).find((entry) => entry.itemId === id)?.qty ?? 0));
    while (cleaned.length && !cleaned[cleaned.length - 1]) cleaned.pop();
    const slotAssignments = { ...base.slotAssignments };
    if (cleaned.length) slotAssignments[id] = cleaned;
    else delete slotAssignments[id];
    commit({ slotAssignments, inventory: base.inventory, equippedStorageIds: base.equippedStorageIds });
  }

  function toggleStorage(id: string, replace?: SlotReplacement) {
    const base = slotStateWithout(replace);
    const equipped = base.equippedStorageIds;
    const isEquipped = equipped.includes(id);
    const definition = STORAGE_BY_ITEM_ID[id];
    const conflicts = isEquipped || !definition?.requires ? [] : equipped.filter((entry) => {
      const other = STORAGE_BY_ITEM_ID[entry]?.requires;
      return !!other && other.kind === definition.requires?.kind && other.location === definition.requires?.location;
    });
    const removedStorageIds = isEquipped ? [id] : conflicts;
    const vacatedLocation = !isEquipped ? definition?.requires?.location : undefined;
    const slotAssignments = Object.fromEntries(
      Object.entries(base.slotAssignments).flatMap(([itemId, assignments]) => {
        if (itemId === id || conflicts.includes(itemId)) return [];
        const cleaned = assignments.map((assignment) => {
          if (assignment === vacatedLocation) return null;
          if (removedStorageIds.some((storageId) => assignment?.startsWith(`storage:${storageId}:`))) return null;
          return assignment;
        });
        while (cleaned.length && !cleaned[cleaned.length - 1]) cleaned.pop();
        return cleaned.length ? [[itemId, cleaned]] : [];
      }),
    );
    commit({
      equippedStorageIds: isEquipped
        ? equipped.filter((entry) => entry !== id)
        : [...equipped.filter((entry) => !conflicts.includes(entry)), id],
      inventory: mergeInventory(base.inventory, [
        { itemId: id, qty: isEquipped ? 1 : -1 },
        ...conflicts.map((itemId) => ({ itemId, qty: 1 })),
      ]),
      slotAssignments,
    });
  }

  function setExtra(subcategory: string, id: string) {
    const kept = (card.extraArmorIds ?? []).filter(
      (entry) => armorFor(card, entry)?.subcategory !== subcategory,
    );
    commit({ extraArmorIds: id ? [...kept, id] : kept });
  }

  function restoreCalculated(key: string) {
    const manualOverrides = (state.manualOverrides ?? []).filter((entry) => entry !== key);
    const next = { ...card, sheetAutomation: { ...state, manualOverrides } };
    const value = automationFor(next).fields[key];
    if (value !== undefined) onApply({ [key]: value }, { sheetAutomation: next.sheetAutomation });
  }

  function addCustomArmor(draft: Parameters<CharacterAutomationController["addCustomArmor"]>[0]) {
    const item: CustomItem = {
      id: `found-${crypto.randomUUID()}`,
      name: draft.name.trim(),
      category: "Armor",
      carry: "Significant",
      weightLb: Math.max(0, draft.weightLb),
      note: draft.note.trim() || undefined,
      source: "found",
      armorCategory: draft.armorCategory,
      armorSubcategory: draft.armorSubcategory,
      acValue: Math.max(0, Math.floor(draft.acValue)),
      unique: true,
    };
    if (!item.name) return;
    const customItems = [...(card.customItems ?? []), item];
    commit({
      customItems,
      ...(item.armorCategory === "Main Armor"
        ? {
          mainArmorId: item.id,
          addonArmorIds: (card.addonArmorIds ?? []).slice(0, maxAddonPieces(item.id, customItems)),
        }
        : item.armorCategory === "Extra" && item.armorSubcategory
          ? {
            extraArmorIds: [
              ...(card.extraArmorIds ?? []).filter((id) => armorFor(card, id)?.subcategory !== item.armorSubcategory),
              item.id,
            ],
          }
          : (() => {
            const limit = maxAddonPieces(card.mainArmorId, customItems);
            const selected = [...(card.addonArmorIds ?? [])].slice(0, limit);
            const index = draft.addonIndex ?? selected.length;
            if (index < limit) selected[index] = item.id;
            return { addonArmorIds: selected.filter(Boolean).slice(0, limit) };
          })()),
    });
  }

  function addCustomItem(
    draft: Parameters<CharacterAutomationController["addCustomItem"]>[0],
    target?: SlotAssignment,
    replace?: SlotReplacement,
  ) {
    const item: CustomItem = {
      id: `found-${crypto.randomUUID()}`,
      name: draft.name.trim(),
      category: draft.category,
      carry: draft.carry,
      weightLb: Math.max(0, draft.weightLb),
      note: draft.note.trim() || undefined,
      source: "found",
      unique: true,
      attackBonus: draft.attackBonus.trim() || undefined,
      damage: draft.damage.trim() || undefined,
      weaponNotes: draft.weaponNotes.trim() || undefined,
      catalogBaseId: draft.catalogBaseId,
    };
    if (!item.name) return;
    const base = slotStateWithout(replace);
    const next: HunterCard = {
      ...card,
      customItems: [...(card.customItems ?? []), item],
      inventory: mergeInventory(base.inventory, [{ itemId: item.id, qty: 1 }]),
      equippedStorageIds: base.equippedStorageIds,
      ...(target ? { slotAssignments: { ...base.slotAssignments, [item.id]: [target] } } : {}),
      sheetAutomation: state,
    };
    // The WEAPON DAMAGE table is now derived for every carried weapon —
    // catalog and custom alike — inside `characterAutomation`, so this flow no
    // longer hand-places a row.
    onApply(
      calculatedSheetFields(next),
      { customItems: next.customItems, inventory: next.inventory, equippedStorageIds: next.equippedStorageIds, slotAssignments: next.slotAssignments, sheetAutomation: state },
    );
  }

  const value: CharacterAutomationController = {
    card,
    readOnly,
    result,
    state,
    klass,
    background,
    base,
    bonuses,
    mode,
    pointsLeft,
    bonusUsed: bonusSummary.used,
    bonusComplete: bonusSummary.complete,
    expertiseLimit,
    masteryFeature,
    masteryCount,
    masteryWeapons,
    whisperLimit,
    chooseClass,
    chooseBackground,
    chooseLevel: (level) => commit({ level }),
    chooseSubclass: (subclassId) => commit({ subclassId: subclassId || null }),
    toggleClassSkill,
    toggleFeatSkill,
    toggleExpertise,
    toggleMastery,
    toggleWhisper,
    setLevelChoice,
    setUpgradeFeat,
    setBase,
    setBonus,
    switchMode,
    changeQty,
    setBloodvialPurity,
    addCatalogItemToSlot,
    setSlotAssignment,
    toggleStorage,
    chooseMainArmor: (id) => commit({
      mainArmorId: id || null,
      addonArmorIds: (card.addonArmorIds ?? []).slice(0, maxAddonPieces(id || null, card.customItems)),
      studdedAddonIds: (card.studdedAddonIds ?? []).filter((entry) => (
        (card.addonArmorIds ?? [])
          .slice(0, maxAddonPieces(id || null, card.customItems))
          .includes(entry)
      )),
    }),
    setAddonArmorAt: (index, id) => {
      const limit = maxAddonPieces(card.mainArmorId, card.customItems);
      if (index < 0 || index >= limit) return;
      const selected = [...(card.addonArmorIds ?? [])].slice(0, limit);
      const previous = selected[index];
      const withoutNext = id ? selected.filter((entry) => entry !== id) : selected;
      if (id) withoutNext[index] = id;
      else withoutNext.splice(index, 1);
      const addonArmorIds = withoutNext.filter(Boolean).slice(0, limit);
      commit({
        addonArmorIds,
        studdedAddonIds: (card.studdedAddonIds ?? []).filter((entry) => (
          entry !== previous && addonArmorIds.includes(entry)
        )),
      });
    },
    toggleAddonArmor: (id) => {
      const selected = card.addonArmorIds ?? [];
      commit({
        addonArmorIds: selected.includes(id)
          ? selected.filter((entry) => entry !== id)
          : selected.length < maxAddonPieces(card.mainArmorId, card.customItems) ? [...selected, id] : selected,
      });
    },
    toggleStuds: (id) => {
      const selected = card.studdedAddonIds ?? [];
      commit({
        studdedAddonIds: selected.includes(id)
          ? selected.filter((entry) => entry !== id)
          : [...selected, id],
      });
    },
    setExtra,
    addCustomArmor,
    addCustomItem,
    restoreCalculated,
    finishSetup: () => commit({ sheetAutomation: { ...state, setupComplete: true } }),
  };

  return (
    <CharacterAutomationContext.Provider value={value}>
      {children}
    </CharacterAutomationContext.Provider>
  );
}
