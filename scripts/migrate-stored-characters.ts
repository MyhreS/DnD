/**
 * BATCH 6 — stored-character migration for the C&S beta reconciliation.
 *
 * ⚠️ SAFETY CONTRACT (see docs/rules/_reconciliation-plan.md §6.1)
 *
 *   - `--dry-run` is the DEFAULT. A bare invocation READS ONLY and can never
 *     write. The writing path requires the explicit `--apply` flag AND a
 *     verified export of the `/characters` collection (`--backup=<file>`).
 *   - The dry run reports, per character, the doc id, owner uid and name, then
 *     every field it would change as `before -> after`.
 *   - Simon must review and approve the dry-run output before any write.
 *
 * The transformation itself is pure (`planCharacter`) so it is unit-tested
 * against fixtures without touching Firestore — see
 * `scripts/migrate-stored-characters-test.ts`.
 *
 * CLI:
 *   bun run migrate:stored-characters                  # dry run (default)
 *   bun run migrate:stored-characters -- --json        # dry run, machine readable
 *   bun run migrate:stored-characters -- --apply --backup=<export.json>
 *                                                      # refuses without both
 */

import { readFileSync } from "node:fs";
import type { HunterCard, InventoryEntry, SheetData, SlotAssignment } from "../src/types";
import { getClass } from "../src/data/classes";
import { BACKGROUNDS } from "../src/data/backgrounds";
import { ITEM_BY_ID } from "../src/data/items";
import { WEAPON_FACTS } from "../src/data/weapons";
import { ALWAYS_PREPARED_ZEALOT_IDS, TOOL_PROFICIENCIES } from "../src/data/characterOptions";
import { BLOODVIAL_ITEM_ID, DEFAULT_BLOODVIAL_PURITY } from "../src/data/bloodvial";
import { normalizeCard } from "../src/lib/character";
import { startingKit } from "../src/lib/startingEquipment";
import { computeSlots } from "../src/lib/slots";
import { automationFor } from "../src/features/hunter/lib/characterAutomation";

// ---------------------------------------------------------------------------
// The change set (accumulated across implementation batches 1-5)
// ---------------------------------------------------------------------------

/** Item ids that no longer exist in the catalog and must leave every stored
 * inventory, starting kit and slot assignment. `hunter-cleaver` is a deliberate
 * removal (Simon, 2026-09-01) — no remap, no conversion to a custom item. */
export const REMOVED_ITEM_IDS = [
  "hunter-cleaver",
  "bedroll",
  "rations",
  "letter",
  "brewers-supplies",
] as const;

/** Stored weapon-mastery values are weapon NAMES, not ids. */
export const REMOVED_MASTERY_NAMES = ["hunter cleaver"];

/** Legacy `sheet.eq_*` handwritten row names for the removed items. Only the
 * Cleaver row is cleared (the explicit ruling); the rest are reported. */
const REMOVED_EQ_NAMES = new Map<string, string>([
  ["hunter cleaver", "hunter-cleaver"],
  ["bedroll", "bedroll"],
  ["rations", "rations"],
  ["letter", "letter"],
  ["brewer's supplies", "brewers-supplies"],
  ["brewers supplies", "brewers-supplies"],
]);

/** Tool-name strings inside `featSkills[]`. `null` means "drop, no successor" —
 * dropping re-opens the Skilled feat's pending choice, which is correct. */
export const FEAT_SKILL_TOOL_REMAP: Record<string, string | null> = {
  "Mason's Tools": "Cultist's Tools",
  "Tinker's Tools": "Smith's Tools",
  "Brewer's Supplies": null,
};

/** The level at which a subclass becomes available (core-rulebook: level 3). */
const SUBCLASS_LEVEL = 3;

/** Derived sheet keys worth reporting a before -> after delta for. They are all
 * recomputed on read by `resolvedCharacterSheet()`, so they are REPORTED, not
 * written. */
const DERIVED_KEYS = [
  "ac", "armorCategory", "weight", "weightCondition", "speed",
  "passivePerception", "features1", "hpMax", "sanityMax", "tools",
] as const;

// ---------------------------------------------------------------------------
// Plan types
// ---------------------------------------------------------------------------

