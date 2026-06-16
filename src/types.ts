// Shared domain types for Catacombs & Starspawns.

export type AbilityKey = "str" | "dex" | "con" | "int" | "wis" | "cha";

export type ArmorTraining = "Light armor" | "Medium armor" | "Heavy armor";

export interface SkillChoice {
  count: number;
  options: string[];
}

/** A feature a class gains at a given level (from the DM's class drafts). */
export interface LevelFeature {
  level: number;
  name: string;
  text: string;
}

export interface HunterClass {
  id: string;
  name: string;
  /** e.g. "Hunter Brute" — the full title used in the handbook. */
  title: string;
  tagline: string;
  blurb: string;
  primaryAbility: string;
  savingThrows: AbilityKey[];
  /** Hit die, e.g. "d10". Also the level-1 HP die. */
  hitDie: number;
  speedFt: number;
  armorTraining: ArmorTraining[];
  weaponProficiencies: string;
  toolProficiencies: string;
  skillChoices: SkillChoice;
  startingEquipment: string[];
  /** The 5e class this hunter is built on, e.g. "Fighter" / "Ranger". */
  baseClass?: string;
  /** The signature level-1 mechanic, shown prominently. */
  signature?: string;
  /** Level-by-level progression (drafts; not every class is detailed yet). */
  features?: LevelFeature[];
}

export type ArmorCategory =
  | "Main Armor"
  | "Add-on Armor"
  | "Armor Upgrade"
  | "Extra";

export interface ArmorPiece {
  id: string;
  name: string;
  category: ArmorCategory;
  /** Display string, e.g. "AC 11", "+2 AC", "0". */
  ac: string;
  /** Numeric AC contribution for Main Armor (base) or Add-on (bonus). */
  acValue: number;
  weightLb: number;
  special: string;
}

export interface HandbookSection {
  heading: string;
  /** Paragraphs of body text. */
  body: string[];
}

export interface HandbookChapter {
  id: string;
  title: string;
  summary: string;
  sections: HandbookSection[];
}

export interface SessionEvent {
  id: string;
  /** ISO date-time string (local), e.g. "2026-06-20T18:00:00". */
  date: string;
  title: string;
  location: string;
  notes?: string;
  createdBy?: string;
  updatedAt?: number;
}

// --- Membership & roles ---
//
// Two independent axes:
//   accessRole — what you can DO in the app (permissions)
//   playerType — how you sit at the TABLE (do you bring a character?)

export type AccessRole = "user" | "moderator" | "admin";
export type PlayerType = "player" | "dm";

export interface AllowlistMember {
  email: string;
  firstName: string;
  lastName: string;
  accessRole: AccessRole;
  playerType: PlayerType;
  addedBy: string;
  addedAt: number;
}

// --- Session attendance (RSVP) ---

export type RsvpStatus = "yes" | "no" | "maybe";

export interface Rsvp {
  uid: string;
  name: string;
  email: string;
  status: RsvpStatus;
  at: number;
}

// --- The hunter card a player builds and saves to Firestore ---

export type AbilityScores = Record<AbilityKey, number>;

export interface HunterCard {
  /** Owner uid (also the Firestore doc id). */
  uid: string;
  ownerEmail: string;
  ownerName: string;
  name: string;
  classId: string;
  background: string;
  level: number;
  /** Final ability scores after background adjustment. */
  abilities: AbilityScores;
  /** Chosen skill proficiencies from the class list. */
  skillProficiencies: string[];
  /** Selected Main Armor piece id, or null for unarmored. */
  mainArmorId: string | null;
  /** Assigned mascot creature id (unique per party). See data/creatures. */
  creatureId?: string;
  /** Current hit points during play (defaults to max when unset). */
  currentHp?: number;
  /** Play-time resource tracks (in addition to HP). C&S-specific mechanics. */
  madness: number;
  transform: number;
  notes: string;
  updatedAt: number;
  createdAt: number;
}
