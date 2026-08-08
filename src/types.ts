// Shared domain types for Catacombs & Starspawns.

export type AbilityKey = "str" | "dex" | "con" | "int" | "wis" | "cha";

export type ArmorTraining = "Light armor" | "Medium armor" | "Heavy armor";
/** A body location, or one numbered compartment inside worn storage. */
export type SlotAssignment = SlotLocation | `storage:${string}:${number}`;

export interface SkillChoice {
  count: number;
  options: string[];
}

export interface Skill {
  name: string;
  ability: AbilityKey;
}

/** Player-facing background data reconciled from master.json. A null feat is
 * deliberate: the source scan is illegible, so the app asks instead of guessing. */
export interface Background {
  id: string;
  name: string;
  text: string;
  abilityScores: AbilityKey[];
  feat: string | null;
  skills: string[];
  tool: string | null;
  equipment: string[];
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

/** Where an item slot sits on the body (handbook "Check Your Item Slots").
 * master.json's Bandolier "Front" renders as the sheet's "chest". */
export type SlotLocation = "hand" | "back" | "chest" | "hip" | "ankle";

export interface Item {
  id: string;
  name: string;
  category: ItemCategory;
  carry: CarrySignificance;
  weightLb: number;
  note?: string;
  /** Unique/named item from the resources (e.g. Hunter Rifle). */
  unique?: boolean;
  /** Pinned slot location, e.g. Hunter Rifle = "Significant Item (back)". */
  slotLocation?: SlotLocation;
}

/** A named item found during play that is not part of the handbook catalog.
 * Its mechanical facts are recorded with the character so calculations stay
 * deterministic on every device. */
export interface CustomItem extends Item {
  source: "found";
  /** Present only when category is Armor. */
  armorCategory?: "Main Armor" | "Add-on Armor";
  /** Main Armor uses this as base AC; Add-on Armor uses it as a bonus. */
  acValue?: number;
  /** Optional weapon-sheet facts supplied by the table when the item is found. */
  attackBonus?: string;
  damage?: string;
  weaponNotes?: string;
}

/** A line in a hunter's inventory: a catalog item id + how many. */
export interface InventoryEntry {
  itemId: string;
  qty: number;
}

/** A recently dropped inventory line (#136) — recoverable until DROPPED_TTL_MS
 * after `droppedAt` (client clock; serverTimestamp is illegal inside arrays).
 * Expired entries are filtered on render and pruned on the next
 * `droppedItems` write — never by a server timer. */
export interface DroppedItem {
  itemId: string;
  qty: number;
  /** ms epoch, client clock at the moment of the drop. */
  droppedAt: number;
}

export type ArmorCategory =
  | "Main Armor"
  | "Add-on Armor"
  | "Armor Upgrade"
  | "Extra";

/** Extras subcategories (handbook Armor Part 2) — a hunter may wear only ONE
 * Extra per subcategory (one hat, one scarf, …). "Robe" covers the unique
 * Robe of the Deepcallers, wearable "as any other Armor" per Unique Items. */
export type ExtraSubcategory = "Head Gear" | "Scarf" | "Gloves" | "Boots" | "Robe";

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
  /** Extras only: the one-per-subcategory slot this piece occupies. */
  subcategory?: ExtraSubcategory;
  /** The "reads as …" line this piece gives off while worn (sheet Impressions). */
  impression?: string;
  /** Unique item (e.g. the Robe) — found in play, not offered at creation. */
  unique?: boolean;
}

// --- Live games (Play mode) ---

export type GameStatus = "lobby" | "active" | "ended";
/** The DM-set phase while a game is active. */
export type GamePhase = "exploration" | "combat" | "short_rest" | "long_rest";
/** Where the party is — orthogonal to phase, and the input that makes rests
 * rulebook-accurate: Hunters Lodge = full Long Rest (HP + Hit Dice); a Safe Zone
 * = spend Hit Dice on a Short Rest (and a half Long Rest); the Wild = neither. */
export type GameLocation = "lodge" | "safe" | "wild";

export type TurnTimerPhase = "idle" | "briefing" | "running" | "paused" | "untimed" | "expired";

/** Live combat encounter state, stored on the Game doc. */
export interface EncounterState {
  active: boolean;
  round: number;
  /** The combatant whose turn it is, or null. */
  turnId: string | null;
  /** Exactly one Warden may receive Tactical Command for this encounter. */
  designatedWardenId: string | null;
  timerPhase: TurnTimerPhase;
  /** Absolute client epoch so every subscribed screen renders the same clock. */
  timerEndsAt: number | null;
  pausedRemainingMs: number | null;
}

/** Reusable DM-owned enemy stats. A copy is stored on each spawned combatant so
 * reset always restores the values used when that enemy entered the battle. */
export interface EnemyStats {
  name: string;
  initiative: number;
  ac: number | null;
  maxHp: number;
  note: string | null;
  revealHp: boolean;
  revealStats: boolean;
}