export type ChangeGroup =
  | "strip:hunter-cleaver"
  | "strip:removed-items"
  | "strip:zealot-granted-whispers"
  | "strip:sheet-insane"
  | "remap:feat-skill-tools"
  | "backfill:bloodvial-purity"
  | "backfill:starting-kit-extra-armor"
  | "backfill:card-defaults";

export interface FieldChange {
  group: ChangeGroup;
  field: string;
  before: unknown;
  after: unknown;
}

export interface DerivedChange {
  field: string;
  before: unknown;
  after: unknown;
  /** True when the player pinned this key by hand — never recompute it. */
  manualOverride: boolean;
}

export interface CharacterPlan {
  id: string;
  ownerUid: string;
  name: string;
  classId: string;
  level: number;
  subclassId: string | null;
  changes: FieldChange[];
  derived: DerivedChange[];
  /** Report-only, never auto-changed — Simon decides case by case. */
  reviews: string[];
  /** §6.7 validation findings: inconsistent or unmigratable stored state. */
  warnings: string[];
  /** Non-empty when the recomputed slot layout no longer fits. */
  overSlotted: string[];
  /** Field-level patch an `--apply` run would write. Deletions are `DELETE`. */
  patch: Record<string, unknown>;
}

/** Sentinel for "delete this field" in a patch (mapped to
 * `FieldValue.delete()` only on the apply path, which is never taken here). */
export const DELETE = Symbol("delete-field");

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

type Raw = Record<string, unknown>;

function asArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

function asObject(value: unknown): Raw {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Raw) : {};
}

function inventoryEntries(value: unknown): InventoryEntry[] {
  return asArray<InventoryEntry>(value).filter(
    (entry) => !!entry && typeof entry === "object" && typeof entry.itemId === "string",
  );
}

function sameJson(a: unknown, b: unknown): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

function normalizeName(value: string): string {
  return value.replace(/\(unique item\)/gi, "").replace(/^\d+\s+/, "").trim().toLowerCase();
}

/** Derive proficiency from the class's own proficiency sentence, e.g. the
 * Stalker's "Simple weapons and Martial weapons with the Finesse or Light
 * property" — a Pistol (Martial, Ammunition only) fails that test. */
function isProficientWith(
  proficiencies: string,
  facts: { category?: string; properties: string },
): boolean {
  if (facts.category === "Simple") return /simple/i.test(proficiencies);
  if (facts.category !== "Martial") return true;
  if (!/martial/i.test(proficiencies)) return false;
  const restriction = /martial weapons with the ([^.]+?) propert/i.exec(proficiencies)?.[1];
  if (!restriction) return true;
  return restriction
    .split(/\s+or\s+|,\s*/)
    .map((word) => word.trim())
    .filter(Boolean)
    .some((word) => new RegExp(`\\b${word}\\b`, "i").test(facts.properties));
}

const WEAPON_NAME_TO_ID = new Map(
  Object.keys(WEAPON_FACTS).map((id) => [normalizeName(ITEM_BY_ID[id]?.name ?? id), id]),
);

// ---------------------------------------------------------------------------
// The pure transform
// ---------------------------------------------------------------------------

/**
 * Compute everything the migration would do to ONE stored character document.
 * Pure: no Firestore, no clock, no network. `data` is the raw document data.
 */
