import { strict as assert } from "node:assert";
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join, relative } from "node:path";
import { CODEX_ENTRIES, CODEX_SOURCES, CODEX_SOURCE_BY_ID, CODEX_TOPICS } from "../src/data/codex";
import { searchEntries } from "../src/lib/search";

const master = JSON.parse(readFileSync("resources/master.json", "utf8"));
const generatedBefore = readFileSync("src/data/codex.generated.json", "utf8");
const gameCardBefore = readFileSync("src/data/gameCard.generated.json", "utf8");
execFileSync("node", ["scripts/generate-codex-data.mjs"], { stdio: "pipe" });
assert.equal(readFileSync("src/data/codex.generated.json", "utf8"), generatedBefore, "Codex index is stale; regenerate it");
assert.equal(readFileSync("src/data/gameCard.generated.json", "utf8"), gameCardBefore, "Game Card data is stale; regenerate it");

assert.equal(master.meta.schemaVersion, 2);
assert.equal(master.gameCard.pageCount, 9);
assert.equal(master.gameCard.entries.length, 83);
assert.equal(CODEX_SOURCES.length, 16);
assert(CODEX_ENTRIES.length >= 540, "expected the complete master content index");
assert.equal(new Set(CODEX_ENTRIES.map((entry) => entry.id)).size, CODEX_ENTRIES.length, "Codex entry ids must be unique");

for (const path of master.meta.sources) assert(existsSync(path), `master source is missing: ${path}`);
const registered = new Set(master.meta.sources);
for (const path of filesUnder("resources/pdf")) assert(registered.has(path), `PDF is not registered in master.meta.sources: ${path}`);

for (const source of CODEX_SOURCES) {
  assert.equal(source.audience, "player");
  assert(source.sourceFiles.length > 0, `${source.id} has no provenance files`);
  assert(source.downloads.length > 0, `${source.id} has no PDF downloads`);
  for (const path of source.sourceFiles) assert(existsSync(path), `${source.id} source is missing: ${path}`);
  for (const download of source.downloads) {
    assert(download.publicPath.endsWith(".pdf"), `${source.id} has a non-PDF download`);
    assert(existsSync(join("public", download.publicPath)), `${source.id} download is missing: ${download.publicPath}`);
  }
  if (source.publicPath) assert(existsSync(join("public", source.publicPath)), `${source.id} public PDF is missing`);
}
assert.equal(CODEX_SOURCES.flatMap((source) => source.downloads).length, 30, "expected every player PDF in the source library");

for (const entry of CODEX_ENTRIES) {
  const source = CODEX_SOURCE_BY_ID.get(entry.sourceId);
  assert(source, `${entry.id} points to an unknown source`);
  assert(entry.term.trim(), `${entry.id} has no term`);
  assert(entry.topicKey.trim(), `${entry.id} has no topic key`);
  assert(entry.body.some((value) => value.trim()), `${entry.id} has no searchable content`);
  for (const page of entry.sourcePages ?? []) {
    assert(source.pageCount > 0, `${entry.id} cites pages in a non-paginated source`);
    assert(page >= 1 && page <= source.pageCount, `${entry.id} cites invalid ${source.id} page ${page}`);
  }
  for (const table of entry.tables) {
    assert(table.columns.length > 0, `${entry.id} has a table without columns`);
    assert(table.rows.every((row) => row.length === table.columns.length), `${entry.id} has a malformed table`);
  }
}

const playerText = CODEX_ENTRIES.flatMap((entry) => entry.body).join(" ");
for (const secret of ["Madness Die", "Bound Shadow", "Unstable Violence", "Cracked Perception"]) {
  assert(!playerText.includes(secret), `DM-only text leaked into the Codex: ${secret}`);
}

const grappled = searchEntries(CODEX_TOPICS, "grappled")[0];
assert(grappled, "Grappled must be searchable");
assert(grappled.versions.some((entry) => entry.sourceId === "rules-reference-scan"), "Grappled is missing D&D provenance");
assert(grappled.versions.some((entry) => entry.sourceId === "game-card"), "Grappled is missing Game Card provenance");
assert(searchEntries(CODEX_TOPICS, "hunter rifle").some((topic) => topic.versions.some((entry) => entry.sourceId === "game-card")));
assert.equal(searchEntries(CODEX_TOPICS, "hunter rifle")[0]?.term, "Hunter Rifle", "item-name searches should open the exact Game Card row");
assert.equal(searchEntries(CODEX_TOPICS, "longsword")[0]?.term, "Longsword", "weapon-name searches should open the exact Game Card row");
assert(searchEntries(CODEX_TOPICS, "blood frenzy").some((topic) => topic.versions.some((entry) => entry.sourceId === "bloodbound")));
assert(CODEX_TOPICS.filter((topic) => topic.versions.length > 1).length >= 40, "expected multi-source topic comparisons");
const generatedTableCount = (sourceId: string) => CODEX_ENTRIES
  .filter((entry) => entry.sourceId === sourceId)
  .reduce((count, entry) => count + entry.tables.length, 0);
assert.equal(generatedTableCount("rules-reference-scan"), master.rulesReference.tableCount, "every D&D rules table must be searchable");
assert.equal(CODEX_ENTRIES
  .filter((entry) => entry.sourceId === "game-card" && !entry.id.includes("-table-"))
  .reduce((count, entry) => count + entry.tables.length, 0), 24, "every Game Card table must be searchable");
assert(CODEX_ENTRIES.some((entry) => entry.id.includes("game-card-weapons-table-") && entry.term === "Hunter Rifle"), "Game Card table rows must have exact searchable entries");
for (const source of CODEX_SOURCES) {
  assert(CODEX_ENTRIES.some((entry) => entry.sourceId === source.id), `${source.id} has no searchable entries`);
}

function filesUnder(root: string): string[] {
  const output: string[] = [];
  for (const entry of readdirSync(root, { withFileTypes: true })) {
    const path = join(root, entry.name);
    if (entry.isDirectory()) output.push(...filesUnder(path));
    else if (entry.name.endsWith(".pdf")) output.push(relative(".", path));
  }
  return output;
}

console.log(`Unified Codex data tests passed (${CODEX_ENTRIES.length} entries, ${CODEX_TOPICS.length} topics, ${CODEX_SOURCES.length} sources)`);