/** One reusable entry in /users/{uid}/enemies/{id}. Archived entries remain
 * recoverable and are hidden from the normal battle picker. */
export interface EnemyTemplate extends EnemyStats {
  id: string;
  archived: boolean;
  createdAt: number;
  updatedAt: number;
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
  /** Public defeat marker so players can see that a hidden-HP monster is dead. */
  defeated?: boolean;
  /** Condition ids (see src/data/conditions.ts). */
  conditions: string[];
  /** Round each active condition was applied on (conditionId → round), so the
   * tracker can show how many rounds a condition has lasted. */
  conditionSince?: Record<string, number>;
  /** Optional DM note for a monster — its attack / special / damage. */
  note?: string | null;
  /** Monster visibility switches. False/missing keeps the corresponding
   * private fields out of the player-readable battle projection. */
  revealHp?: boolean;
  revealStats?: boolean;
  /** Reusable library source plus an immutable reset snapshot for monsters. */
  enemyTemplateId?: string | null;
  baseStats?: EnemyStats | null;
  /** True when this PC's class is Hunter Warden. */
  isWarden?: boolean;
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
  /** User ids invited to this session. Kept on the parent so Firestore can
   * authorize and query a player's sessions without reading subcollections. */
  participantUids: string[];
  /** Selected Hunter snapshots for invitation-based standalone sessions.
   * Campaign games continue to use the legacy participants subcollection. */
  participantRoster: GameParticipant[];
  /** Players who were already seated elsewhere when this DM added them.
   * They can accept to switch sessions or decline without disturbing either
   * active roster. */
  invitedUids: string[];
  inviteRoster: GameParticipant[];
  /** Append-only attendance snapshots. Unlike the active roster, this retains
   * Hunters removed mid-session so history still records who took part. */
  attendeeRoster?: GameParticipant[];
  status: GameStatus;
  /** Current phase (meaningful while active). */
  phase: GamePhase;
  /** Live combat encounter state (initiative round + whose turn). */
  combat?: EncounterState;
  /** Current location/safety (drives rest math). Defaults to "wild". */
  location?: GameLocation;
  /** Test-run game — hidden from real views and auto-cleaned. */
  sandbox?: boolean;
  /** Shared table clock. elapsedMs stores completed running intervals while
   * startedAt anchors the current one, so every subscribed device agrees. */
  clockRunning: boolean;
  clockStartedAt: number | null;
  clockElapsedMs: number;
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
  /** The selected Hunter document. A session has at most one Hunter per user. */
  characterId?: string | null;
  /** Account owner display name, separate from the Hunter's name. */
  playerName?: string | null;
  name: string;
  classId: string;
  subclassId?: string | null;
  /** The paper sheet's free-text class line, snapshotted at join — sheet-made
   * hunters have classId "" so this is their display class. */
  className?: string | null;
  level: number;
  role: PlayerType;
  joinedAt: number;
  /** Presence heartbeat (ms epoch). */
  lastSeen: number;
}

/** A unique item created by the DM during a standalone session. It remains in
 * session history after being claimed; claiming copies the definition into the
 * Hunter's custom item catalog. */
