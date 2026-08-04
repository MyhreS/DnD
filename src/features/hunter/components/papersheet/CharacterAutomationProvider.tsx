import type { ReactNode } from "react";
import {
  MADUHAUSU_FINAL_MAX,
  MADUHAUSU_MAX,
  MADUHAUSU_MIN,
  POINT_BUY_MAX,
  POINT_BUY_MIN,
} from "@/data/abilities";
import { ARMOR_BY_ID } from "@/data/armor";
import { BACKGROUNDS } from "@/data/backgrounds";
import { getClass } from "@/data/classes";
import { ITEMS } from "@/data/items";
import { SKILLS } from "@/data/skills";
import { STORAGE_BY_ITEM_ID } from "@/data/storage";
import { ABILITY_KEYS } from "@/lib/ability-keys";
import { maxAddonPieces } from "@/lib/character";
import { startingKit } from "@/lib/startingEquipment";
import type {
  AbilityKey,
  CustomItem,
  HunterCard,
  InventoryEntry,
  SheetAutomationState,
  SheetData,
} from "@/types";
import { budgetFor, spentFor, type BuyMode } from "../../lib/abilityBuy";
import { automationFor } from "../../lib/characterAutomation";
import { CharacterAutomationContext, type CharacterAutomationController } from "./characterAutomationContext";

type Apply = (fields: SheetData, patch: Partial<HunterCard>) => void;

const ZERO_BONUS = (): Partial<Record<AbilityKey, number>> => Object.fromEntries(
  ABILITY_KEYS.map((key) => [key, 0]),
) as Partial<Record<AbilityKey, number>>;

function mergeInventory(base: InventoryEntry[], additions: InventoryEntry[]): InventoryEntry[] {
  const counts = new Map(base.map((entry) => [entry.itemId, entry.qty]));
  for (const entry of additions) counts.set(entry.itemId, (counts.get(entry.itemId) ?? 0) + entry.qty);
  return [...counts]
    .filter(([, qty]) => qty > 0)
    .map(([itemId, qty]) => ({ itemId, qty }));
}

function removeInventory(base: InventoryEntry[], removals: InventoryEntry[]): InventoryEntry[] {
  return mergeInventory(base, removals.map((entry) => ({ ...entry, qty: -entry.qty })));
}

