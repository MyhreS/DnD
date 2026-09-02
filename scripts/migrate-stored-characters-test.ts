/**
 * Unit coverage for the BATCH 6 stored-character migration transform.
 *
 * This is data-destructive code, so every rule is exercised against in-memory
 * fixture cards. NOTHING here touches Firestore or the network: only the pure
 * `planCharacter` / `applyPatch` / `assertBackupCovers` / `parseArgs` exports
 * are imported, and the script's Firestore code lives behind `import.meta.main`
 * plus a lazy `await import("firebase-admin/…")`.
 */

import { strict as assert } from "node:assert";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  applyPatch,
  assertBackupCovers,
  DELETE,
  parseArgs,
  planCharacter,
  planWrites,
  renderReport,
  type CharacterPlan,
  type ChangeGroup,
} from "./migrate-stored-characters";

type Raw = Record<string, unknown>;

/** A minimally valid stored character document. */
function fixture(overrides: Raw = {}): Raw {
  return {
    ownerUid: "uid-1",
    ownerEmail: "player@example.com",
    ownerName: "Player One",
    name: "Test Hunter",
    classId: "scout",
    background: "Cultist",
    backgroundId: "cultist",
    level: 3,
    abilities: { str: 12, dex: 15, con: 13, int: 10, wis: 14, cha: 8 },
    skillProficiencies: [],
    mainArmorId: null,
    // The Scout's class head gear — present so the base fixture is already
    // migrated for the class-head-gear group (see its own tests below).
    extraArmorIds: ["cavalier-hat"],
    notes: "",
    updatedAt: 0,
    createdAt: 0,
    notTonight: true,
    favors: 0,
    sleeplessCounter: 0,
    exhaustion: 0,
    ...overrides,
  };
}

function groups(plan: CharacterPlan): ChangeGroup[] {
  return [...new Set(plan.changes.map((change) => change.group))];
}

function change(plan: CharacterPlan, field: string) {
  return plan.changes.find((entry) => entry.field === field);
}

// --- A clean current card is untouched --------------------------------------
{
  const plan = planCharacter("clean", fixture({ inventory: [{ itemId: "shortsword", qty: 1 }] }));
  assert.equal(planWrites(plan), false, "a card with nothing to migrate is not written");
  assert.deepEqual(plan.changes, []);
}

// --- STRIP: hunter-cleaver --------------------------------------------------
{
  const plan = planCharacter("cleaver", fixture({
    inventory: [{ itemId: "hunter-cleaver", qty: 1 }, { itemId: "rope", qty: 1 }],
    slotAssignments: { "hunter-cleaver": [{ location: "back" }], rope: [null] },
    sheet: { eq_0_0: "Hunter Cleaver", eq_0_1: "Significant", eq_0_2: "Back", eq_0_3: "6" },
    sheetAutomation: { version: 3, classSkills: [], weaponMasteries: ["Hunter Cleaver", "Shortsword"] },
  }));
  assert.ok(groups(plan).includes("strip:hunter-cleaver"));
  assert.deepEqual(plan.patch.inventory, [{ itemId: "rope", qty: 1 }], "cleaver leaves inventory, rope stays");
  assert.deepEqual(Object.keys(plan.patch.slotAssignments as Raw), ["rope"], "dangling slot key pruned");
  assert.deepEqual(plan.patch["sheetAutomation.weaponMasteries"], ["Shortsword"], "cleaver mastery stripped by NAME");
  assert.equal(plan.patch["sheet.eq_0_0"], "", "the handwritten cleaver row is cleared");
  assert.equal(plan.patch["sheet.eq_0_3"], "");
  // Explicitly NOT remapped and NOT preserved as a custom item.
  assert.equal(JSON.stringify(plan.patch).includes("shortsword"), false, "no remap to Shortsword");
  assert.equal(plan.patch.customItems, undefined, "no conversion to a custom item");
}