export function planCharacter(id: string, data: Raw): CharacterPlan {
  const removedIds = new Set<string>(REMOVED_ITEM_IDS);
  const changes: FieldChange[] = [];
  const warnings: string[] = [];
  const reviews: string[] = [];
  const patch: Record<string, unknown> = {};

  const level = typeof data.level === "number" && Number.isFinite(data.level) ? data.level : 1;
  const classId = typeof data.classId === "string" ? data.classId : "";
  const subclassId = typeof data.subclassId === "string" ? data.subclassId : null;
  const klass = getClass(classId);
  const background = BACKGROUNDS.find((entry) => entry.id === data.backgroundId) ?? null;
  const sheet = asObject(data.sheet) as SheetData & Raw;
  const automation = asObject(data.sheetAutomation);
  const manualOverrides = new Set(asArray<string>(automation.manualOverrides));

  const add = (group: ChangeGroup, field: string, before: unknown, after: unknown) => {
    changes.push({ group, field, before, after });
    patch[field] = after;
  };

  // --- STRIP: removed item ids from inventory + starting kit ---------------
  const inventory = inventoryEntries(data.inventory);
  const nextInventory = inventory.filter((entry) => !removedIds.has(entry.itemId));
  if (nextInventory.length !== inventory.length) {
    const cleaverOnly = inventory
      .filter((entry) => removedIds.has(entry.itemId))
      .every((entry) => entry.itemId === "hunter-cleaver");
    changes.push({
      group: cleaverOnly ? "strip:hunter-cleaver" : "strip:removed-items",
      field: "inventory",
      before: inventory.filter((entry) => removedIds.has(entry.itemId)),
      after: [],
    });
    patch.inventory = nextInventory;
  }

  const startingKitInventory = inventoryEntries(automation.startingKitInventory);
  let nextStartingKit = startingKitInventory.filter((entry) => !removedIds.has(entry.itemId));
  if (nextStartingKit.length !== startingKitInventory.length) {
    const removedFromKit = startingKitInventory.filter((entry) => removedIds.has(entry.itemId));
    changes.push({
      group: removedFromKit.every((entry) => entry.itemId === "hunter-cleaver")
        ? "strip:hunter-cleaver"
        : "strip:removed-items",
      field: "sheetAutomation.startingKitInventory",
      before: removedFromKit,
      after: [],
    });
    patch["sheetAutomation.startingKitInventory"] = nextStartingKit;
  }

  // --- STRIP: dangling slot assignments -----------------------------------
  const slotAssignments = asObject(data.slotAssignments) as Record<string, Array<SlotAssignment | null>>;
  const danglingSlots = Object.keys(slotAssignments).filter((key) => removedIds.has(key));
  if (danglingSlots.length) {
    const nextSlots = { ...slotAssignments };
    for (const key of danglingSlots) delete nextSlots[key];
    changes.push({
      group: danglingSlots.every((key) => key === "hunter-cleaver")
        ? "strip:hunter-cleaver"
        : "strip:removed-items",
      field: "slotAssignments",
      before: Object.fromEntries(danglingSlots.map((key) => [key, slotAssignments[key]])),
      after: "removed",
    });
    patch.slotAssignments = nextSlots;
  }

  // --- STRIP: hunter-cleaver from legacy sheet.eq_* rows -------------------
  const sheetPatch: Raw = {};
  for (let row = 0; row < 20; row += 1) {
    const cell = sheet[`eq_${row}_0`];
    if (typeof cell !== "string" || !cell.trim()) continue;
    const key = normalizeName(cell);
    const removedId = REMOVED_EQ_NAMES.get(key);
    if (!removedId) continue;
    if (removedId === "hunter-cleaver") {
      changes.push({
        group: "strip:hunter-cleaver",
        field: `sheet.eq_${row}_*`,
        before: cell,
        after: "(cleared)",
      });
      for (const col of [0, 1, 2, 3]) sheetPatch[`eq_${row}_${col}`] = "";
    } else {
      warnings.push(
        `Handwritten sheet row eq_${row}_0 still reads "${cell}" (removed item ${removedId}) — reported, not cleared.`,
      );
    }
  }

  // --- STRIP: "Hunter Cleaver" from stored weapon masteries ----------------
  const masteries = asArray<string>(automation.weaponMasteries).filter((value) => typeof value === "string");
  const nextMasteries = masteries.filter((value) => !REMOVED_MASTERY_NAMES.includes(normalizeName(value)));
  if (nextMasteries.length !== masteries.length) {
    add("strip:hunter-cleaver", "sheetAutomation.weaponMasteries", masteries, nextMasteries);
  }
  for (const value of nextMasteries) {
    const weaponId = WEAPON_NAME_TO_ID.get(normalizeName(value));
    if (!weaponId) {
      warnings.push(`Weapon mastery "${value}" resolves to no catalog weapon — the choice needs re-picking.`);
      continue;
    }
    const facts = WEAPON_FACTS[weaponId];
    if (facts.mastery === "—") {
      warnings.push(`Weapon mastery "${value}" has no mastery property and can never be mastered — re-pick.`);
    } else if (klass && !isProficientWith(klass.weaponProficiencies, facts)) {
      warnings.push(
        `Weapon mastery "${value}" (${facts.category} ${facts.attack}, ${facts.properties}) is outside ` +
        `${klass.title} proficiency ("${klass.weaponProficiencies}") — report only, the choice needs re-picking.`,
      );
    }
  }

  // --- STRIP: granted Zealot Whispers stored as prepared -------------------
  const prepared = asArray<string>(data.preparedWhispers).filter((value) => typeof value === "string");
  if (subclassId === "hunter-zealot" && level >= SUBCLASS_LEVEL) {
    const next = prepared.filter((riteId) => !ALWAYS_PREPARED_ZEALOT_IDS.includes(riteId));
    if (next.length !== prepared.length) {
      add("strip:zealot-granted-whispers", "preparedWhispers", prepared, next);
    }
  }

  // --- STRIP: sheet.insane (now derived: madness >= maxSanity) -------------
  if (Object.prototype.hasOwnProperty.call(sheet, "insane")) {
    changes.push({
      group: "strip:sheet-insane",
      field: "sheet.insane",
      before: sheet.insane,
      after: "(deleted — derived from madness >= Max Sanity)",
    });
    sheetPatch.insane = DELETE;
  }

  // --- REMAP: tool-name strings inside featSkills[] ------------------------
  const featSkills = asArray<string>(data.featSkills).filter((value) => typeof value === "string");
  if (featSkills.length) {
    const next: string[] = [];
    let touched = false;
    for (const value of featSkills) {
      if (!(value in FEAT_SKILL_TOOL_REMAP)) {
        next.push(value);
        continue;
      }
      touched = true;
      const successor = FEAT_SKILL_TOOL_REMAP[value];
      if (successor && !next.includes(successor)) next.push(successor);
    }
    if (touched) {
      add("remap:feat-skill-tools", "featSkills", featSkills, next);
      if (next.length < featSkills.length) {
        reviews.push(
          `Skilled-feat picks dropped to ${next.length} of 3 — the player re-picks in the builder (correct outcome).`,
        );
      }
    }
  }

  // --- BACKFILL: bloodvial purity -----------------------------------------
  const purityTarget = (patch.inventory as InventoryEntry[] | undefined) ?? nextInventory;
  const needsPurity = purityTarget.some(
    (entry) => entry.itemId === BLOODVIAL_ITEM_ID && entry.purity === undefined,
  );
  if (needsPurity) {
    const filled = purityTarget.map((entry) =>
      entry.itemId === BLOODVIAL_ITEM_ID && entry.purity === undefined
        ? { ...entry, purity: DEFAULT_BLOODVIAL_PURITY }
        : entry,
    );
    changes.push({
      group: "backfill:bloodvial-purity",
      field: "inventory[blood-vial].purity",
      before: "(absent — defaults to tainted at read time)",
      after: DEFAULT_BLOODVIAL_PURITY,
    });
    patch.inventory = filled;
  }
  if (nextStartingKit.some((entry) => entry.itemId === BLOODVIAL_ITEM_ID && entry.purity === undefined)) {
    nextStartingKit = nextStartingKit.map((entry) =>
      entry.itemId === BLOODVIAL_ITEM_ID && entry.purity === undefined
        ? { ...entry, purity: DEFAULT_BLOODVIAL_PURITY }
        : entry,
    );
    changes.push({
      group: "backfill:bloodvial-purity",
      field: "sheetAutomation.startingKitInventory[blood-vial].purity",
      before: "(absent)",
      after: DEFAULT_BLOODVIAL_PURITY,
    });
    patch["sheetAutomation.startingKitInventory"] = nextStartingKit;
  }

  // --- BACKFILL: sheetAutomation.startingKitExtraArmorIds ------------------
  if (
    Object.keys(automation).length > 0 &&
    automation.startingKitApplied === true &&
    automation.startingKitExtraArmorIds === undefined
  ) {
    const { extraArmorIds } = startingKit(klass, background);
    add("backfill:starting-kit-extra-armor", "sheetAutomation.startingKitExtraArmorIds", "(absent)", extraArmorIds);
    const worn = asArray<string>(data.extraArmorIds);
    for (const armorId of extraArmorIds) {
      if (!worn.includes(armorId)) {
        warnings.push(
          `Starting kit granted Extra armor "${armorId}" but it is not in extraArmorIds — the head gear was removed or never applied.`,
        );
      }
    }
  }

  // --- BACKFILL: new optional HunterCard fields ---------------------------
  const defaults: Array<[string, unknown, (value: unknown) => boolean]> = [
    ["notTonight", true, (value) => typeof value === "boolean"],
    ["favors", 0, (value) => typeof value === "number" && Number.isFinite(value)],
    ["sleeplessCounter", 0, (value) => typeof value === "number" && Number.isFinite(value)],
    ["exhaustion", 0, (value) => typeof value === "number" && Number.isFinite(value)],
  ];
  for (const [field, value, valid] of defaults) {
    if (!valid(data[field])) add("backfill:card-defaults", field, data[field] ?? "(absent)", value);
  }

  if (Object.keys(sheetPatch).length) {
    for (const [key, value] of Object.entries(sheetPatch)) patch[`sheet.${key}`] = value;
  }

  // --- §6.7 validation checks (report, never fix) --------------------------
  if (!klass) warnings.push(`Unknown classId "${classId}" — the card cannot be recomputed.`);
  if (subclassId && level < SUBCLASS_LEVEL) {
    warnings.push(`Subclass "${subclassId}" is set on a level-${level} hunter (subclasses unlock at ${SUBCLASS_LEVEL}).`);
  }
  if (subclassId && klass && !klass.subclasses.some((entry) => entry.id === subclassId)) {
    warnings.push(`Subclass "${subclassId}" does not belong to class "${classId}".`);
  }
  if (data.backgroundId !== undefined && !background) {
    warnings.push(`Unknown backgroundId "${String(data.backgroundId)}".`);
  }
  for (const entry of nextInventory) {
    if (!ITEM_BY_ID[entry.itemId] && !asArray<{ id?: string }>(data.customItems).some((item) => item?.id === entry.itemId)) {
      warnings.push(`Inventory references unknown item id "${entry.itemId}" (qty ${entry.qty}).`);
    }
    if (typeof entry.qty !== "number" || !Number.isFinite(entry.qty) || entry.qty <= 0) {
      warnings.push(`Inventory entry "${entry.itemId}" has an invalid qty ${String(entry.qty)}.`);
    }
  }
  for (const value of asArray<string>(patch.featSkills ?? data.featSkills)) {
    const known = (TOOL_PROFICIENCIES as readonly string[]).includes(value);
    if (!known && value in FEAT_SKILL_TOOL_REMAP) {
      warnings.push(`featSkills still holds unmigrated tool "${value}".`);
    }
  }
  const abilities = asObject(data.abilities);
  if (classId === "bloodbound" && level === 20 && (abilities.str === 20 || abilities.con === 20)) {
    warnings.push(
      "Level-20 Bloodbound with STR/CON exactly 20 — a pre-truncation value is unrecoverable; verify by hand.",
    );
  }
  if (Object.prototype.hasOwnProperty.call(data, "deathPending")) {
    warnings.push("Legacy `deathPending` field present — nothing reads it any more (not in this migration's change set).");
  }

  // --- Report-only: the speed / passive-perception double-count guard ------
  const speedModifier = Number(sheet.speedModifier ?? 0);
  const passiveModifier = Number(sheet.passivePerceptionModifier ?? 0);

  // --- Derived recompute (reported, not written) --------------------------
  const derived: DerivedChange[] = [];
  let overSlotted: string[] = [];
  if (klass) {
    const migrated = normalizeCard(applyPatch(data, patch) as unknown as HunterCard);
    // The UNFILTERED projection: manual overrides are reported (§6.7 check 5)
    // rather than hidden, but they are never written either way.
    const computed = automationFor(migrated).fields;
    for (const key of DERIVED_KEYS) {
      const before = sheet[key];
      const after = computed[key];
      if (after === undefined || sameJson(before, after)) continue;
      derived.push({ field: `sheet.${key}`, before: before ?? "(absent)", after, manualOverride: manualOverrides.has(key) });
    }
    if (speedModifier !== 0) {
      reviews.push(
        `REVIEW speedModifier = ${speedModifier > 0 ? "+" : ""}${speedModifier} ft; computed Speed is now ${String(computed.speed ?? "?")} ` +
        "(carry conditions and Roving/Speedy now reach the readout — this may double-count). Never auto-stripped.",
      );
    }
    if (passiveModifier !== 0) {
      reviews.push(
        `REVIEW passivePerceptionModifier = ${passiveModifier > 0 ? "+" : ""}${passiveModifier}; computed Passive Perception is now ` +
        `${String(computed.passivePerception ?? "?")} (Expertise now doubles proficiency — this may double-count).`,
      );
    }
    const slots = computeSlots(migrated);
    overSlotted = slots.unstowed.map((row) => `${row.name} ×${row.count}${row.clamped ? "+" : ""}`);
  }
  for (const key of manualOverrides) {
    if (derived.some((row) => row.field === `sheet.${key}`)) {
      warnings.push(`Manual override on "${key}" blocks a recompute that would otherwise apply.`);
    }
  }

  return {
    id,
    ownerUid: typeof data.ownerUid === "string" ? data.ownerUid : "(none)",
    name: typeof data.name === "string" ? data.name : "(unnamed)",
    classId,
    level,
    subclassId,
    changes,
    derived,
    reviews,
    warnings,
    overSlotted,
    patch,
  };
}

