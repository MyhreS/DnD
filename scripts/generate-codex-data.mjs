import { createHash } from "node:crypto";
import {
  copyFileSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { basename, join } from "node:path";

const MASTER_PATH = "resources/master.json";
const PDF_ROOT = "resources/pdf";
const OUTPUT_PATH = "src/data/codex.generated.json";
const PUBLIC_DOCUMENT_ROOT = "public/source-library";

const master = JSON.parse(readFileSync(MASTER_PATH, "utf8"));
if (master.schemaVersion !== 2) throw new Error(`Unsupported master schema: ${master.schemaVersion}`);
if (!Array.isArray(master.sources) || master.sources.length !== 4) {
  throw new Error("The current source master must contain exactly four documents.");
}

function slug(value) {
  return String(value)
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function sha256(path) {
  return createHash("sha256").update(readFileSync(path)).digest("hex").toUpperCase();
}

function publicDocumentPath(source) {
  return `/source-library/${source.id}/${slug(basename(source.sourceFile, ".pdf"))}.pdf`;
}

const sourceFiles = master.sources.map((source) => source.sourceFile.replaceAll("\\", "/"));
if (new Set(sourceFiles).size !== sourceFiles.length) throw new Error("Duplicate source file in master.json.");
if (new Set(master.sources.map((source) => source.sha256)).size !== master.sources.length) {
  throw new Error("Duplicate document content in the current source set.");
}

const actualPdfFiles = readdirSync(PDF_ROOT, { withFileTypes: true }).map((entry) => {
  if (!entry.isFile() || !entry.name.toLowerCase().endsWith(".pdf")) {
    throw new Error(`Unexpected item in ${PDF_ROOT}: ${entry.name}`);
  }
  return `${PDF_ROOT}/${entry.name}`;
}).sort();
const expectedPdfFiles = [...sourceFiles].sort();
if (JSON.stringify(actualPdfFiles) !== JSON.stringify(expectedPdfFiles)) {
  throw new Error(`PDF source set differs from master.json.\nExpected: ${expectedPdfFiles.join(", ")}\nActual: ${actualPdfFiles.join(", ")}`);
}

for (const source of master.sources) {
  const actual = sha256(source.sourceFile);
  if (actual !== source.sha256) {
    throw new Error(`SHA-256 mismatch for ${source.sourceFile}: expected ${source.sha256}, got ${actual}`);
  }
}

rmSync(PUBLIC_DOCUMENT_ROOT, { recursive: true, force: true });

const sources = master.sources.map((source) => {
  const publicPath = publicDocumentPath(source);
  const destinationDirectory = join(PUBLIC_DOCUMENT_ROOT, source.id);
  mkdirSync(destinationDirectory, { recursive: true });
  copyFileSync(source.sourceFile, `public${publicPath}`);
  return {
    id: source.id,
    title: source.title,
    shortLabel: source.shortLabel,
    kind: source.kind,
    authority: source.authority,
    audience: source.audience,
    description: source.description,
    pageCount: source.pageCount,
    publicPath,
    downloads: [{ label: source.shortLabel, publicPath }],
    sourceFiles: [source.sourceFile],
    fileLabels: [basename(source.sourceFile)],
  };
});

const entries = [];
function add({ id, term, aliases = [], paragraphs = [], tables = [], group, sourceId, locator, sourcePages, warning }) {
  const cleanParagraphs = paragraphs.map(String).map((value) => value.trim()).filter(Boolean);
  entries.push({
    id,
    topicKey: slug(term),
    term,
    aliases: [...new Set(aliases.map(String).filter(Boolean))],
    body: [...cleanParagraphs, ...tables.flatMap((table) => [table.title ?? "", ...table.columns, ...table.rows.flat()])].filter(Boolean),
    paragraphs: cleanParagraphs,
    tables,
    group,
    sourceId,
    locator,
    ...(sourcePages?.length ? { sourcePages } : {}),
    ...(warning ? { warning } : {}),
  });
}

function riteParagraphs(entry) {
  return [
    `Level ${entry.level} ${entry.type}`,
    `Performing: ${entry.performing}`,
    `Range: ${entry.range}`,
    `Duration: ${entry.duration}`,
    entry.special,
    entry.text,
    entry.upgrade,
  ].filter(Boolean);
}

for (const rite of master.rites.entries) {
  add({
    id: `rite-${rite.id}`,
    term: rite.name,
    aliases: [rite.type, `level ${rite.level} rite`],
    paragraphs: riteParagraphs(rite),
    tables: rite.tables ?? [],
    group: "Rites",
    sourceId: master.rites.sourceId,
    locator: `Level ${rite.level} · ${rite.type}`,
    sourcePages: rite.sourcePages,
  });
}

for (const whisper of master.whispers.entries) {
  add({
    id: `whisper-${whisper.id}`,
    term: whisper.name,
    aliases: [whisper.type, "Whisper"],
    paragraphs: riteParagraphs(whisper),
    group: "Whispers",
    sourceId: master.whispers.sourceId,
    locator: whisper.type,
    sourcePages: whisper.sourcePages,
  });
}

for (const section of master.characterSheet.sections) {
  add({
    id: `character-sheet-${section.id}`,
    term: section.title,
    aliases: section.fields,
    paragraphs: [`Fields: ${section.fields.join(", ")}.`],
    group: "Character Sheet",
    sourceId: master.characterSheet.sourceId,
    locator: section.title,
    sourcePages: section.sourcePages,
  });
}

add({
  id: "character-sheet-abilities-and-skills",
  term: "Abilities & Skills",
  aliases: ["skill list", ...master.characterSheet.abilities, ...master.characterSheet.skills.map((skill) => skill.name)],
  paragraphs: ["The current character sheet records a score, modifier, and saving throw for each ability, plus the listed skills."],
  tables: [{
    title: "Skills by ability",
    columns: ["Ability", "Skill"],
    rows: master.characterSheet.skills.map((skill) => [skill.ability, skill.name]),
  }],
  group: "Character Sheet",
  sourceId: master.characterSheet.sourceId,
  locator: "Identity & Abilities",
  sourcePages: [1, 2],
});

add({
  id: "hidden-condition-sheet",
  term: "Hidden Condition Sheet",
  aliases: ["hidden condition", "blank handout"],
  paragraphs: [master.hiddenConditionSheet.description],
  group: "Handouts",
  sourceId: master.hiddenConditionSheet.sourceId,
  locator: "Blank sheet",
  sourcePages: [1],
});

for (const missing of master.referencedButNotSupplied) {
  add({
    id: `not-supplied-${slug(missing.name)}`,
    term: missing.name,
    aliases: [missing.referencedBy],
    paragraphs: [`Referenced by ${missing.referencedBy}, but not included in the supplied source set. ${missing.policy}`],
    group: "Source Notes",
    sourceId: master.rites.sourceId,
    locator: missing.referencedBy,
    warning: "Referenced material is not supplied; the app does not invent it.",
  });
}

const output = {
  schemaVersion: 2,
  sources,
  entries,
  characterSheet: master.characterSheet,
  whispers: master.whispers.entries,
  conditionsNamedByCurrentSources: master.conditionsNamedByCurrentSources,
};
writeFileSync(OUTPUT_PATH, `${JSON.stringify(output, null, 2)}\n`);
console.log(`Generated ${OUTPUT_PATH}: ${entries.length} entries and exactly ${sources.length} PDF downloads.`);
