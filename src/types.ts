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

// --- Items & inventory (catalog-based) ---

export type ItemCategory =
  | "Weapon"
  | "Armor"
  | "Ammunition"
  | "Tool"
  | "Gear"
  | "Consumable"
  | "Valuable";

/** Handbook carrying category (how a carried item occupies slots). */
export type CarrySignificance = "Insignificant" | "Significant" | "Oversized";

export interface Item {
  id: string;
  name: string;
  category: ItemCategory;
  carry: CarrySignificance;
  weightLb: number;
  note?: string;
  /** Unique/named item from the resources (e.g. Hunter Rifle). */
  unique?: boolean;
}

/** A line in a hunter's inventory: a catalog item id + how many. */
export interface InventoryEntry {
  itemId: string;
  qty: number;
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

// --- Live games (Play mode) ---

export type GameStatus = "lobby" | "active" | "ended";
/** The DM-set phase while a game is active. */
export type GamePhase = "exploration" | "combat" | "short_rest" | "long_rest";

export interface Game {
  id: string;
  /** The campaign this game belongs to. */
  campaignId: string | null;
  /** Linked scheduled session id, or null for an ad-hoc game. */
  sessionId: string | null;
  title: string;
  dmUid: string;
  dmName: string;
  status: GameStatus;
  /** Current phase (meaningful while active). */
  phase: GamePhase;
  /** Test-run game — hidden from real views and auto-cleaned. */
  sandbox?: boolean;
  createdAt: number;
  startedAt?: number | null;
  endedAt?: number | null;
  /** Phase recorded when the DM stopped the game. */
  endedPhase?: GamePhase | null;
}

/** A member present in a game's lobby / session (a denormalised snapshot). */
export interface GameParticipant {
  uid: string;
  name: string;
  classId: string;
  subclassId?: string | null;
  level: number;
  role: PlayerType;
  joinedAt: number;
  /** Presence heartbeat (ms epoch). */
  lastSeen: number;
}

// --- Trades (player ↔ player, settled by a Cloud Function) ---

export type TradeStatus =
  | "pending" // offered, awaiting the other player
  | "accepted" // accepted; the Cloud Function will settle it
  | "settled" // items/coins transferred
  | "declined"
  | "cancelled"
  | "failed"; // settlement failed (e.g. an item was no longer owned)

/** One side of a trade: items given + coins. */
export interface TradeSide {
  items: InventoryEntry[];
  coins: number;
}

export interface Trade {
  id: string;
  /** The campaign this trade belongs to (for member-scoped access). */
  campaignId: string | null;
  /** The game this trade belongs to (for the DM's log). */
  gameId: string | null;
  fromUid: string;
  fromName: string;
  toUid: string;
  toName: string;
  /** What the offerer (fromUid) gives. */
  offer: TradeSide;
  /** What the offerer asks for from toUid. */
  request: TradeSide;
  status: TradeStatus;
  error?: string | null;
  sandbox?: boolean;
  createdAt: number;
  updatedAt: number;
  settledAt?: number | null;
}

/** Items dropped by a dead hunter, claimable by others until the session ends.
 * Lives at /games/{gameId}/loot/{id}. */
export interface LootPile {
  id: string;
  fromUid: string;
  fromName: string;
  items: InventoryEntry[];
  coins: number;
  status: "unclaimed" | "claimed";
  claimedByUid?: string | null;
  claimedByName?: string | null;
  createdAt: number;
}

/** A character removed from play (dead or deleted), kept so the DM can recover
 * it during the session. Lives in its own `/archive` collection — purged when
 * the game ends. */
export interface ArchivedCharacter {
  id: string;
  originalUid: string;
  gameId: string | null;
  reason: "dead" | "deleted";
  archivedAt: number;
  card: HunterCard;
}

// --- Campaigns (a "server"/party you create or join) ---

export interface Campaign {
  id: string;
  name: string;
  dmUid: string;
  dmName: string;
  /** Share code players redeem to join. */
  inviteCode: string;
  /** Member uids (for "my campaigns" queries). */
  memberUids: string[];
  /** Emails the DM has invited (lowercased); they see the invite in the menu. */
  invitedEmails: string[];
  createdAt: number;
}

export interface CampaignMember {
  uid: string;
  name: string;
  email: string;
  role: PlayerType; // dm | player
  /** The character this member plays in this campaign. */
  characterId: string | null;
  joinedAt: number;
}

export interface SessionEvent {
  id: string;
  /** The campaign this session belongs to. */
  campaignId?: string | null;
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

/** A signed-in user's self-set profile (open access — replaces the allowlist). */
export interface UserProfile {
  uid: string;
  firstName: string;
  lastName: string;
  email: string;
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
  /** Character doc id (in the /characters collection). */
  id: string;
  /** Owner's user uid (a user can own several characters). */
  ownerUid: string;
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
  /** Carried items (catalog item id + quantity). */
  inventory?: InventoryEntry[];
  /** Player has hit 0 HP and confirmed death; awaiting the DM to confirm. */
  deathPending?: boolean;
  /** The campaign this hunter currently plays in (lets that campaign's DM
   * manage it — death/recover). Set when chosen for a campaign. */
  campaignId?: string | null;
  notes: string;
  updatedAt: number;
  createdAt: number;
}