// --- STRIP: the other removed item ids --------------------------------------
{
  const plan = planCharacter("removed", fixture({
    inventory: [
      { itemId: "bedroll", qty: 1 },
      { itemId: "rations", qty: 5 },
      { itemId: "letter", qty: 1 },
      { itemId: "brewers-supplies", qty: 1 },
      { itemId: "rope", qty: 1 },
    ],
    sheetAutomation: {
      version: 3,
      classSkills: [],
      startingKitApplied: true,
      startingKitExtraArmorIds: [],
      startingKitInventory: [{ itemId: "bedroll", qty: 1 }, { itemId: "rope", qty: 1 }],
    },
  }));
  assert.deepEqual(plan.patch.inventory, [{ itemId: "rope", qty: 1 }]);
  assert.deepEqual(plan.patch["sheetAutomation.startingKitInventory"], [{ itemId: "rope", qty: 1 }]);
  assert.ok(groups(plan).includes("strip:removed-items"));
}

// --- NO REMAP for `lantern` (the id was reused, not replaced) ---------------
{
  const plan = planCharacter("lantern", fixture({ inventory: [{ itemId: "lantern", qty: 1 }] }));
  assert.equal(JSON.stringify(plan.patch).includes("lantern-hooded"), false, "lantern must never be remapped");
  assert.equal(plan.changes.some((entry) => entry.field === "inventory"), false, "the lantern entry is untouched");
  assert.equal(plan.warnings.some((note) => note.includes("lantern")), false, "lantern still resolves in the catalog");
}

// --- NO REMAP for book-of-eldritch-knowledge (id kept, display name changed) -
{
  const plan = planCharacter("book", fixture({ inventory: [{ itemId: "book-of-eldritch-knowledge", qty: 1 }] }));
  assert.equal(JSON.stringify(plan.patch).includes("book-of-the-deepcaller"), false, "the id is unchanged");
  assert.equal(plan.warnings.length, 0, "the stored id still resolves");
}

// --- STRIP: granted Zealot Whispers -----------------------------------------
{
  const zealot = fixture({
    classId: "deepcaller",
    subclassId: "hunter-zealot",
    level: 5,
    preparedWhispers: ["eldritch-strike", "armor-of-the-drowned-star", "invisibility"],
  });
  const plan = planCharacter("zealot", zealot);
  assert.deepEqual(plan.patch.preparedWhispers, ["invisibility"], "granted entries no longer double-count");

  const young = planCharacter("zealot-2", { ...zealot, level: 2 });
  assert.equal(young.patch.preparedWhispers, undefined, "below level 3 the Whispers are not granted, so nothing is stripped");
  assert.ok(young.warnings.some((note) => note.includes("level-2")), "a subclass below its level is flagged");
}

// --- STRIP: sheet.insane ----------------------------------------------------
{
  const plan = planCharacter("insane", fixture({ sheet: { insane: true } }));
  assert.equal(plan.patch["sheet.insane"], DELETE);
  assert.equal(change(plan, "sheet.insane")?.before, true);
  // A stored `false` is equally stale and equally removed.
  const other = planCharacter("insane-false", fixture({ sheet: { insane: false } }));
  assert.equal(other.patch["sheet.insane"], DELETE);
}

// --- REMAP: tool names inside featSkills[] ----------------------------------
{
  const plan = planCharacter("tools", fixture({
    featSkills: ["Mason's Tools", "Tinker's Tools", "Brewer's Supplies"],
  }));
  assert.deepEqual(plan.patch.featSkills, ["Cultist's Tools", "Smith's Tools"], "two remap, one drops");
  assert.ok(plan.reviews.some((note) => note.includes("Skilled-feat picks dropped to 2 of 3")));
}

// --- BACKFILL: bloodvial purity ---------------------------------------------
{
  const plan = planCharacter("vials", fixture({
    inventory: [{ itemId: "blood-vial", qty: 3 }, { itemId: "rope", qty: 1 }],
    sheetAutomation: {
      version: 3, classSkills: [], startingKitApplied: true, startingKitExtraArmorIds: [],
      startingKitInventory: [{ itemId: "blood-vial", qty: 2 }],
    },
  }));
  assert.deepEqual(plan.patch.inventory, [
    { itemId: "blood-vial", qty: 3, purity: "tainted" },
    { itemId: "rope", qty: 1 },
  ]);
  assert.deepEqual(plan.patch["sheetAutomation.startingKitInventory"], [
    { itemId: "blood-vial", qty: 2, purity: "tainted" },
  ]);
  // An explicit purity is never overwritten.
  const kept = planCharacter("vials-2", fixture({
    inventory: [{ itemId: "blood-vial", qty: 1, purity: "pure" }],
  }));
  assert.equal(kept.patch.inventory, undefined, "a stored purity is left alone");
}