function withStartingKit(card: HunterCard): HunterCard {
  const state = card.sheetAutomation;
  const withoutOld = removeInventory(card.inventory ?? [], state?.startingKitInventory ?? []);
  const oldCoins = state?.startingKitCoins ?? 0;
  const kit = startingKit(getClass(card.classId), BACKGROUNDS.find((entry) => entry.id === card.backgroundId));
  if (!card.classId || !card.backgroundId) {
    return {
      ...card,
      inventory: withoutOld,
      coins: Math.max(0, (card.coins ?? 0) - oldCoins),
      sheetAutomation: {
        ...state!,
        startingKitApplied: false,
        startingKitInventory: [],
        startingKitCoins: 0,
      },
    };
  }
  return {
    ...card,
    inventory: mergeInventory(withoutOld, kit.inventory),
    coins: Math.max(0, (card.coins ?? 0) - oldCoins) + kit.coins,
    sheetAutomation: {
      ...state!,
      startingKitApplied: true,
      startingKitInventory: kit.inventory,
      startingKitCoins: kit.coins,
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
  if (card.sheetAutomation) return card.sheetAutomation;
  const klass = getClass(card.classId);
  const background = BACKGROUNDS.find((entry) => entry.id === card.backgroundId);
  const backgroundSkills = new Set(background?.skills ?? []);
  const classSkills = card.skillProficiencies.filter(
    (skill) => !backgroundSkills.has(skill) && (klass?.skillChoices.options.includes(skill) ?? false),
  );
  const backgroundBonuses = Object.fromEntries(
    ABILITY_KEYS.map((key) => [
      key,
      Math.max(0, card.abilities[key] - (card.baseAbilities?.[key] ?? card.abilities[key])),
    ]),
  ) as Partial<Record<AbilityKey, number>>;
  const existingWrittenSheet = !!card.sheet && Object.values(card.sheet).some(
    (value) => value === true || (typeof value === "string" && value.trim() !== ""),
  );
  return { version: 1, classSkills, backgroundBonuses, setupComplete: existingWrittenSheet };
}

function finalAbilities(card: HunterCard, bonuses: Partial<Record<AbilityKey, number>>) {
  const base = card.baseAbilities ?? card.abilities;
  return Object.fromEntries(
    ABILITY_KEYS.map((key) => [key, base[key] + (bonuses[key] ?? 0)]),
  ) as HunterCard["abilities"];
}

function automatedFields(card: HunterCard): SheetData {
  const result = automationFor(card);
  const overrides = new Set(card.sheetAutomation?.manualOverrides ?? []);
  return Object.fromEntries(Object.entries(result.fields).filter(([key]) => !overrides.has(key)));
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
  const bonuses = state.backgroundBonuses;
  const mode: BuyMode = card.abilityMode ?? "pointbuy";
  const spent = spentFor(mode, base);
  const pointsLeft = spent === null ? null : budgetFor(mode) - spent;
  const bonusUsed = ABILITY_KEYS.reduce((sum, key) => sum + (bonuses[key] ?? 0), 0);
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
  const meleeWeaponIds = new Set([
    "greatsword", "greataxe", "longsword", "shortsword", "scimitar",
    "hunter-cleaver", "sickle", "handaxe", "dagger",
  ]);
  const finesseOrLightIds = new Set([
    "shortsword", "scimitar", "sickle", "handaxe", "dagger", "pistol",
  ]);
  const masteryWeapons = ITEMS.filter((item) => {
    if (item.category !== "Weapon") return false;
    if (klass?.id === "stalker") return finesseOrLightIds.has(item.id);
    if (/Melee weapons/i.test(masteryFeature?.text ?? "")) return meleeWeaponIds.has(item.id);
    return true;
  });
  const whisperLimit = (
    klass?.caster
      ? Number(klass.progression.find((row) => row.level === card.level)?.extras["Prepared Whispers"] ?? 0)
      : 0
  ) + (background?.feat === "Listener" ? 1 : 0);

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
    onApply(automatedFields(next), patch);
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
    commit({
      backgroundId,
      background: nextBackground?.name ?? "",
      feat: nextBackground?.feat ?? null,
      featSkills: nextBackground?.feat === "Skilled" ? card.featSkills ?? [] : [],
      skillProficiencies: [...new Set([...state.classSkills, ...(nextBackground?.skills ?? [])])],
      abilities: finalAbilities(card, nextBonuses),
      sheetAutomation: { ...state, backgroundBonuses: nextBonuses },
    }, true);
  }

  function toggleClassSkill(skill: string) {
    if (!klass) return;
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

  function setBase(key: AbilityKey, value: number) {
    const nextBase = { ...base, [key]: value };
    if (mode === "maduhausu" && value + (bonuses[key] ?? 0) > MADUHAUSU_FINAL_MAX) return;
    const nextSpent = spentFor(mode, nextBase);
    if (nextSpent === null || nextSpent > budgetFor(mode)) return;
    commit({
      baseAbilities: nextBase,
      abilities: finalAbilities({ ...card, baseAbilities: nextBase }, bonuses),
    });
  }

  function setBonus(key: AbilityKey, value: number) {
    if (!background?.abilityScores.includes(key)) return;
    const nextBonuses = { ...bonuses, [key]: value };
    const nextTotal = ABILITY_KEYS.reduce(
      (sum, ability) => sum + (nextBonuses[ability] ?? 0),
      0,
    );
    if (
      nextTotal > 3
      || base[key] + value > 20
      || (mode === "maduhausu" && base[key] + value > MADUHAUSU_FINAL_MAX)
    ) return;
    commit({
      abilities: finalAbilities(card, nextBonuses),
      sheetAutomation: { ...state, backgroundBonuses: nextBonuses },
    });
  }

  function switchMode(nextMode: BuyMode) {
    if (nextMode === mode) return;
    const min = nextMode === "maduhausu" ? MADUHAUSU_MIN : POINT_BUY_MIN;
    const max = nextMode === "maduhausu" ? MADUHAUSU_MAX : POINT_BUY_MAX;
    const nextBase = Object.fromEntries(
      ABILITY_KEYS.map((key) => [key, Math.max(min, Math.min(max, base[key]))]),
    ) as HunterCard["abilities"];
    commit({
      abilityMode: nextMode,
      baseAbilities: nextBase,
      abilities: finalAbilities({ ...card, baseAbilities: nextBase }, bonuses),
    });
  }

  function changeQty(id: string, delta: number) {
    commit({ inventory: mergeInventory(card.inventory ?? [], [{ itemId: id, qty: delta }]) });
  }

  function toggleStorage(id: string) {
    const equipped = card.equippedStorageIds ?? [];
    const isEquipped = equipped.includes(id);
    const definition = STORAGE_BY_ITEM_ID[id];
    const conflicts = isEquipped || !definition?.requires ? [] : equipped.filter((entry) => {
      const other = STORAGE_BY_ITEM_ID[entry]?.requires;
      return !!other && other.kind === definition.requires?.kind && other.location === definition.requires?.location;
    });
    commit({
      equippedStorageIds: isEquipped
        ? equipped.filter((entry) => entry !== id)
        : [...equipped.filter((entry) => !conflicts.includes(entry)), id],
      inventory: mergeInventory(card.inventory ?? [], [
        { itemId: id, qty: isEquipped ? 1 : -1 },
        ...conflicts.map((itemId) => ({ itemId, qty: 1 })),
      ]),
    });
  }

  function setExtra(subcategory: string, id: string) {
    const kept = (card.extraArmorIds ?? []).filter(
      (entry) => ARMOR_BY_ID[entry]?.subcategory !== subcategory,
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
        : {
          addonArmorIds: (card.addonArmorIds ?? []).length < maxAddonPieces(card.mainArmorId, customItems)
            ? [...(card.addonArmorIds ?? []), item.id]
            : card.addonArmorIds,
        }),
    });
  }

  function addCustomItem(draft: Parameters<CharacterAutomationController["addCustomItem"]>[0]) {
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
    };
    if (!item.name) return;
    const next: HunterCard = {
      ...card,
      customItems: [...(card.customItems ?? []), item],
      inventory: mergeInventory(card.inventory ?? [], [{ itemId: item.id, qty: 1 }]),
      sheetAutomation: state,
    };
    const weaponFields: SheetData = {};
    if (item.category === "Weapon") {
      const row = Array.from({ length: 8 }, (_, index) => index).find((index) => {
        const value = card.sheet?.[`wd_${index}_0`];
        return typeof value !== "string" || value.trim() === "";
      });
      if (row != null) {
        weaponFields[`wd_${row}_0`] = item.name;
        weaponFields[`wd_${row}_1`] = item.attackBonus ?? "";
        weaponFields[`wd_${row}_2`] = item.damage ?? "";
        weaponFields[`wd_${row}_3`] = item.weaponNotes ?? item.note ?? "";
      }
    }
    onApply(
      { ...automatedFields(next), ...weaponFields },
      { customItems: next.customItems, inventory: next.inventory, sheetAutomation: state },
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
    bonusUsed,
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
    setBase,
    setBonus,
    switchMode,
    changeQty,
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
