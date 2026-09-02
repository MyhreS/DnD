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
  description: string;
}

/** Established player-facing background data. The replacement four-document
 * source set does not redefine this catalog. */
export interface Background {
  id: string;
  name: string;
  text: string;
  /** The three abilities eligible for this background's +2/+1 or +1/+1/+1 adjustment. */
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
  /** e.g. "Hunter Brute" — the full title used by the app catalog. */
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
  /** A level-3 specialization is available, but hunters may remain on the core class path. */
  subclassOptional?: boolean;
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

/** Carrying category used by the established app catalog. */
export type CarrySignificance = "Insignificant" | "Significant" | "Oversized";

/** Where an item slot sits on the body. */
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

/** A named item found during play that is not part of the app catalog.
 * Its mechanical facts are recorded with the character so calculations stay
 * deterministic on every device. */
export interface CustomItem extends Item {
  source: "found";
  /** Present only when category is Armor. */
  armorCategory?: ArmorCategory;
  /** The body slot occupied by custom Extra armor. */
  armorSubcategory?: ExtraSubcategory;
  /** Catalog item whose slot restrictions this unique variant follows. */
  catalogBaseId?: string;
  /** Main Armor uses this as base AC; Add-on Armor uses it as a bonus. */
  acValue?: number;
  /** Optional weapon-sheet facts supplied by the table when the item is found. */
  attackBonus?: string;
  damage?: string;
  weaponNotes?: string;
}

/** Bloodvial purity, core-rulebook.txt [page 123]. A field on the single
 * `blood-vial` catalog id rather than four items; absent means Tainted. */
export type BloodvialPurity = "tainted" | "stirred" | "concentrated" | "pure";

/** A line in a hunter's inventory: a catalog item id + how many. */
export interface InventoryEntry {
  itemId: string;
  qty: number;
  /** Bloodvial lines only — the purity of these vials (default Tainted). */
  purity?: BloodvialPurity;
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

/** Extra armor subcategories — a hunter may wear only ONE
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
/** Where the party is — orthogonal to phase and used by the established
 * session-rest workflow. A Safe Zone is a location the GM designates; the
 * Hunters Lodge is always one, so both grant the same rest benefits (spend Hit
 * Point Dice on a Short Rest; a Long Rest restores all HP and all Hit Point
 * Dice). The Wild is outside a Safe Zone: no Hit Point Dice, and a Long Rest
 * restores only half your HP maximum. */
export type GameLocation = "lodge" | "safe" | "wild";

export type TurnTimerPhase = "idle" | "briefing" | "running" | "paused" | "untimed" | "expired";

/** Live combat encounter state, stored on the Game doc. */
export interface EncounterState {
  active: boolean;
  /** Increments for each battle in a session so completed encounters remain saved. */
  encounterId: number;
  round: number;
  /** The combatant whose turn it is, or null. */
  turnId: string | null;
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
  /** The session battle this combatant belongs to. Legacy rows belong to battle 0. */
  encounterId?: number;
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
  /** Display class snapshotted at join. Legacy sheet-only Hunters can have an
   * empty classId, so this remains their fallback label. */
  className?: string | null;
  level: number;
  role: PlayerType;
  joinedAt: number;
  /** Presence heartbeat (ms epoch). */
  lastSeen: number;
}

/** A shared, attributed entry in a game's session notes. */
export interface SessionNote {
  id: string;
  authorUid: string;
  authorName: string;
  body: string;
  createdAt: number;
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

/** Saved values of the character sheet, keyed by its field names. Text fields
 * are strings and checkboxes are booleans; rules-driven values are projected
 * again from structured decisions whenever the sheet is applied. */
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
  /** Persisted versions 1 and 2 are accepted and normalized to version 3. */
  version: 1 | 2 | 3;
  classSkills: string[];
  expertiseSkills?: string[];
  weaponMasteries?: string[];
  /** Free-form decisions from level features that do not have a dedicated
   * mechanical selector yet, keyed by `level:feature name`. */
  levelChoices?: Record<string, string>;
  /** Structured feat picks made at individual level-up steps. */
  levelFeats?: Record<string, string>;
  /** Ability increases granted by each structured level-up feat. */
  levelAbilityBonuses?: Record<string, Partial<Record<AbilityKey, number>>>;
  /** Level-one points assigned after point buy, limited to the background's three abilities. */
  backgroundBonuses?: Partial<Record<AbilityKey, number>>;
  startingKitApplied?: boolean;
  setupComplete?: boolean;
  /** Exact catalog quantities and GP granted by the currently selected class
   * + background, so changing either can replace only the old free kit while
   * preserving equipment the player added later. */
  startingKitInventory?: InventoryEntry[];
  startingKitCoins?: number;
  /** Armor "Extra" pieces (class head gear) granted by the current kit, so a
   * class change can withdraw exactly what it granted. */
  startingKitExtraArmorIds?: string[];
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
  /** @deprecated Background display NAME, denormalised from the catalog. Read
   * the name through `backgroundId` instead. It survives only as the fallback
   * for pre-catalog cards that never had a `backgroundId`, and for legacy
   * sheet-only imports. */
  background?: string;
  /** Structured background id from the established app background catalog. */
  backgroundId?: string;
  /** @deprecated Origin feat, denormalised from the background. Derive it with
   * `featsOf(card)` instead, so the catalog stays the single source and a
   * rename cannot leave stored cards behind. Nothing writes this field now. */
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
  /** Final ability scores after background adjustment and structured level increases. */
  abilities: AbilityScores;
  /** Scores bought during creation, before background and structured level increases. */
  baseAbilities?: AbilityScores;
  /** Standard 27-point buy or the game maker's 57-point Maduhausu method. */
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
  /** Worn Add-on piece ids carrying the Studs upgrade (≥3 → +1 AC, 5 → +2 AC;
   * +5 lb each — core-rulebook.txt [page 35]). Replaces the legacy
   * `studdedAddons` count. */
  studdedAddonIds?: string[];
  /** Worn Extras (hats, scarves, gloves — AC 0 flavour/utility). */
  extraArmorIds?: string[];
  /** Current hit points during play (defaults to max when unset). */
  currentHp?: number;
  /** @deprecated Current Sanity is not tracked. core-rulebook.txt [page 42]:
   * "Start with 0 Madness and do not track Current Sanity." Nothing writes this
   * field any more; stored values remain only until the Batch 6 migration
   * strips them, and `normalizeCard` still reads legacy pairs once to derive
   * Madness. Do not read it for play values. */
  sanity?: number;
  /** Current Madness. core-rulebook.txt [page 42] "Max Sanity and Madness":
   * a Hunter starts with 0 Madness, and "Madness functions like damage against
   * Max Sanity: when Madness equals or exceeds Max Sanity, you become Insane
   * and gain the Insane Condition." Reducing it below Max Sanity ends Insane. */
  madness?: number;
  /** Transformation Level 0–10. The Transformation Table is published in full
   * (20 rows × 10 level columns) at core-rulebook.txt [page 27]; the app still
   * records the level rather than rolling for the table at present.
   * Reducing it clears active Transformations ([page 26]). */
  transformationLevel?: number;
  /** Active Transformation result keys recorded by the DM from table rolls
   * (unique ids). core-rulebook.txt [page 26] "Getting same Transformations":
   * "Active Transformations do not stack with themselves. If you roll one you
   * already have, suffer 2 Madness, and nothing more happens."
   * Cleared when Transformation Level is reduced. */
  activeTransformations?: string[];
  /** Insight — the established app progression currency, awarded by the DM. */
  insight?: number;
  /** Blood Tinge. core-rulebook.txt [page 44]: "Once per round, when damage
   * leaves you with 1–9 Hit Points, you gain Blood Tinge. You can have only one
   * Blood Tinge at a time." It may be spent immediately after rolling a die to
   * reroll that die; unspent Blood Tinge is lost on a Long Rest. */
  bloodTinge?: boolean;
  /** Not Tonight! core-rulebook.txt [page 44]: "A newly created Hunter begins
   * with Not Tonight!" — hence the default of `true`. It sets you to 1 Hit
   * Point instead of 0 and is regained on a Long Rest if not already held.
   * You can have only one at a time. */
  notTonight?: boolean;
  /** Favors held, 0–2. core-rulebook.txt [page 44]: "A Hunter can have no more
   * than two Favors. If you would gain a Favor while you already have two, you
   * gain nothing." Awarded only by the GM; one may be expended on death. */
  favors?: number;
  /** Sleepless Counters. core-rulebook.txt [page 21]: one is gained at the end
   * of every hour spent outside a Short or Long Rest; at 24 you gain the
   * Sleepless condition and 1d4 Madness. A Long Rest resets it to 0
   * ([page 25]). */
  sleeplessCounter?: number;
  /** Exhaustion level. core-rulebook.txt [page 25], Long Rest benefits:
   * "Reduce Exhaustion by 1." */
  exhaustion?: number;
  /** Rolled Insane Quirk id, from the d100 Insane Quirk Table at
   * core-rulebook.txt [page 24]. Unset until a Quirk is rolled. */
  insaneQuirkId?: string;
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
  /** Unique weapons, armor, and gear found during play outside the app catalog. */
  customItems?: CustomItem[];
  /** Recently dropped lines, recoverable for 15 minutes (see DroppedItem). */
  droppedItems?: DroppedItem[];
  /** WORN storage items (sack/backpack/bandolier/tool belt/…), by catalog item
   * id. A worn storage item leaves `inventory` (like worn armor); its weight
   * still counts. Missing on legacy docs → nothing equipped. */
  equippedStorageIds?: string[];
  /** The campaign this hunter currently plays in (lets that campaign's DM
   * manage it — death/recover). Set when chosen for a campaign. */
  campaignId?: string | null;
  /** The character sheet's saved field snapshot. Current Hunters also retain
   * structured decisions so calculated values can be refreshed consistently;
   * identity fields are mirrored for lists and campaign membership. */
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