// --- BACKFILL: startingKitExtraArmorIds -------------------------------------
{
  const plan = planCharacter("extras", fixture({
    classId: "scout",
    extraArmorIds: ["cavalier-hat"],
    sheetAutomation: { version: 3, classSkills: [], startingKitApplied: true },
  }));
  const backfilled = plan.patch["sheetAutomation.startingKitExtraArmorIds"] as string[];
  assert.ok(Array.isArray(backfilled), "the bookkeeping field is written");
  assert.ok(backfilled.includes("cavalier-hat"), "the Scout's class head gear is recorded");
  // Not backfilled when the kit was never applied.
  const none = planCharacter("extras-2", fixture({ sheetAutomation: { version: 3, classSkills: [] } }));
  assert.equal(none.patch["sheetAutomation.startingKitExtraArmorIds"], undefined);
}

// --- BACKFILL: new optional HunterCard fields -------------------------------
{
  const bare = fixture();
  delete bare.notTonight;
  delete bare.favors;
  delete bare.sleeplessCounter;
  delete bare.exhaustion;
  const plan = planCharacter("defaults", bare);
  assert.equal(plan.patch.notTonight, true, "a newly created Hunter begins with Not Tonight!");
  assert.equal(plan.patch.favors, 0);
  assert.equal(plan.patch.sleeplessCounter, 0);
  assert.equal(plan.patch.exhaustion, 0);
  assert.equal("insaneQuirkId" in plan.patch, false, "insaneQuirkId stays undefined");
  // Existing values are preserved, including a legitimate non-default.
  const kept = planCharacter("defaults-2", fixture({ exhaustion: 2, notTonight: false }));
  assert.equal(kept.patch.exhaustion, undefined);
  assert.equal(kept.patch.notTonight, undefined);
}

// --- REPORT ONLY: speedModifier is never auto-changed -----------------------
{
  const plan = planCharacter("speed", fixture({ sheet: { speedModifier: "-10" } }));
  assert.equal(plan.patch["sheet.speedModifier"], undefined, "speedModifier is NEVER stripped automatically");
  assert.ok(plan.reviews.some((note) => note.startsWith("REVIEW speedModifier")), "it is listed for Simon");
  assert.ok(plan.reviews.some((note) => note.includes("computed Speed is now")), "with its computed speed");
}

// --- REPORT ONLY: passivePerceptionModifier ---------------------------------
{
  const plan = planCharacter("passive", fixture({ sheet: { passivePerceptionModifier: "2" } }));
  assert.equal(plan.patch["sheet.passivePerceptionModifier"], undefined);
  assert.ok(plan.reviews.some((note) => note.startsWith("REVIEW passivePerceptionModifier")));
}

// --- Derived values are reported, not written -------------------------------
{
  const plan = planCharacter("derived", fixture({ sheet: { ac: "99", weight: "3" } }));
  assert.ok(plan.derived.some((row) => row.field === "sheet.ac"), "a stale AC snapshot is reported");
  assert.equal(plan.patch["sheet.ac"], undefined, "derived keys are recomputed on read, never rewritten");
}

// --- Manual overrides block a recompute and are flagged ---------------------
{
  const plan = planCharacter("override", fixture({
    sheet: { ac: "99" },
    sheetAutomation: { version: 3, classSkills: [], manualOverrides: ["ac"] },
  }));
  assert.ok(plan.derived.some((row) => row.field === "sheet.ac" && row.manualOverride));
  assert.ok(plan.warnings.some((note) => note.includes('Manual override on "ac"')));
}

