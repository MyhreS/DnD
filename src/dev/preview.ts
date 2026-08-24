import type { User } from "firebase/auth";
import { capabilities, type Identity } from "@/config";
import type { AccessRole, AllowlistMember, HunterCard, PlayerType } from "@/types";

// Local preview mode exercises every route without Google sign-in or writes.
const STORAGE_KEY = "cs-preview";

function parseIdentity(raw: string | null): Identity {
  let accessRole: AccessRole = "user";
  let playerType: PlayerType = "player";
  for (const token of (raw ?? "").toLowerCase().split(/[.,\s/]+/)) {
    if (token === "user" || token === "moderator" || token === "admin") accessRole = token;
    if (token === "player" || token === "dm") playerType = token;
  }
  return { accessRole, playerType };
}

export function readPreviewRaw(): string | null {
  if (!import.meta.env.DEV) return null;
  const param = new URLSearchParams(window.location.search).get("preview");
  if (param === "off") {
    localStorage.removeItem(STORAGE_KEY);
    return null;
  }
  if (param) {
    localStorage.setItem(STORAGE_KEY, param);
    return param;
  }
  return localStorage.getItem(STORAGE_KEY);
}

export interface PreviewSession {
  user: User;
  identity: Identity;
  member: AllowlistMember;
}

export function maybePreview(): PreviewSession | null {
  const raw = readPreviewRaw();
  if (raw === null) return null;
  const identity = parseIdentity(raw);
  const user = { uid: "preview-uid", email: "preview@local.dev", displayName: "Preview Hunter", photoURL: null } as unknown as User;
  const member: AllowlistMember = {
    email: "preview@local.dev",
    firstName: "Preview",
    lastName: "Hunter",
    accessRole: identity.accessRole,
    playerType: identity.playerType,
    addedBy: "preview",
    addedAt: Date.now(),
  };
  console.info("[preview] running as", identity, capabilities(identity));
  return { user, identity, member };
}

export function isPreviewActive(): boolean {
  return import.meta.env.DEV && readPreviewRaw() !== null;
}

export function previewCampaign(): import("@/types").Campaign {
  return {
    id: "preview-campaign",
    name: "The Sunless Vault",
    dmUid: "preview-dm",
    dmName: "Christoffer",
    inviteCode: "VAULT7",
    memberUids: ["preview-dm", "preview-uid", "preview-p2", "preview-p4"],
    invitedEmails: ["newhunter@example.com"],
    createdAt: Date.now(),
  };
}

export function previewMembers(): import("@/types").CampaignMember[] {
  const now = Date.now();
  return [
    { uid: "preview-dm", name: "Christoffer", email: "dm@local.dev", role: "dm", characterId: null, joinedAt: now },
    { uid: "preview-uid", name: "Eileen the Crow", email: "you@local.dev", role: "player", characterId: "preview-uid-char", joinedAt: now },
    { uid: "preview-p2", name: "Gascoigne", email: "p2@local.dev", role: "player", characterId: "preview-p2-char", joinedAt: now },
    { uid: "preview-p4", name: "Henryk", email: "p4@local.dev", role: "player", characterId: "preview-p4-char", joinedAt: now },
  ];
}

export function previewGame(): import("@/types").Game {
  const now = Date.now();
  return {
    id: "preview-game",
    campaignId: "preview-campaign",
    sessionId: null,
    title: "The Sunless Vault",
    dmUid: "preview-dm",
    dmName: "Christoffer",
    participantUids: ["preview-uid", "preview-p2"],
    participantRoster: previewParticipants(),
    invitedUids: [],
    inviteRoster: [],
    status: "lobby",
    combat: {
      active: true,
      encounterId: 0,
      round: 2,
      turnId: "prev-monster-1",
      timerPhase: "untimed",
      timerEndsAt: null,
      pausedRemainingMs: null,
    },
    sandbox: false,
    clockRunning: false,
    clockStartedAt: null,
    clockElapsedMs: 0,
    createdAt: now,
    startedAt: null,
    endedAt: null,
  };
}

export function previewCombatants(): import("@/types").Combatant[] {
  const now = Date.now();
  return [
    { id: "prev-monster-1", kind: "monster", name: "Example Enemy", characterId: null, initiative: 19, ac: 14, maxHp: 80, currentHp: 52, conditions: ["restrained"], conditionSince: { restrained: 1 }, note: "Synthetic preview entry", createdAt: now },
    { id: "prev-pc-1", kind: "pc", name: "Eileen the Crow", characterId: "preview-uid-char", initiative: 17, ac: null, maxHp: null, currentHp: null, conditions: ["frightened"], conditionSince: { frightened: 1 }, createdAt: now },
    { id: "prev-pc-2", kind: "pc", name: "Gascoigne", characterId: "preview-p2-char", initiative: 12, ac: null, maxHp: null, currentHp: null, conditions: [], conditionSince: {}, createdAt: now },
  ];
}

