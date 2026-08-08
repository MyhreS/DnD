import type { User } from "firebase/auth";
import { capabilities, type Identity } from "@/config";
import type { AccessRole, AllowlistMember, PlayerType } from "@/types";

// Dev-only "preview mode": run the app locally as any role WITHOUT Google
// sign-in, so the UI (and an AI driving Playwright) can move between pages for
// each role. Activate with `?preview=admin.dm` (or `moderator`, `user.player`,
// `dm`, …). The choice is persisted to localStorage so navigation keeps it.
// Disable with `?preview=off`. Data calls still hit Firestore and may show empty
// states — this is for inspecting layout & role-gated UI, not real data.

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
  const user = {
    uid: "preview-uid",
    email: "preview@local.dev",
    displayName: "Preview Hunter",
    photoURL: null,
  } as unknown as User;
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

/** A sample campaign so the main menu / scoped app render in preview mode. */
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

/** A sample live game (lobby) so Play mode renders in preview mode. */
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
    phase: "exploration",
    combat: {
      active: true,
      round: 2,
      turnId: "prev-monster-1",
      designatedWardenId: "prev-pc-2",
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
    endedPhase: null,
  };
}

/** Sample combatants so the combat tracker renders in preview mode. */
export function previewCombatants(): import("@/types").Combatant[] {
  const now = Date.now();
  return [
    { id: "prev-monster-1", kind: "monster", name: "Cleric Beast", characterId: null, initiative: 19, ac: 14, maxHp: 80, currentHp: 52, conditions: ["poisoned"], conditionSince: { poisoned: 1 }, note: "Claws +6 to hit, 2d8+3 slashing; howl frightens on hit", createdAt: now },
    { id: "prev-pc-1", kind: "pc", name: "Eileen the Crow", characterId: "preview-uid-char", initiative: 17, ac: null, maxHp: null, currentHp: null, conditions: ["frightened"], conditionSince: { frightened: 1 }, createdAt: now },
    { id: "prev-pc-2", kind: "pc", name: "Gascoigne", characterId: "preview-p2-char", initiative: 12, ac: null, maxHp: null, currentHp: null, conditions: ["prone"], conditionSince: { prone: 2 }, isWarden: true, createdAt: now },
  ];
}

export function previewEnemyTemplates(): import("@/types").EnemyTemplate[] {
  const now = Date.now();
  return [
    { id: "preview-cleric-beast", name: "Cleric Beast", initiative: 19, ac: 14, maxHp: 80, note: "Claws +6 to hit; howl frightens on hit", revealHp: false, revealStats: false, archived: false, createdAt: now, updatedAt: now },
    { id: "preview-grave-hound", name: "Grave Hound", initiative: 14, ac: 12, maxHp: 18, note: "Fast and territorial", revealHp: false, revealStats: false, archived: false, createdAt: now, updatedAt: now },
    { id: "preview-old-huntsman", name: "Old Huntsman", initiative: 11, ac: 13, maxHp: 24, note: null, revealHp: false, revealStats: false, archived: true, createdAt: now, updatedAt: now },
  ];
}

/** Sample participants so the lobby / DM board look populated in preview.
 * Gascoigne is a sheet-made hunter: classId "" + the sheet's class text. */
export function previewParticipants(): import("@/types").GameParticipant[] {
  const now = Date.now();
  return [
    { uid: "preview-uid", characterId: "preview-uid-char", playerName: "Preview Hunter", name: "Eileen the Crow", classId: "scout", subclassId: "marksman", className: "Stalker", level: 3, role: "player", joinedAt: now, lastSeen: now },
    { uid: "preview-p2", characterId: "preview-p2-char", playerName: "Father Gascoigne", name: "Gascoigne", classId: "", subclassId: null, className: "Bloodbound", level: 3, role: "player", joinedAt: now, lastSeen: now },
  ];
}

/** Sample party cards for the DM's character board. Gascoigne is SHEET-ONLY
 * (classId "", no structured build) so play surfaces prove they read hunters
 * through the paper sheet — vitals parse from its free-text boxes. */