// --- §6.7 validation checks -------------------------------------------------
{
  const unknownClass = planCharacter("bad-class", fixture({ classId: "wizard" }));
  assert.ok(unknownClass.warnings.some((note) => note.includes("Unknown classId")));
  assert.deepEqual(unknownClass.derived, [], "an unrecomputable card reports no derived diff");

  const wrongSubclass = planCharacter("bad-subclass", fixture({ classId: "scout", subclassId: "hunter-zealot" }));
  assert.ok(wrongSubclass.warnings.some((note) => note.includes("does not belong to class")));

  const unknownItem = planCharacter("bad-item", fixture({ inventory: [{ itemId: "moon-cheese", qty: 1 }] }));
  assert.ok(unknownItem.warnings.some((note) => note.includes("unknown item id")));

  const badQty = planCharacter("bad-qty", fixture({ inventory: [{ itemId: "rope", qty: 0 }] }));
  assert.ok(badQty.warnings.some((note) => note.includes("invalid qty")));

  const truncated = planCharacter("trunc", fixture({
    classId: "bloodbound", level: 20,
    abilities: { str: 20, dex: 10, con: 20, int: 10, wis: 10, cha: 10 },
  }));
  assert.ok(truncated.warnings.some((note) => note.includes("unrecoverable")));

  const legacy = planCharacter("legacy-warn", fixture({ deathPending: false }));
  assert.equal(legacy.patch.deathPending, DELETE, "the legacy field is stripped, not merely flagged");

  const staleMastery = planCharacter("mastery", fixture({
    sheetAutomation: { version: 3, classSkills: [], weaponMasteries: ["Moon Glaive"] },
  }));
  assert.ok(staleMastery.warnings.some((note) => note.includes("resolves to no catalog weapon")));

  // A Stalker is proficient with "Simple weapons and Martial weapons with the
  // Finesse or Light property" — a Pistol (Martial, Ammunition only) fails.
  const stalker = planCharacter("stalker", fixture({
    classId: "stalker",
    sheetAutomation: { version: 3, classSkills: [], weaponMasteries: ["Pistol", "Dagger"] },
  }));
  assert.ok(stalker.warnings.some((note) => note.includes('"Pistol"') && note.includes("outside")));
  assert.equal(stalker.warnings.some((note) => note.includes('"Dagger"')), false, "a Finesse/Light martial weapon is fine");
  assert.deepEqual(stalker.patch["sheetAutomation.weaponMasteries"], ["Dagger"], "the illegal pick is stripped, the legal one stays");

  // A Scout has unrestricted Martial proficiency, so the same pick is legal.
  const scout = planCharacter("scout-mastery", fixture({
    classId: "scout",
    sheetAutomation: { version: 3, classSkills: [], weaponMasteries: ["Pistol"] },
  }));
  assert.equal(scout.warnings.some((note) => note.includes('"Pistol"')), false);
}

// --- Over-slotting is detected ----------------------------------------------
{
  const plan = planCharacter("slots", fixture({
    inventory: Array.from({ length: 12 }, () => ({ itemId: "thieves-tools", qty: 1 })),
  }));
  assert.ok(plan.overSlotted.length > 0, "significant tool sets with nowhere to go are reported");
}

// --- applyPatch is a faithful in-memory projection ---------------------------
{
  const before = fixture({ sheet: { insane: true, ac: "12" }, inventory: [{ itemId: "hunter-cleaver", qty: 1 }] });
  const plan = planCharacter("apply", before);
  const after = applyPatch(before, plan.patch);
  assert.deepEqual(after.inventory, []);
  assert.equal("insane" in (after.sheet as Raw), false);
  assert.equal((after.sheet as Raw).ac, "12", "untouched sheet keys survive");
  assert.equal((before.sheet as Raw).insane, true, "the input document is not mutated");
}

// --- SAFETY: a bare invocation is a dry run ---------------------------------
{
  assert.equal(parseArgs([]).apply, false, "a bare run NEVER writes");
  assert.equal(parseArgs(["--dry-run"]).apply, false);
  assert.equal(parseArgs(["--json"]).apply, false);
  assert.equal(parseArgs(["--backup=x.json"]).apply, false, "a backup alone does not enable writing");
  assert.equal(parseArgs(["--apply"]).apply, true, "only the explicit flag arms the writer");
}

// --- SAFETY: the writer refuses without a covering backup -------------------
{
  assert.throws(() => assertBackupCovers(null, ["a"]), /requires --backup/);
  assert.throws(() => assertBackupCovers("/nope/missing.json", ["a"]), /missing or not valid JSON/);

  const dir = mkdtempSync(join(tmpdir(), "cs-migration-"));
  const partial = join(dir, "partial.json");
  writeFileSync(partial, JSON.stringify([{ id: "a" }]));
  assert.throws(() => assertBackupCovers(partial, ["a", "b"]), /does not cover 1 document/);

  const full = join(dir, "full.json");
  writeFileSync(full, JSON.stringify([{ id: "a" }, { id: "b" }]));
  assert.doesNotThrow(() => assertBackupCovers(full, ["a", "b"]));

  const keyed = join(dir, "keyed.json");
  writeFileSync(keyed, JSON.stringify({ a: {}, b: {} }));
  assert.doesNotThrow(() => assertBackupCovers(keyed, ["a", "b"]), "an id-keyed export is accepted too");
}

