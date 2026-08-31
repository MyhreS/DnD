import { strict as assert } from "node:assert";
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join, relative } from "node:path";
import { CODEX_ENTRIES, CODEX_SOURCES, CODEX_SOURCE_BY_ID, CODEX_TOPICS } from "../src/data/codex";
import { CONDITIONS } from "../src/data/conditions";
import { SKILLS } from "../src/data/skills";
import { searchEntries } from "../src/lib/search";

const generatedText = (path: string) => readFileSync(path, "utf8").replaceAll("\r\n", "\n");
const generatedBefore = generatedText("src/data/codex.generated.json");
execFileSync("node", ["scripts/generate-codex-data.mjs"], { stdio: "pipe" });
const generatedRaw = generatedText("src/data/codex.generated.json");
assert.equal(generatedRaw, generatedBefore, "Codex index is stale; regenerate it");
const generated = JSON.parse(generatedRaw);

// ------------------------------------------------------------ sources ------

const EXPECTED_SOURCE_FILES = [
  "docs/rules/core-rulebook.txt",
  "docs/rules/book-of-the-deepcaller.txt",
  "docs/rules/character-sheet.txt",
  "docs/rules/whispers-sheet.txt",
];
assert.deepEqual(CODEX_SOURCES.flatMap((source) => source.sourceFiles), EXPECTED_SOURCE_FILES);
assert.equal(CODEX_SOURCES.length, 4);
assert.deepEqual(CODEX_SOURCES.map((source) => source.id), [
  "core-rulebook",
  "book-of-the-deepcaller",
  "character-sheet",
  "whispers",
]);
assert.equal(CODEX_SOURCES.flatMap((source) => source.downloads).length, 4);
assert.equal(new Set(Object.values(generated.sourceHashes as Record<string, string>)).size, 4, "current sources must not duplicate one another");
for (const [id, hash] of Object.entries(generated.sourceHashes as Record<string, string>)) {
  assert.match(hash, /^[0-9A-F]{64}$/, `${id} must record a SHA-256 of its transcription`);
}

for (const source of CODEX_SOURCES) {
  assert.equal(source.audience, "player");
  assert.equal(source.sourceFiles.length, 1, `${source.id} must have one canonical file`);
  assert.equal(source.downloads.length, 1, `${source.id} must have one public document`);
  assert(existsSync(source.sourceFiles[0]), `${source.id} source is missing`);
  assert(existsSync(join("public", source.downloads[0].publicPath)), `${source.id} public document is missing`);
  assert.equal(
    readFileSync(source.sourceFiles[0], "utf8"),
    readFileSync(join("public", source.downloads[0].publicPath), "utf8"),
    `${source.id} public download must exactly match its source document`,
  );
  assert(CODEX_ENTRIES.some((entry) => entry.sourceId === source.id), `${source.id} has no searchable entries`);
}
assert.deepEqual(filesUnder("public/source-library"), [
  "public/source-library/book-of-the-deepcaller/book-of-the-deepcaller.txt",
  "public/source-library/character-sheet/character-sheet.txt",
  "public/source-library/core-rulebook/core-rulebook.txt",
  "public/source-library/whispers/whispers.txt",
]);

// ------------------------------------------------------------ content ------

assert.equal(generated.rites.length, 21);
assert.equal(generated.whispers.length, 6);
assert.equal(generated.characterSheet.sections.length, 6);
assert.equal(generated.characterSheet.logicalSectionCount, 6);
assert.equal(generated.rites.filter((entry: { section?: string }) => entry.section === "Hidden Truths").length, 6);
assert(generated.rites.find((entry: { name: string }) => entry.name === "Plane Shift")?.sourceNote.includes("ellipsis"));
assert(generated.whispers.every((entry: { level?: number }) => entry.level === undefined), "Whispers must not be assigned an invented level");

const abilityName = { str: "Strength", dex: "Dexterity", con: "Constitution", int: "Intelligence", wis: "Wisdom", cha: "Charisma" } as const;
assert.deepEqual(
  SKILLS.map((skill) => ({ name: skill.name, ability: abilityName[skill.ability] })),
  generated.characterSheet.skills,
  "all character-sheet skills and their abilities match the current source",
);

/** The three public conditions tables at core-rulebook.txt pages 21–23. The
 * GM-only `Lost` and `Second Threshold` pointers are deliberately excluded. */
