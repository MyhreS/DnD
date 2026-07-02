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

/** A character Background (Chapter 3): the formative occupation before the hunt.
 *  Grants an Origin feat, two skills, one tool, ability points and equipment. */
export interface Background {
  id: string;
  name: string;
  text: string;
  /** The three abilities the background's points may be assigned to. */
  abilityScores: AbilityKey[];
  /** The granted Origin feat, or null when the background grants NO feat (its
   * other perks — equipment, gold, proficiencies — are the trade-off). */
  feat: string | null;
  /** The two granted skill proficiencies. */
  skills: string[];
  tool: string | null;
  equipment: string[];
}

export type FeatCategory = "Origin" | "General" | "Fighting Style" | "Epic Boon";

/** A feat (Chapter 4), with verbatim benefit text. */
export interface Feat {
  id: string;
  name: string;
  category: FeatCategory;
  prerequisite: string | null;
  text: string;
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
  /** Sanity die as a dice string, e.g. "2d6", "1d12", "4d4". */
  sanityDie: string;
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

// --- Rules reference (searchable 5e 2024 glossary) ---

export type RuleCategory =
  | "Condition"
  | "Action"
  | "Combat"
  | "Damage & Healing"
  | "General";

/** One searchable rules-glossary entry. */
export interface RuleEntry {
  id: string;
  term: string;
  category: RuleCategory;
  /** Alternative search terms (synonyms, related keywords). */
  aliases?: string[];
  /** Body paragraphs / bullet lines. */
  body: string[];
}

// --- Live games (Play mode) ---

export type GameStatus = "lobby" | "active" | "ended";
/** The DM-set phase while a game is active. */
export type GamePhase = "exploration" | "combat" | "short_rest" | "long_rest";
/** Where the party is — orthogonal to phase, and the input that makes rests
 * rulebook-accurate: Hunters Lodge = full Long Rest (HP + Hit Dice); a Safe Zone
 * = spend Hit Dice on a Short Rest (and a half Long Rest); the Wild = neither. */
export type GameLocation = "lodge" | "safe" | "wild";

/** Live combat encounter state, stored on the Game doc. */
export interface EncounterState {
  active: boolean;
  round: number;
  /** The combatant whose turn it is, or null. */
  turnId: string | null;
}

/** One combatant in the initiative tracker. Lives at
 * /games/{gameId}/combatants/{id}. PCs read HP/AC live from their HunterCard;
 * monsters carry their own HP. */
export interface Combatant {
  id: string;
  kind: "pc" | "monster";
  name: string;
  /** For a PC — the HunterCard to read live HP from. */
  characterId?: string | null;
  initiative: number;
  ac?: number | null;
  maxHp?: number | null;
  currentHp?: number | null;
  /** Condition ids (see src/data/conditions.ts). */
  conditions: string[];
  /** Round each active condition was applied on (conditionId → round), so the
   * tracker can show how many rounds a condition has lasted. */
  conditionSince?: Record<string, number>;
  /** Optional DM note for a monster — its attack / special / damage. */
  note?: string | null;
  createdAt: number;
}

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
  /** Live combat encounter state (initiative round + whose turn). */
  combat?: EncounterState;
  /** Current location/safety (drives rest math). Defaults to "wild". */
  location?: GameLocation;
  /** Test-run game — hidden from real views and auto-cleaned. */
  sandbox?: boolean;
  createdAt: number;
  startedAt?: number | null;
  endedAt?: number | null;
  /** Phase recorded when the DM stopped the game. */
  endedPhase?: GamePhase | null;
  /** Location recorded when the DM stopped the game. */
  endedLocation?: GameLocation | null;
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

/** Items on the shared loot pile, claimable by others until the session ends.
 * Lives at /games/{gameId}/loot/{id}. Either a fallen hunter's remains or an
 * item a living hunter chose to drop (`dropped`). */
export interface LootPile {
  id: string;
  fromUid: string;
  fromName: string;
  items: InventoryEntry[];
  coins: number;
  status: "unclaimed" | "claimed";
  /** True when a living hunter dropped this (vs. a fallen hunter's remains). */
  dropped?: boolean;
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

// --- Shop (the DM's per-campaign storefront) ---

/** One catalog item the DM has stocked for sale, at a GP price. Lives in the
 * top-level /shopListings collection, scoped by campaignId. Infinite stock. */
export interface ShopListing {
  id: string;
  campaignId: string;
  /** Catalog item id (see src/data/items.ts). */
  itemId: string;
  priceGp: number;
  /** The DM uid who stocked it. */
  createdBy: string;
  createdAt: number;
}

/** A player's request to sell an item back to the shop. The DM must enter a
 * price before it can be approved (which credits the seller's gold). Lives in
 * the top-level /sellRequests collection, scoped by campaignId. */
export interface SellRequest {
  id: string;
  campaignId: string;
  sellerUid: string;
  sellerName: string;
  /** The seller's character to debit the item from / credit the gold to. */
  characterId: string;
  itemId: string;
  qty: number;
  /** Set by the DM; null until priced. The gate on approval. */
  priceGp: number | null;
  status: "requested" | "priced" | "approved" | "declined";
  createdAt: number;
  updatedAt: number;
  settledAt?: number | null;
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
  /** A "Test Run" campaign seeded with bot hunters so the DM can try the app. */
  sandbox?: boolean;
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
  /** Background display name (e.g. "Cultist"); free text on legacy cards. */
  background: string;
  /** Structured background id (from data/backgrounds.ts), when chosen. */
  backgroundId?: string;
  /** Origin feat granted via the background; null when the background grants
   * none (an explicit null so saves CLEAR a previously stored feat). */
  feat?: string | null;
  level: number;
  /** The last level this player has walked through the level-up screen for.
   * When `level` moves past it (DM award/level or a Long Rest), the level-up
   * flow shows what was gained and records the choices, then catches this up. */
  lastSeenLevel?: number;
  /** Feats picked at level-ups (ASI levels / Epic Boon / Fighting Style),
   * separate from the background's origin `feat`. Display strings. */
  feats?: string[];
  /** Final ability scores after background adjustment. */
  abilities: AbilityScores;
  /** Pre-background base scores (bought or rolled) — kept so re-editing can
   * split `abilities` back into base + background bonus correctly. */
  baseAbilities?: AbilityScores;
  /** How the base scores were determined — point buy (default) or the table's
   * "Maduhausu" rolled-stats house method (4d6 drop lowest). */
  abilityMode?: "pointbuy" | "maduhausu";
  /** Skill proficiencies (class choices + background-granted). */
  skillProficiencies: string[];
  /** Selected Main Armor piece id, or null for unarmored. */
  mainArmorId: string | null;
  /** Worn Add-on Armor piece ids (max five; a Balanced Fit main allows one more). */
  addonArmorIds?: string[];
  /** How many worn Add-on pieces carry the Studs upgrade (1–4 → +1 AC, 5 → +2). */
  studdedAddons?: number;
  /** Worn Extras (hats, scarves, gloves — AC 0 flavour/utility). */
  extraArmorIds?: string[];
  /** Current hit points during play (defaults to max when unset). */
  currentHp?: number;
  /** Current Sanity during play (defaults to max when unset). Madness is the
   * complement: madness = maxSanity − sanity. */
  sanity?: number;
  /** Transformation Level 0–10. Gaining a level rolls 1d20 on the Transformation
   * Table (using the NEW level). Short Rest −1 (+1 more on a DC 13 CON (Grit)
   * check) and Long Rest → 0 — both also clear all active Transformations. */
  transformationLevel?: number;
  /** Active Transformation result keys (see src/data/transformation.ts), gained
   * from table rolls. Cleared whenever the Transformation Level is reduced. */
  activeTransformations?: string[];
  /** Insight — the rulebook's XP currency, awarded by the DM. Crossing a
   * threshold only raises `level` after a Long Rest (see levelForInsight). */
  insight?: number;
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