/** Apply a dotted-path patch to a copy of the raw doc (in memory only). */
export function applyPatch(data: Raw, patch: Record<string, unknown>): Raw {
  const next: Raw = { ...data, sheet: { ...asObject(data.sheet) }, sheetAutomation: { ...asObject(data.sheetAutomation) } };
  for (const [path, value] of Object.entries(patch)) {
    const [head, ...rest] = path.split(".");
    if (!rest.length) {
      if (value === DELETE) delete next[head];
      else next[head] = value;
      continue;
    }
    const container = asObject(next[head]);
    if (value === DELETE) delete container[rest.join(".")];
    else container[rest.join(".")] = value;
    next[head] = container;
  }
  if (!Object.keys(asObject(next.sheetAutomation)).length) delete next.sheetAutomation;
  if (!Object.keys(asObject(next.sheet)).length) delete next.sheet;
  return next;
}

/** True when the plan would write something. Derived diffs and reviews do NOT
 * count — they are recomputed on read and need no stored rewrite. */
export function planWrites(plan: CharacterPlan): boolean {
  return plan.changes.length > 0;
}

// ---------------------------------------------------------------------------
// Reporting
// ---------------------------------------------------------------------------

const GROUP_TITLES: Record<ChangeGroup, string> = {
  "strip:hunter-cleaver": "STRIP — Hunter Cleaver (deliberate removal, no remap)",
  "strip:removed-items": "STRIP — removed item ids (bedroll / rations / letter / brewer's supplies)",
  "strip:zealot-granted-whispers": "STRIP — Zealot Whispers now granted, not stored",
  "strip:sheet-insane": "STRIP — sheet.insane (now derived)",
  "remap:feat-skill-tools": "REMAP — tool names inside featSkills[]",
  "backfill:bloodvial-purity": "BACKFILL — blood-vial purity",
  "backfill:starting-kit-extra-armor": "BACKFILL — sheetAutomation.startingKitExtraArmorIds",
  "backfill:card-defaults": "BACKFILL — new optional HunterCard fields",
};

