// Shared domain types for Catacombs & Starspawns.

export type AbilityKey = "str" | "dex" | "con" | "int" | "wis" | "cha";

// --- Session-authored items ---

export type ItemCategory = "Weapon" | "Armor" | "Gear";

/** A value recorded in the current sheet's Carrying Category column. */
export type CarrySignificance = "Insignificant" | "Significant" | "Oversized";

export interface Item {
  id: string;
  name: string;
  category: ItemCategory;
  carry: CarrySignificance;
  weightLb: number;
  note?: string;
  unique?: boolean;
}

/** A DM-authored item offered during a standalone session. Values are copied
 * verbatim into the current character sheet; the app derives no mechanics. */
export interface CustomItem extends Item {
  source: "found";
  itemSlot?: string;
  /** Optional values for the current Weapons table. */
  attackBonus?: string;
  damage?: string;
  weaponNotes?: string;
}

// --- Live games (Play mode) ---

export type GameStatus = "lobby" | "active" | "ended";

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
  /** Live combat encounter state (initiative round + whose turn). */
  combat?: EncounterState;
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

/** An item created by the DM during a standalone session. It remains in
 * session history after being claimed; claiming records it on the current
 * character sheet. */
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

// --- The hunter card and its current manual sheet ---

export type AbilityScores = Record<AbilityKey, number>;

/** Free-form values of the paper character sheet, keyed by the sheet's field
 * names (the original HTML's `data-f`). Text fields are strings; checkboxes
 * are booleans. */
export type SheetData = Record<string, string | boolean>;

interface LegacyEquipmentLine {
  name: string;
  carrying?: string;
  slot?: string;
  weight?: string;
}

/** Retired automation payload retained only to transfer handwritten legacy
 * equipment into the current manual sheet once. No field is interpreted as a
 * current rule. */
interface LegacySheetAutomation {
  legacyEquipment?: LegacyEquipmentLine[];
  [key: string]: unknown;
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
  /** Legacy/free-text mirror used for older records. */
  subclassId?: string | null;
  /** Free-text mirror of the sheet's Background box. */
  background: string;
  /** @deprecated Retired catalog value; never interpreted. */
  backgroundId?: string;
  /** @deprecated Retired catalog value; copied as free text only. */
  feat?: string | null;
  /** @deprecated Retired catalog value; never interpreted. */
  featSkills?: string[];
  level: number;
  /** @deprecated Retired progression state; never interpreted. */
  lastSeenLevel?: number;
  /** Legacy feat names copied into the manual Feats box. */
  feats?: string[];
  /** Legacy recorded ability scores; copied without recalculation. */
  abilities?: AbilityScores;
  /** @deprecated Retired point-allocation state; never interpreted. */
  baseAbilities?: AbilityScores;
  /** @deprecated Retired catalog values; never interpreted. */
  skillProficiencies?: string[];
  mainArmorId?: string | null;
  addonArmorIds?: string[];
  studdedAddons?: number;
  studdedAddonIds?: string[];
  extraArmorIds?: string[];
  /** Legacy mirrors used only when seeding a sheet-less saved character. */
  currentHp?: number;
  sanity?: number;
  transformationLevel?: number;
  /** @deprecated Retired transformation catalog values; never interpreted. */
  activeTransformations?: string[];
  insight?: number;
  bloodTinge?: boolean;
  /** Current Whisper selections, limited to names in the supplied Whispers PDF. */
  preparedWhispers?: string[];
  coins?: number;
  /** @deprecated Retired inventory payloads; not used by current screens. */
  inventory?: Array<{ itemId: string; qty: number }>;
  slotAssignments?: Record<string, unknown>;
  customItems?: CustomItem[];
  droppedItems?: Array<{ itemId: string; qty: number; droppedAt: number }>;
  equippedStorageIds?: string[];
  /** The campaign this hunter currently plays in. Set when chosen for a campaign. */
  campaignId?: string | null;
  /** The current character sheet's raw field values. `name`, `level`, and
   * `background` are mirrored for list and roster queries. */
  sheet?: SheetData;
  /** @deprecated Retired automation payload; never recalculated. */
  sheetAutomation?: LegacySheetAutomation;
  notes: string;
  updatedAt: number;
  createdAt: number;
}

// --- The campaign activity log (immutable, append-only) ---

export type ActivityType =
  | "campaign.created"
  | "member.joined"
  | "member.left"
  | "hunter.brought";