const BETA_CONDITIONS = [
  "Blinded", "Deafened", "Mesmerized", "Frightened", "Incapacitated", "Paralyzed", "Restrained", "Stunned", "Unconscious",
  "Dying", "Exhaustion", "Poisoned", "Sleepless", "Suffocating", "Underwater",
  "Blood-Tensed", "Demoralized", "Flanked", "Grappled", "High Ground", "Invisible", "Prone", "Aiming Prone", "Surrounded", "Taunted",
  "Insane",
];
assert.deepEqual(generated.conditionsNamedByCurrentSources, BETA_CONDITIONS);
assert.deepEqual(CONDITIONS.map((condition) => condition.name), BETA_CONDITIONS, "combat selectors match the current source names exactly");
assert(CONDITIONS.some((condition) => condition.id === "poisoned"), "the enemy library relies on a real `poisoned` condition id");
for (const hidden of ["Lost", "Second Threshold"]) {
  assert.equal(CONDITIONS.some((condition) => condition.name === hidden), false, `${hidden} is GM-only and must not be offered`);
}

assert.equal(CODEX_ENTRIES.length, 69);
assert.equal(new Set(CODEX_ENTRIES.map((entry) => entry.id)).size, CODEX_ENTRIES.length, "Codex entry ids must be unique");
for (const group of ["Rites", "Whispers", "Character Sheet", "Conditions", "Combat", "Equipment", "Rest & Transformation"]) {
  assert(CODEX_ENTRIES.some((entry) => entry.group === group), `the Codex must carry a ${group} group`);
}

for (const entry of CODEX_ENTRIES) {
  const source = CODEX_SOURCE_BY_ID.get(entry.sourceId);
  assert(source, `${entry.id} points to an unknown source`);
  assert(entry.term.trim(), `${entry.id} has no term`);
  assert(entry.body.some((value) => value.trim()), `${entry.id} has no searchable content`);
  for (const page of entry.sourcePages ?? []) {
    assert(page >= 1 && page <= source.pageCount, `${entry.id} cites invalid ${source.id} page ${page}`);
  }
}

// ------------------------------------------------------------- search ------

const rebuke = searchEntries(CODEX_TOPICS, "eldritch rebuke")[0];
assert.equal(rebuke?.term, "Eldritch Rebuke");
assert(rebuke?.versions.every((entry) => entry.sourceId === "book-of-the-deepcaller"));
const grit = searchEntries(CODEX_TOPICS, "grit")[0];
assert.equal(grit?.term, "Abilities & Skills");
assert(grit?.versions.some((entry) => entry.sourceId === "character-sheet"));
const blast = searchEntries(CODEX_TOPICS, "eldritch blast")[0];
assert(blast?.versions[0].body.some((line) => line.includes("ranged rite attack")));
assert(blast?.versions[0].body.some((line) => line.includes("creates two beams")));
const whisperEntries = CODEX_ENTRIES.filter((entry) => entry.group === "Whispers");
assert.equal(whisperEntries.length, 6);
assert(whisperEntries.every((entry) => entry.locator?.startsWith("Whisper · ")));
assert(whisperEntries.every((entry) => !entry.body.some((line) => /Level 0/i.test(line))), "Whispers must never be labeled Level 0");

/** Content the beta genuinely retired. `Hunter Rifle` and `Cracked Perception`
 * are NOT in this list: both are current public rules again. */
for (const removed of ["Blood Frenzy", "Unstable Violence", "Old One Vessel", "Greater Dreadblood"]) {
  assert.equal(searchEntries(CODEX_TOPICS, removed).length, 0, `retired source content returned: ${removed}`);
}

// -------------------------------------------------------- GM-only guard ----

assert.equal(CODEX_SOURCE_BY_ID.has("hidden-condition-sheet"), false, "the hidden source must not be public");
assert.equal(CODEX_ENTRIES.some((entry) => entry.sourceId === "hidden-condition-sheet"), false, "hidden rules must not be searchable");
assert.equal(generatedRaw.includes("hidden-condition-sheet"), false, "the generated index must not reference the GM-only sheet");

const hidden = readFileSync("docs/rules/hidden-condition-sheet.txt", "utf8").replaceAll("\r\n", "\n");
const hiddenWords = hidden.split(/\s+/).filter(Boolean);
let checkedWindows = 0;
for (let index = 0; index + 6 <= hiddenWords.length; index += 1) {
  const phrase = hiddenWords.slice(index, index + 6).join(" ");
  assert.equal(generatedRaw.includes(phrase), false, `GM-only wording leaked into the Codex: "${phrase}"`);
  checkedWindows += 1;
}
for (const line of hidden.split("\n").map((value) => value.trim())) {
  if (line.length < 30) continue;
  assert.equal(generatedRaw.includes(line), false, `GM-only line leaked into the Codex: "${line.slice(0, 60)}…"`);
}

function filesUnder(root: string): string[] {
  const output: string[] = [];
  for (const entry of readdirSync(root, { withFileTypes: true })) {
    const path = join(root, entry.name);
    if (entry.isDirectory()) output.push(...filesUnder(path));
    else output.push(relative(".", path).replaceAll("\\", "/"));
  }
  return output.sort();
}

console.log(`Current-source Codex tests passed (${CODEX_ENTRIES.length} player entries, 4 current sources, ${checkedWindows} GM-only phrases checked)`);