/** Terminal-readable rendering. Long prose (e.g. the regenerated `features1`
 * class text) is elided so the human review stays scannable — `--json` carries
 * the untruncated value. */
function show(value: unknown, limit = 160): string {
  if (value === DELETE) return "(deleted)";
  const text = typeof value === "string" ? value : JSON.stringify(value) ?? String(value);
  const flat = text.replace(/\s+/g, " ").trim();
  return flat.length > limit ? `${flat.slice(0, limit)}… [${flat.length} chars]` : flat;
}

export function renderReport(plans: CharacterPlan[], apply = false): string {
  const out: string[] = [];
  const line = (text = "") => out.push(text);
  const affected = plans.filter(planWrites);

  line("=".repeat(78));
  line("BATCH 6 — STORED-CHARACTER MIGRATION · DRY RUN (nothing was written)");
  line("=".repeat(78));
  line();

  const groups = Object.keys(GROUP_TITLES) as ChangeGroup[];
  for (const group of groups) {
    const rows = plans.filter((plan) => plan.changes.some((change) => change.group === group));
    if (!rows.length) continue;
    line(`\n### ${GROUP_TITLES[group]}  (${rows.length} character${rows.length === 1 ? "" : "s"})`);
    line("-".repeat(78));
    for (const plan of rows) {
      line(`  ${plan.name} — ${plan.classId} lvl ${plan.level}${plan.subclassId ? ` / ${plan.subclassId}` : ""}`);
      line(`    doc ${plan.id}  owner ${plan.ownerUid}`);
      for (const change of plan.changes.filter((entry) => entry.group === group)) {
        line(`      ${change.field}: ${show(change.before)}  ->  ${show(change.after)}`);
      }
    }
  }

  const derivedRows = plans.filter((plan) => plan.derived.length);
  if (derivedRows.length) {
    line(`\n### DERIVED — recomputed on read, NO stored rewrite needed  (${derivedRows.length} characters)`);
    line("-".repeat(78));
    line("  These sheet snapshots are stale, but `resolvedCharacterSheet()` recomputes");
    line("  them on every read, so the app already shows the right value. Listed for");
    line("  review only; the migration does not write them.");
    for (const plan of derivedRows) {
      line(`  ${plan.name} (${plan.id})`);
      for (const change of plan.derived) {
        line(`      ${change.field}: ${show(change.before)}  ->  ${show(change.after)}${change.manualOverride ? "   [MANUAL OVERRIDE — skipped]" : ""}`);
      }
    }
  }

  const reviewRows = plans.filter((plan) => plan.reviews.length);
  line(`\n${"=".repeat(78)}`);
  line(`⚠️  REVIEW CASES — NEVER AUTO-CHANGED (${reviewRows.length} characters)`);
  line("=".repeat(78));
  if (!reviewRows.length) line("  None.");
  for (const plan of reviewRows) {
    line(`  ${plan.name} — ${plan.classId} lvl ${plan.level} · doc ${plan.id} · owner ${plan.ownerUid}`);
    for (const note of plan.reviews) line(`      ${note}`);
  }

  const overSlotted = plans.filter((plan) => plan.overSlotted.length);
  line(`\n${"=".repeat(78)}`);
  line(`⚠️  OVER-SLOTTED HUNTERS (${overSlotted.length}) — items with nowhere to go after the`);
  line("    tool sets became Significant. No mechanical penalty; the player re-places them.");
  line("=".repeat(78));
  if (!overSlotted.length) line("  None.");
  for (const plan of overSlotted) {
    line(`  ${plan.name} (${plan.id}): ${plan.overSlotted.join(", ")}`);
  }

  const flagged = plans.filter((plan) => plan.warnings.length);
  line(`\n${"=".repeat(78)}`);
  line(`⚠️  VALIDATION FLAGS — inconsistent or unmigratable stored state (${flagged.length})`);
  line("=".repeat(78));
  if (!flagged.length) line("  None.");
  for (const plan of flagged) {
    line(`  ${plan.name} (${plan.id}) owner ${plan.ownerUid}`);
    for (const note of plan.warnings) line(`      - ${note}`);
  }

  const counts = new Map<ChangeGroup, number>();
  for (const plan of plans) {
    for (const group of new Set(plan.changes.map((change) => change.group))) {
      counts.set(group, (counts.get(group) ?? 0) + 1);
    }
  }
  line(`\n${"=".repeat(78)}`);
  line("SUMMARY");
  line("=".repeat(78));
  line(`  Characters scanned        : ${plans.length}`);
  line(`  Characters to be written  : ${affected.length}`);
  for (const group of groups) {
    if (counts.get(group)) line(`    ${GROUP_TITLES[group].padEnd(64)} ${counts.get(group)}`);
  }
  line(`  Derived-only differences  : ${derivedRows.length}  (no write)`);
  line(`  speedModifier / passive review cases : ${reviewRows.length}`);
  line(`  Over-slotted hunters      : ${overSlotted.length}`);
  line(`  Validation flags          : ${flagged.length}`);
  line();
  if (apply) {
    line("  --apply WAS PASSED. The writes listed above are about to be committed.");
  } else {
    line("  NOTHING WAS WRITTEN. This is a dry run.");
    line("  An --apply run additionally requires --backup=<export.json> covering every doc.");
  }
  return out.join("\n");
}

