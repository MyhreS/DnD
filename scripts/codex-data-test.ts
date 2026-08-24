import { strict as assert } from "node:assert";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join, relative } from "node:path";
import { CODEX_ENTRIES, CODEX_SOURCES, CODEX_SOURCE_BY_ID, CODEX_TOPICS } from "../src/data/codex";
import { searchEntries } from "../src/lib/search";

const master = JSON.parse(readFileSync("resources/master.json", "utf8"));
const generatedText = (path: string) => readFileSync(path, "utf8").replaceAll("\r\n", "\n");
const generatedBefore = generatedText("src/data/codex.generated.json");
execFileSync("node", ["scripts/generate-codex-data.mjs"], { stdio: "pipe" });
assert.equal(generatedText("src/data/codex.generated.json"), generatedBefore, "Codex index is stale; regenerate it");

const expectedFiles = [
  "resources/pdf/C&S Book of the Deepcaller.pdf",
  "resources/pdf/C&S Character Sheet.pdf",
  "resources/pdf/C&S Hidden Condition Sheet.pdf",
  "resources/pdf/C&S Whispers Sheet.pdf",
];
assert.equal(master.schemaVersion, 2);
assert.equal(master.meta.documentCount, 4);
assert.deepEqual(master.sources.map((source: { sourceFile: string }) => source.sourceFile), expectedFiles);
assert.deepEqual(filesUnder("resources/pdf"), expectedFiles, "the canonical source directory must contain exactly four PDFs");

const hashes = master.sources.map((source: { sourceFile: string; sha256: string }) => {
  assert(existsSync(source.sourceFile), `missing canonical source: ${source.sourceFile}`);
  const actual = createHash("sha256").update(readFileSync(source.sourceFile)).digest("hex").toUpperCase();
  assert.equal(actual, source.sha256, `source hash changed without a master update: ${source.sourceFile}`);
  return actual;
});
assert.equal(new Set(hashes).size, 4, "canonical sources must not duplicate one another");

assert.equal(master.rites.entries.length, 21);
assert.equal(master.whispers.entries.length, 6);
assert.equal(master.characterSheet.logicalSectionCount, 6);
assert.equal(master.characterSheet.sections.length, 6);
assert.equal(master.hiddenConditionSheet.containsRules, false);
assert.equal(master.referencedButNotSupplied.length, 3);

assert.equal(CODEX_SOURCES.length, 4);
assert.equal(CODEX_ENTRIES.length, 38);
assert.equal(new Set(CODEX_ENTRIES.map((entry) => entry.id)).size, CODEX_ENTRIES.length, "Codex entry ids must be unique");
assert.deepEqual(CODEX_SOURCES.map((source) => source.id), [
  "book-of-the-deepcaller",
  "character-sheet",
  "hidden-condition-sheet",
  "whispers",
]);
assert.equal(CODEX_SOURCES.flatMap((source) => source.downloads).length, 4);

for (const source of CODEX_SOURCES) {
  assert.equal(source.audience, "player");
  assert.equal(source.sourceFiles.length, 1, `${source.id} must have one canonical file`);
  assert.equal(source.downloads.length, 1, `${source.id} must have one public PDF`);
  assert(existsSync(source.sourceFiles[0]), `${source.id} source is missing`);
  assert(existsSync(join("public", source.downloads[0].publicPath)), `${source.id} public PDF is missing`);
  assert(CODEX_ENTRIES.some((entry) => entry.sourceId === source.id), `${source.id} has no searchable entries`);
}
assert.deepEqual(filesUnder("public/source-library"), [
  "public/source-library/book-of-the-deepcaller/c-s-book-of-the-deepcaller.pdf",
  "public/source-library/character-sheet/c-s-character-sheet.pdf",
  "public/source-library/hidden-condition-sheet/c-s-hidden-condition-sheet.pdf",
  "public/source-library/whispers/c-s-whispers-sheet.pdf",
]);

for (const entry of CODEX_ENTRIES) {
  const source = CODEX_SOURCE_BY_ID.get(entry.sourceId);
  assert(source, `${entry.id} points to an unknown source`);
  assert(entry.term.trim(), `${entry.id} has no term`);
  assert(entry.body.some((value) => value.trim()), `${entry.id} has no searchable content`);
  for (const page of entry.sourcePages ?? []) {
    assert(page >= 1 && page <= source.pageCount, `${entry.id} cites invalid ${source.id} page ${page}`);
  }
}

const rebuke = searchEntries(CODEX_TOPICS, "eldritch rebuke")[0];
assert.equal(rebuke?.term, "Eldritch Rebuke");
assert(rebuke?.versions.every((entry) => entry.sourceId === "book-of-the-deepcaller"));
const grit = searchEntries(CODEX_TOPICS, "grit")[0];
assert.equal(grit?.term, "Abilities & Skills");
assert(grit?.versions.some((entry) => entry.sourceId === "character-sheet"));
const blast = searchEntries(CODEX_TOPICS, "eldritch blast")[0];
assert(blast?.versions[0].body.some((line) => line.includes("ranged rite attack")));
assert(blast?.versions[0].body.some((line) => line.includes("creates two beams")));

for (const removed of ["Hunter Rifle", "Blood Frenzy", "Maduhausu", "Unstable Violence", "Cracked Perception"]) {
  assert.equal(searchEntries(CODEX_TOPICS, removed).length, 0, `retired source content returned: ${removed}`);
}
const hidden = CODEX_ENTRIES.find((entry) => entry.id === "hidden-condition-sheet");
assert(hidden?.body.some((line) => line.includes("deliberately blank") && line.includes("must not restore")));
const unresolved = CODEX_ENTRIES.filter((entry) => entry.id.startsWith("not-supplied-"));
assert.equal(unresolved.length, 3);
assert(unresolved.every((entry) => entry.warning?.includes("not supplied")));

function filesUnder(root: string): string[] {
  const output: string[] = [];
  for (const entry of readdirSync(root, { withFileTypes: true })) {
    const path = join(root, entry.name);
    if (entry.isDirectory()) output.push(...filesUnder(path));
    else if (entry.name.toLowerCase().endsWith(".pdf")) output.push(relative(".", path).replaceAll("\\", "/"));
  }
  return output.sort();
}

console.log(`Current-source Codex tests passed (${CODEX_ENTRIES.length} entries, 4 unique PDFs)`);
