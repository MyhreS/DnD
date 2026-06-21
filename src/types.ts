// Shared domain types for Catacombs & Starspawns.

export type AbilityKey = "str" | "dex" | "con" | "int" | "wis" | "cha";

export type ArmorTraining = "Light armor" | "Medium armor" | "Heavy armor";

export interface SkillChoice {
  count: number;
  options: string[];
}

/** A skill and the ability it keys off (C&S character sheet mapping). */
export interface Skill {
  name: string;
  ability: AbilityKey;
}

/** A feature a class or subclass gains at a given level. */
export interface LevelFeature {
  level: number;
  name: string;
  text: string;
}

/** One row of a class's 1–20 progression table. */
export interface ClassLevel {
  level: number;
  /** Proficiency bonus, 2–6. */
  profBonus: number;
  /** Features gained, as listed in the class table (comma-separated). */
  features: string;
  /** Class-specific table columns, e.g. { "Sneak Attack": "3d6" }. */
  extras: Record<string, string>;
}

/** A class specialization chosen at level 3. */
export interface Subclass {
  id: string;
  name: string;
  tagline: string;
  blurb: string;
  features: LevelFeature[];
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
  /** Hit die, e.g. 10. Also the level-1 HP die. */
  hitDie: number;
  /** Starting maximum Sanity (the C&S sanity pool). */
  maxSanity: number;
  /** Sanity die, e.g. 12 → d12. */
  sanityDie: number;
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
  /** Extra column headers in the progression table (besides Level/Prof/Features). */
  progressionColumns: string[];
  /** Full 1–20 level table. */
  progression: ClassLevel[];
  /** Detailed core-class feature text, level by level. */
  features?: LevelFeature[];
  /** Subclasses chosen at level 3. */
  subclasses: Subclass[];
  /** True for the Deepcaller — performs Rites & Whispers with Strain. */
  caster?: boolean;
}

// --- Rites (the Deepcaller's spell-like system) ---

export type RiteType =
  | "Evocation"
  | "Mind Influence"
  | "Illusion"
  | "Summoning"
  | "Traversal"
  | "Detection"
  | "Protection";

export interface Rite {
  id: string;
  name: string;
  /** Rite level 1–9; 0 marks a Whisper (lesser fragment, no Strain/Madness). */
  level: number;
  whisper: boolean;
  type: RiteType;
  /** Performing time, e.g. "Action", "Bonus Action", "Reaction". */
  performing: string;
  range: string;
  duration: string;
  /** Special Requirements line, if any. */
  special?: string;
  /** The effect text. */
  text: string;
  /** "Using Higher-Level Strain" / "Whisper Upgrade" scaling text, if any. */
  upgrade?: string;
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
  /** Chosen subclass id (from the class's subclasses), or null. */
  subclassId?: string | null;
  background: string;
  level: number;
  /** Final ability scores after background adjustment. */
  abilities: AbilityScores;
  /** Chosen skill proficiencies from the class list. */
  skillProficiencies: string[];
  /** Selected Main Armor piece id, or null for unarmored. */
  mainArmorId: string | null;
  /** Current hit points during play (defaults to max when unset). */
  currentHp?: number;
  /** Current Sanity during play (defaults to max when unset). */
  sanity?: number;
  /** Blood Tinge — the C&S take on heroic inspiration. */
  bloodTinge?: boolean;
  /** Deepcaller: prepared Whispers / known rites, by rite id. */
  preparedWhispers?: string[];
  /** Gold pieces (the only currency). */
  coins?: number;
  notes: string;
  updatedAt: number;
  createdAt: number;
}