// ---------------------------------------------------------------------------
// CLI — dry run by DEFAULT
// ---------------------------------------------------------------------------

interface Options {
  apply: boolean;
  backupPath: string | null;
  json: boolean;
}

export function parseArgs(argv: string[]): Options {
  const backup = argv.find((arg) => arg.startsWith("--backup="));
  return {
    // The ONLY way to reach the writing path. Absent => dry run.
    apply: argv.includes("--apply"),
    backupPath: backup ? backup.slice("--backup=".length) : null,
    json: argv.includes("--json"),
  };
}

/**
 * A real precondition, not a comment: the apply path refuses unless a JSON
 * export of `/characters` exists on disk and contains a snapshot for every
 * document the migration would write.
 */
export function assertBackupCovers(backupPath: string | null, docIds: string[]): void {
  if (!backupPath) {
    throw new Error(
      "REFUSING TO WRITE: --apply requires --backup=<file>, a JSON export of the /characters collection.",
    );
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(readFileSync(backupPath, "utf8"));
  } catch (error) {
    throw new Error(`REFUSING TO WRITE: backup "${backupPath}" is missing or not valid JSON (${String(error)}).`);
  }
  const ids = new Set<string>(
    Array.isArray(parsed)
      ? parsed.map((row) => String((row as Raw)?.id ?? ""))
      : Object.keys(asObject(parsed)),
  );
  const missing = docIds.filter((id) => !ids.has(id));
  if (missing.length) {
    throw new Error(
      `REFUSING TO WRITE: backup "${backupPath}" does not cover ${missing.length} document(s): ${missing.slice(0, 5).join(", ")}…`,
    );
  }
}