export function previewPartyCards(): import("@/types").HunterCard[] {
  const eileen = previewCard("preview-uid");
  const gascoigne: import("@/types").HunterCard = {
    ...previewCard("preview-p2"),
    name: "Gascoigne",
    classId: "",
    subclassId: null,
    level: 3,
    currentHp: undefined,
    sanity: undefined,
    deathPending: false,
    transformationLevel: 0,
    activeTransformations: [],
    sheet: {
      name: "Gascoigne",
      background: "Cleric of the Old Ways",
      class: "Bloodbound",
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
  // Henryk is a LEGACY structured-builder card: real fields, NO `sheet` map —
  // exactly what pre-papersheet hunters and test-run bot cards look like. He
  // proves the derived-sheet fallback (a sheet-less card must never render a
  // blank paper sheet).
  const henrykBase = previewCard("preview-p4");
  delete henrykBase.sheet;
  const henryk: import("@/types").HunterCard = {
    ...henrykBase,
    name: "Henryk",
    classId: "stalker",
    subclassId: null,
    background: "Old Hunter",
    level: 4,
    lastSeenLevel: 4,
    feats: [],
    abilities: { str: 10, dex: 16, con: 12, int: 10, wis: 14, cha: 8 },
    baseAbilities: { str: 10, dex: 16, con: 12, int: 10, wis: 14, cha: 8 },
    skillProficiencies: ["Stealth", "Perception"],
    mainArmorId: "hunter-leather-coat",
    addonArmorIds: [],
    studdedAddonIds: [],
    studdedAddons: 0,
    extraArmorIds: [],
    currentHp: 21,
    sanity: 8,
    transformationLevel: 0,
    activeTransformations: [],
    insight: 32,
    bloodTinge: false,
    preparedWhispers: [],
    coins: 14,
    equippedStorageIds: [],
    inventory: [{ itemId: "dagger", qty: 2 }],
    droppedItems: [],
    deathPending: false,
    notes: "",
  };
  return [eileen, gascoigne, henryk];
}

/** A sample archived (dead) character so the DM's character board renders. */
export function previewArchive(): import("@/types").ArchivedCharacter[] {
  const base = previewCard("preview-p3");
  return [
    {
      id: "preview-archive-1",
      originalUid: "preview-p3",
      gameId: "preview-game",
      reason: "dead",
      archivedAt: Date.now(),
      card: {
        ...base,
        name: "Viktor the Lost",
        classId: "deepcaller",
        subclassId: "hunter-zealot",
        level: 2,
        lastSeenLevel: 2,
        currentHp: 0,
        preparedWhispers: ["eldritch-blast", "mindcrack"],
      },
    },
  ];
}

/** A sample hunter card so the Character/Party views render in preview mode.
 * `uid` is the owner; the character id is derived from it. */
export function previewCard(uid: string): import("@/types").HunterCard {
  const now = Date.now();
  return {
    id: `${uid}-char`,
    ownerUid: uid,
    ownerEmail: "preview@local.dev",
    ownerName: "Preview Hunter",
    // In the sample campaign — the DM board and "play as" list filter on this.
    campaignId: "preview-campaign",
    name: "Eileen the Crow",
    classId: "scout",
    subclassId: "marksman",
    background: "Plague Doctor",
    level: 3,
    lastSeenLevel: 3,
    feats: ["Tough"],
    abilityMode: "pointbuy",
    abilities: { str: 12, dex: 15, con: 13, int: 10, wis: 12, cha: 8 },
    baseAbilities: { str: 12, dex: 15, con: 13, int: 10, wis: 12, cha: 8 },
    skillProficiencies: ["Stealth", "Perception", "Survival"],
    mainArmorId: "hunter-leather-coat",
    addonArmorIds: ["leather-pauldron-right", "leather-vambrace-right"],
    studdedAddonIds: ["leather-pauldron-right"],
    studdedAddons: 1, // legacy mirror
    extraArmorIds: ["tricorn"],
    currentHp: 22,
    sanity: 9,
    transformationLevel: 2,
    activeTransformations: ["dreadbloodEars"],
    insight: 60,
    bloodTinge: true,
    preparedWhispers: [],
    coins: 25,
    // Bandolier WORN (chest slots), tool belt still in the pack — so preview
    // screenshots exercise the storage panel, slot columns and equip actions.
    equippedStorageIds: ["bandolier"],
    inventory: [
      { itemId: "hunter-rifle", qty: 1 },
      { itemId: "hunter-cleaver", qty: 1 },
      { itemId: "pistol", qty: 1 },
      { itemId: "dagger", qty: 2 },
      { itemId: "bullets", qty: 1 },
      { itemId: "blood-vial", qty: 3 },
      { itemId: "rope", qty: 1 },
      { itemId: "lantern", qty: 1 },
      { itemId: "tool-belt", qty: 1 },
    ],
    // One recently dropped line (2 min ago) so preview screenshots show the
    // #136 recovery section with a live countdown.
    droppedItems: [{ itemId: "torch", qty: 1, droppedAt: now - 2 * 60_000 }],
    notes: "Hunts the beasts that were once hunters.",
    // The paper sheet IS the character now — a filled sample so /character,
    // party rows and the DM's play-as view render a real-looking sheet in
    // preview. The structured fields above stay for the play-mode boards.
    sheet: {
      name: "Eileen the Crow",
      background: "Plague Doctor",
      class: "Stalker",
      subclass: "Marksman",
      level: "3",
      insight: "60",
      profBonus: "+2",
      transformation: "2",
      sanityCur: "9",
      sanityMax: "11",
      sanityDice: "2d6",
      hpCur: "22",
      hpMax: "25",
      hdCur: "3",
      hdSpent: "0",
      hdMax: "3",
      strScore: "12",
      strMod: "+1",
      dexScore: "15",
      dexMod: "+2",
      dexSaveP: true,
      conScore: "13",
      conMod: "+1",
      intScore: "10",
      intMod: "0",
      wisScore: "12",
      wisMod: "+1",
      chaScore: "8",
      chaMod: "-1",
      skStealth: "+4",
      skStealthP: true,
      skPerception: "+3",
      skPerceptionP: true,
      skSurvival: "+3",
      skSurvivalP: true,
      initiative: "+2",
      speed: "30 ft",
      passivePerception: "13",
      bloodTinge: true,
      ac: "14",
      armorCategory: "Light",
      weight: "38 lb",
      weightCondition: "Fine",
      mainArmor: "Hunter Leather Coat (AC 12)",
      headGear: "Tricorn",
      addon1: "Leather Pauldron (right)",
      studs1: true,
      addon2: "Leather Vambrace (right)",
      shieldArm: true,
      coins: "25",
      impressions: "Reads as a wandering plague doctor — beak mask and all.",
      storageItems: "Bandolier (worn)",
      armorLight: true,
      wepSimple: true,
      wepMartial: true,
      eq_0_0: "Hunter Rifle",
      eq_0_1: "Significant",
      eq_0_2: "Back",
      eq_0_3: "9 lb",
      eq_1_0: "Hunter Cleaver",
      eq_1_1: "Significant",
      eq_1_2: "Hip",
      eq_1_3: "4 lb",
      wd_0_0: "Hunter Rifle",
      wd_0_1: "+4",
      wd_0_2: "Piercing",
      wd_0_3: "1d10, loud",
      feats: "Tough — +2 HP per level.",
      // BOTH legacy Class Features columns filled — preview exercises the
      // single-box lazy merge (MergeTa): display joins them, first edit
      // persists the merged text and empties features2.
      features1: "Deft Strike — once per turn, +1d6 damage when you have advantage.",
      features2: "Marksman's Eye — no disadvantage on long-range rifle shots.",
    },
    createdAt: now,
    updatedAt: now,
  };
}