export interface SessionLoot {
  id: string;
  item: CustomItem;
  status: "available" | "claimed";
  createdAt: number;
  claimedAt?: number | null;
  claimedByUid?: string | null;
  claimedByCharacterId?: string | null;
  claimedByName?: string | null;
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

// --- The hunter card a player builds and saves to Firestore ---

export type AbilityScores = Record<AbilityKey, number>;

/** Free-form values of the paper character sheet, keyed by the sheet's field
 * names (the original HTML's `data-f`). Text fields are strings; checkboxes
 * are booleans. */
export type SheetData = Record<string, string | boolean>;

export interface LegacyEquipmentLine {
  name: string;
  carrying?: string;
  slot?: string;
  weight?: string;
}

/** Versioned state for the rules-driven paper sheet. Only player decisions
 * live here; every calculated field is derived again from canonical data. */
export interface SheetAutomationState {
  version: 1;
  classSkills: string[];
  expertiseSkills?: string[];
  weaponMasteries?: string[];
  backgroundBonuses: Partial<Record<AbilityKey, number>>;
  startingKitApplied?: boolean;
  setupComplete?: boolean;
  /** Exact catalog quantities and GP granted by the currently selected class
   * + background, so changing either can replace only the old free kit while
   * preserving equipment the player added later. */
  startingKitInventory?: InventoryEntry[];
  startingKitCoins?: number;
  migratedAt?: number;
  manualOverrides?: string[];
  legacyEquipment?: LegacyEquipmentLine[];
  /** Original handwritten equipment rows retained for migration auditing after
   * the closest catalog entries have been selected centrally. */
  migrationOriginalEquipment?: LegacyEquipmentLine[];
}

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
  /** Structured background id (from resources/master.json), when chosen. */
  backgroundId?: string;
  /** Origin feat granted via the background; null when the background grants
   * none (an explicit null so saves CLEAR a previously stored feat). */
  feat?: string | null;
  /** The Skilled feat's three chosen proficiencies (skills and/or tools).
   * Skill picks are ALSO merged into `skillProficiencies`; tool picks live
   * only here. Empty when the origin feat grants no choice. */
  featSkills?: string[];
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
  /** How the base scores were determined — standard 27-point buy (default) or
   * the table's "Maduhausu" min-max buy: 57 points, scores 3–16, escalating
   * repeat costs, no final level-1 score above 17 (background included). */
  abilityMode?: "pointbuy" | "maduhausu";
  /** Skill proficiencies (class choices + background-granted). */
  skillProficiencies: string[];
  /** Selected Main Armor piece id, or null for unarmored. */
  mainArmorId: string | null;
  /** Worn Add-on Armor piece ids (max five; a Balanced Fit main allows one more). */
  addonArmorIds?: string[];
  /** @deprecated Legacy studded-piece COUNT — normalized into `studdedAddonIds`
   * on load and mirrored (= its length) on every save for stale clients. */
  studdedAddons?: number;
  /** Worn Add-on piece ids carrying the Studs upgrade (≥1 → +1 AC, 5 → +2 AC;
   * +3 lb each). Replaces the legacy `studdedAddons` count. */
  studdedAddonIds?: string[];
  /** Worn Extras (hats, scarves, gloves — AC 0 flavour/utility). */
  extraArmorIds?: string[];
  /** Current hit points during play (defaults to max when unset). */
  currentHp?: number;
  /** Current Sanity during play (defaults to max when unset). Madness is the
   * complement: madness = maxSanity − sanity. */
  sanity?: number;
  /** Transformation Level 0–10. Gains are rolled physically at the table (1d20
   * on the Transformation Table at the NEW level) and recorded by the DM — the
   * app never rolls. Short Rest −1 (+1 more on a DC 13 CON (Grit) check) and
   * Long Rest → 0 — every reduction also clears all active Transformations. */
  transformationLevel?: number;
  /** Active Transformation result keys recorded by the DM from physical table
   * rolls (duplicates allowed). Cleared when Transformation Level is reduced. */
  activeTransformations?: string[];
  /** Insight — the rulebook's XP currency, awarded by the DM. */
  insight?: number;
  /** Blood Tinge — the C&S take on heroic inspiration. */
  bloodTinge?: boolean;
  /** Deepcaller: prepared Whispers / known rites, by rite id. */
  preparedWhispers?: string[];
  /** Gold pieces (the only currency). */
  coins?: number;
  /** Carried items (catalog item id + quantity). */
  inventory?: InventoryEntry[];
  /** Player-chosen carrying location for each significant or oversized item
   * unit. Missing entries are deliberately unassigned; nothing is placed in a
   * body/storage slot until the player chooses where it goes. */
  slotAssignments?: Record<string, Array<SlotAssignment | null>>;
  /** Unique weapons, armor, and gear found during play outside the handbook. */
  customItems?: CustomItem[];
  /** Recently dropped lines, recoverable for 15 minutes (see DroppedItem). */
  droppedItems?: DroppedItem[];
  /** WORN storage items (sack/backpack/bandolier/tool belt/…), by catalog item
   * id. A worn storage item leaves `inventory` (like worn armor); its weight
   * still counts. Missing on legacy docs → nothing equipped. */
  equippedStorageIds?: string[];
  /** Player has hit 0 HP and confirmed death; awaiting the DM to confirm. */
  deathPending?: boolean;
  /** The campaign this hunter currently plays in (lets that campaign's DM
   * manage it — death/recover). Set when chosen for a campaign. */
  campaignId?: string | null;
  /** The paper character sheet's raw field values — present only on hunters
   * created the "character sheet way" (a free-form sheet instead of the
   * structured builder; `name`/`level`/`background` are mirrored from it). */
  sheet?: SheetData;
  /** Structured decisions and migration metadata for automatic sheet filling. */
  sheetAutomation?: SheetAutomationState;
  notes: string;
  updatedAt: number;
  createdAt: number;
}

// --- The campaign activity log (immutable, append-only) ---

export type ActivityType =
  | "campaign.created"
  | "member.joined"
  | "member.left"
  | "hunter.brought"
  | "session.created"
  | "session.updated"
  | "game.created"
  | "game.started"
  | "game.phase"
  | "game.location"
  | "game.ended"
  | "game.joined"
  | "loot.dropped"
  | "loot.claimed"
  | "shop.bought"
  | "shop.sold"
  | "trade.accepted"
  | "hunter.died"
  | "hunter.recovered"
  | "hunter.rested"
  | "hunter.leveled"
  | "insight.awarded"
  | "item.given"
  | "gold.changed";