async function main(): Promise<void> {
  const options = parseArgs(process.argv.slice(2));

  const serviceAccount = process.env.AGENT_TEST_SA;
  if (!serviceAccount) throw new Error("Missing AGENT_TEST_SA. Run this migration through Doppler.");
  const credentials = JSON.parse(serviceAccount);
  const { cert, getApps, initializeApp } = await import("firebase-admin/app");
  const { getFirestore, FieldValue } = await import("firebase-admin/firestore");
  const app = getApps()[0] ?? initializeApp({ credential: cert(credentials), projectId: credentials.project_id });
  const db = getFirestore(app);

  const snapshot = await db.collection("characters").get();
  const plans = snapshot.docs.map((doc) => planCharacter(doc.id, doc.data() as Raw));

  if (options.json) console.log(JSON.stringify(plans, (_key, value) => (value === DELETE ? "__DELETE__" : value), 2));
  else console.log(renderReport(plans, options.apply));

  if (!options.apply) {
    console.log("\nDry run complete — no writes were issued. Pass --apply --backup=<file> only after Simon approves.");
    return;
  }

  const writable = plans.filter(planWrites);
  assertBackupCovers(options.backupPath, writable.map((plan) => plan.id));
  for (let index = 0; index < writable.length; index += 400) {
    const batch = db.batch();
    for (const plan of writable.slice(index, index + 400)) {
      const update = Object.fromEntries(
        Object.entries(plan.patch).map(([key, value]) => [key, value === DELETE ? FieldValue.delete() : value]),
      );
      batch.update(db.collection("characters").doc(plan.id), update);
    }
    await batch.commit();
  }
  console.log(`Applied ${writable.length} character migrations.`);
}

if (import.meta.main) await main();