export function previewEnemyTemplates(): import("@/types").EnemyTemplate[] {
  const now = Date.now();
  return [
    { id: "preview-enemy-one", name: "Example Enemy", initiative: 19, ac: 14, maxHp: 80, note: "Synthetic preview entry", revealHp: false, revealStats: false, archived: false, createdAt: now, updatedAt: now },
    { id: "preview-enemy-two", name: "Second Example Enemy", initiative: 14, ac: 12, maxHp: 18, note: null, revealHp: false, revealStats: false, archived: false, createdAt: now, updatedAt: now },
    { id: "preview-enemy-archived", name: "Archived Example", initiative: 11, ac: 13, maxHp: 24, note: null, revealHp: false, revealStats: false, archived: true, createdAt: now, updatedAt: now },
  ];
}

export function previewParticipants(): import("@/types").GameParticipant[] {
  const now = Date.now();
  return [
    { uid: "preview-uid", characterId: "preview-uid-char", playerName: "Preview Hunter", name: "Eileen the Crow", classId: "", subclassId: null, className: "Custom class", level: 3, role: "player", joinedAt: now, lastSeen: now },
    { uid: "preview-p2", characterId: "preview-p2-char", playerName: "Father Gascoigne", name: "Gascoigne", classId: "", subclassId: null, className: "Custom class", level: 3, role: "player", joinedAt: now, lastSeen: now },
  ];
}

export function previewPartyCards(): HunterCard[] {
  const eileen = previewCard("preview-uid");
  const gascoigne: HunterCard = {
    ...previewCard("preview-p2"),
    name: "Gascoigne",
    ownerName: "Father Gascoigne",
    sheet: {
      actualName: "Father Gascoigne",
      name: "Gascoigne",
      background: "Player-entered background",
      class: "Custom class",
      level: "3",
      hpCur: "28",
      hpMax: "31",
      ac: "15",
      sanityCur: "6",
      sanityMax: "10",
      initiative: "+1",
      speed: "30 ft",
      coins: "18",
    },
  };
  const henryk = previewCard("preview-p4");
  henryk.name = "Henryk";
  henryk.classId = "legacy-class";
  henryk.background = "Legacy saved background";
  henryk.level = 4;
  henryk.currentHp = 21;
  henryk.sanity = 8;
  henryk.notes = "Legacy values are copied without recalculation.";
  delete henryk.sheet;
  return [eileen, gascoigne, henryk];
}

/** Source-bound synthetic character. Free-text values test the current sheet;
 * they are not a built-in class, equipment, feat, or creature catalog. */
export function previewCard(uid: string): HunterCard {
  const now = Date.now();
  return {
    id: `${uid}-char`,
    ownerUid: uid,
    ownerEmail: "preview@local.dev",
    ownerName: "Preview Hunter",
    campaignId: "preview-campaign",
    name: "Eileen the Crow",
    classId: "",
    subclassId: null,
    background: "Player-entered background",
    level: 3,
    preparedWhispers: ["eldritch-blast"],
    notes: "Synthetic preview notes.",
    sheet: {
      actualName: "Preview Hunter",
      name: "Eileen the Crow",
      background: "Player-entered background",
      class: "Custom class",
      subclass: "Player-entered subclass",
      level: "3",
      insight: "60",
      profBonus: "+2",
      transformation: "2",
      sanityCur: "9",
      sanityMax: "11",
      sanityDice: "2d6",
      hpCur: "22",
      hpMax: "25",
      hpTemp: "0",
      hdCur: "3",
      hdSpent: "0",
      hdMax: "3",
      strScore: "12",
      strMod: "+1",
      strSave: "+1",
      dexScore: "15",
      dexMod: "+2",
      dexSave: "+4",
      conScore: "13",
      conMod: "+1",
      conSave: "+1",
      intScore: "10",
      intMod: "0",
      intSave: "0",
      wisScore: "12",
      wisMod: "+1",
      wisSave: "+3",
      chaScore: "8",
      chaMod: "-1",
      chaSave: "-1",
      skStealth: "+4",
      skStealthP: true,
      skPerception: "+3",
      skPerceptionP: true,
      initiative: "+2",
      speed: "30 ft",
      passivePerception: "13",
      bloodTinge: true,
      ac: "14",
      armorCategory: "Player recorded",
      weight: "38 lb",
      weightCondition: "Player recorded",
      mainArmor: "Player-entered armor",
      addon1: "Player-entered add-on",
      studs1: true,
      coins: "25",
      impressions: "Player-entered impression.",
      storageItems: "Player-entered storage",
      eq_0_0: "Personal item",
      eq_0_1: "Player recorded",
      eq_0_2: "Back",
      eq_0_3: "2 lb",
      weapon_0_0: "Personal weapon",
      weapon_0_1: "+4",
      weapon_0_2: "Player recorded",
      weapon_0_3: "Player notes",
      classFeatures: "Player-entered class features.",
      feats: "Player-entered feats.",
      riteAbility: "Intelligence",
      riteMod: "+2",
      riteDC: "12",
      riteAttack: "+4",
      "whisper_eldritch-blast": true,
      pageNotes: "Synthetic preview notes.",
    },
    createdAt: now,
    updatedAt: now,
  };
}