// --- The report renders without throwing on an empty and a full collection ---
{
  assert.ok(renderReport([]).includes("Characters scanned        : 0"));
  const plans = [
    planCharacter("cleaver", fixture({ inventory: [{ itemId: "hunter-cleaver", qty: 1 }] })),
    planCharacter("speed", fixture({ sheet: { speedModifier: "-10" } })),
  ];
  const report = renderReport(plans);
  assert.ok(report.includes("NOTHING WAS WRITTEN"));
  assert.ok(report.includes("REVIEW CASES"));
  assert.ok(report.includes("Characters scanned        : 2"));
}

// --- REMAP: class head gear ------------------------------------------------
{
  // Missing entirely -> the class's own hat is added.
  const missing = planCharacter("no-hat", fixture({ classId: "warden", level: 3, subclassId: null, extraArmorIds: [] }));
  assert.ok(groups(missing).includes("remap:class-head-gear"));
  assert.deepEqual(missing.patch.extraArmorIds, ["tricorn"], "the Warden gains a Tricorn");

  // Wrong class's hat -> swapped, non-head Extras preserved in place.
  const wrong = planCharacter("wrong-hat", fixture({
    classId: "stalker",
    extraArmorIds: ["cowl", "leather-boots"],
  }));
  assert.deepEqual(wrong.patch.extraArmorIds, ["leather-boots", "cavalier-hat"], "cowl out, cavalier-hat in");
  assert.ok(wrong.reviews.some((note) => note.includes("cowl")), "the swap is reported for review");

  // Every class maps to the hat the armor table gives it.
  for (const [classId, hatId] of [
    ["brute", "wide-brim-hat"],
    ["scout", "cavalier-hat"],
    ["stalker", "cavalier-hat"],
    ["deepcaller", "cowl"],
    ["bloodbound", "cowl"],
    ["warden", "tricorn"],
  ] as const) {
    const plan = planCharacter(classId, fixture({ classId, subclassId: null, extraArmorIds: [] }));
    assert.deepEqual(plan.patch.extraArmorIds, [hatId], `${classId} head gear`);
  }

  // Already correct -> no change at all.
  const ok = planCharacter("has-hat", fixture({ classId: "brute", extraArmorIds: ["wide-brim-hat"] }));
  assert.equal(groups(ok).includes("remap:class-head-gear"), false);
}

// --- STRIP: weapon masteries outside the class's proficiency ----------------
{
  // The Stalker's kit grants a Pistol but its proficiency is "Simple weapons
  // and Martial weapons with the Finesse or Light property" — a Martial Ranged
  // Pistol is neither, so the mastery was never legal.
  const plan = planCharacter("illegal", fixture({
    classId: "stalker",
    sheetAutomation: { version: 3, classSkills: [], weaponMasteries: ["Pistol", "Scimitar"] },
  }));
  assert.ok(groups(plan).includes("strip:illegal-weapon-mastery"));
  assert.deepEqual(plan.patch["sheetAutomation.weaponMasteries"], ["Scimitar"], "only the illegal pick leaves");
  assert.ok(plan.warnings.some((note) => note.includes("Pistol") && note.includes("stripped")));

  // The same pick IS legal for a class proficient in all Martial weapons.
  const legal = planCharacter("legal", fixture({
    classId: "scout",
    sheetAutomation: { version: 3, classSkills: [], weaponMasteries: ["Pistol", "Shortsword"] },
  }));
  assert.equal(groups(legal).includes("strip:illegal-weapon-mastery"), false, "a Scout may master a Pistol");
}

// --- STRIP: the legacy deathPending field ----------------------------------
{
  const plan = planCharacter("legacy", fixture({ deathPending: true }));
  assert.ok(groups(plan).includes("strip:legacy-fields"));
  assert.equal(plan.patch.deathPending, DELETE);
  const after = applyPatch(fixture({ deathPending: true }), plan.patch);
  assert.equal("deathPending" in after, false, "the field is gone from the migrated document");

  const absent = planCharacter("no-legacy", fixture());
  assert.equal(groups(absent).includes("strip:legacy-fields"), false);
}

console.log("stored-character migration: all transform, validation and safety tests passed");
