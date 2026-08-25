import { createContext, useContext } from "react";
import type { BACKGROUNDS } from "@/data/backgrounds";
import type { getClass } from "@/data/classes";
import type { ITEMS } from "@/data/items";
import type { AbilityKey, CarrySignificance, ExtraSubcategory, HunterCard, LevelFeature, SheetAutomationState, SlotAssignment } from "@/types";
import type { BuyMode } from "../../lib/abilityBuy";
import type { automationFor } from "../../lib/characterAutomation";

export interface SlotReplacement {
  id: string;
  index?: number;
  storage?: boolean;
}

export interface CharacterAutomationController {
  card: HunterCard;
  readOnly: boolean;
  result: ReturnType<typeof automationFor>;
  state: SheetAutomationState;
  klass: ReturnType<typeof getClass>;
  background: (typeof BACKGROUNDS)[number] | undefined;
  base: HunterCard["abilities"];
  bonuses: Partial<Record<AbilityKey, number>>;
  mode: BuyMode;
  pointsLeft: number | null;
  bonusUsed: number;
  bonusComplete: boolean;
  expertiseLimit: number;
  masteryFeature: LevelFeature | undefined;
  masteryCount: number;
  masteryWeapons: typeof ITEMS;
  whisperLimit: number;
  chooseClass: (classId: string) => void;
  chooseBackground: (backgroundId: string) => void;
  chooseLevel: (level: number) => void;
  chooseSubclass: (subclassId: string) => void;
  toggleClassSkill: (skill: string) => void;
  toggleFeatSkill: (choice: string) => void;
  toggleExpertise: (skill: string) => void;
  toggleMastery: (weapon: string) => void;
  toggleWhisper: (id: string) => void;
  setLevelChoice: (key: string, value: string) => void;
  setUpgradeFeat: (key: string, feat: string, bonuses: Partial<Record<AbilityKey, number>>) => void;
  setBase: (key: AbilityKey, value: number) => void;
  setBonus: (key: AbilityKey, value: number) => void;
  switchMode: (mode: BuyMode) => void;
  changeQty: (id: string, delta: number) => void;
  addCatalogItemToSlot: (id: string, target: SlotAssignment, replace?: SlotReplacement) => void;
  setSlotAssignment: (id: string, index: number, location: SlotAssignment | null, replace?: SlotReplacement) => void;
  toggleStorage: (id: string, replace?: SlotReplacement) => void;
  chooseMainArmor: (id: string) => void;
  setAddonArmorAt: (index: number, id: string) => void;
  toggleAddonArmor: (id: string) => void;
  toggleStuds: (id: string) => void;
  setExtra: (subcategory: string, id: string) => void;
  addCustomArmor: (draft: {
    name: string;
    armorCategory: "Main Armor" | "Add-on Armor" | "Extra";
    armorSubcategory?: ExtraSubcategory;
    addonIndex?: number;
    acValue: number;
    weightLb: number;
    note: string;
  }) => void;
  addCustomItem: (draft: {
    name: string;
    category: "Weapon" | "Gear";
    carry: CarrySignificance;
    weightLb: number;
    note: string;
    attackBonus: string;
    damage: string;
    weaponNotes: string;
    catalogBaseId?: string;
  }, target?: SlotAssignment, replace?: SlotReplacement) => void;
  restoreCalculated: (key: string) => void;
  finishSetup: () => void;
}

export const CharacterAutomationContext = createContext<CharacterAutomationController | null>(null);

export function useCharacterAutomation(): CharacterAutomationController {
  const value = useContext(CharacterAutomationContext);
  if (!value) throw new Error("Character automation controls must be inside CharacterAutomationProvider");
  return value;
}
