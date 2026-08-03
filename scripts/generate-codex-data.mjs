import { readFileSync, writeFileSync } from "node:fs";
import { basename } from "node:path";

const MASTER_PATH = "resources/master.json";
const OUTPUT_PATH = "src/data/codex.generated.json";
const GAME_CARD_OUTPUT_PATH = "src/data/gameCard.generated.json";

const master = JSON.parse(readFileSync(MASTER_PATH, "utf8"));
const sourceById = new Map(master.index.map((source) => [source.id, source]));
const entries = [];

function slug(value) {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function paragraphs(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value.flatMap(paragraphs);
  return String(value)
    .split(/\n\s*\n/)
    .map((part) => part.trim())
    .filter(Boolean);
}

function table(title, columns, rows) {
  return {
    ...(title ? { title } : {}),
    columns: columns.map(String),
    rows: rows.map((row) => row.map((cell) => String(cell ?? ""))),
  };
}

function source(id) {
  const value = sourceById.get(id);
  if (!value) throw new Error(`Unknown Codex source: ${id}`);
  return value;
}

function add({ id, term, topic = term, aliases = [], body = [], tables = [], group, sourceId, locator, sourcePages, warning }) {
  source(sourceId);
  const cleanBody = paragraphs(body);
  const tableText = tables.flatMap((item) => [
    item.title ?? "",
    item.columns.join(" "),
    ...item.rows.map((row) => row.join(" ")),
  ]).filter(Boolean);
  entries.push({
    id,
    topicKey: slug(topic),
    term,
    aliases: [...new Set(aliases.filter(Boolean))],
    body: [...cleanBody, ...tableText],
    paragraphs: cleanBody,
    tables,
    group,
    sourceId,
    locator,
    ...(sourcePages?.length ? { sourcePages } : {}),
    ...(warning ? { warning } : {}),
  });
}

function objectLines(value) {
  return Object.entries(value ?? {}).map(([key, item]) => `${humanize(key)}: ${Array.isArray(item) ? item.join(", ") : item}`);
}

function humanize(value) {
  return value.replace(/([a-z])([A-Z])/g, "$1 $2").replace(/^./, (letter) => letter.toUpperCase());
}

function normalizeTable(raw) {
  if (Array.isArray(raw.rows) && raw.rows.every(Array.isArray)) {
    return table(raw.title ?? raw.caption, raw.columns ?? [], raw.rows);
  }
  return table(raw.title ?? raw.caption, raw.columns ?? [], (raw.rows ?? []).map((row) => Object.values(row)));
}

// Handbook chapters and their embedded tables.
for (const chapter of master.handbook.chapters) {
  for (const [sectionIndex, section] of chapter.sections.entries()) {
    add({
      id: `handbook-${chapter.number}-${sectionIndex}-${slug(section.heading)}`,
      term: section.heading,
      aliases: [chapter.title],
      body: section.text,
      tables: (section.tables ?? []).map(normalizeTable),
      group: "Handbook",
      sourceId: "handbook",
      locator: `Chapter ${chapter.number} · ${chapter.title}`,
    });
  }
}

// Class boards: overview, progression, features, and subclasses remain distinct
// entries so searches land on the exact rule while still carrying class context.
for (const hunterClass of master.classes) {
  const classSource = hunterClass.id;
  const overviewRows = Object.entries(hunterClass.overview).map(([key, value]) => [
    humanize(key),
    Array.isArray(value) ? value.join(", ") : String(value),
  ]);
  const progressionColumns = [...new Set(hunterClass.progression.flatMap((row) => Object.keys(row)))];
  add({
    id: `class-${hunterClass.id}`,
    term: hunterClass.name,
    aliases: hunterClass.subclasses.map((item) => item.name),
    body: [hunterClass.flavorText, hunterClass.coreTraits.map((trait) => `${trait.name}: ${trait.text}`)],
    tables: [
      table("Core traits", ["Trait", "Rule"], hunterClass.coreTraits.map((trait) => [trait.name, trait.text])),
      table("Class overview", ["Field", "Value"], overviewRows),
      table("Level progression", progressionColumns.map(humanize), hunterClass.progression.map((row) => progressionColumns.map((key) => Array.isArray(row[key]) ? row[key].join(", ") : row[key] ?? ""))),
    ],
    group: "Classes",
    sourceId: classSource,
    locator: "Core traits and progression",
  });
  for (const feature of hunterClass.features) {
    add({
      id: `class-${hunterClass.id}-feature-${feature.level}-${slug(feature.name)}`,
      term: feature.name,
      topic: `${hunterClass.id}-${feature.name}`,
      aliases: [hunterClass.name],
      body: feature.text,
      group: "Classes",
      sourceId: classSource,
      locator: `${hunterClass.name} · Level ${feature.level}`,
    });
  }
  for (const subclass of hunterClass.subclasses) {
    add({
      id: `class-${hunterClass.id}-subclass-${slug(subclass.name)}`,
      term: subclass.name,
      topic: `${hunterClass.id}-${subclass.name}`,
      aliases: [hunterClass.name],
      body: subclass.description,
      group: "Classes",
      sourceId: classSource,
      locator: `${hunterClass.name} subclass`,
    });
    for (const feature of subclass.features) {
      add({
        id: `class-${hunterClass.id}-${slug(subclass.name)}-${feature.level}-${slug(feature.name)}`,
        term: feature.name,
        topic: `${hunterClass.id}-${subclass.name}-${feature.name}`,
        aliases: [hunterClass.name, subclass.name],
        body: feature.text,
        group: "Classes",
        sourceId: classSource,
        locator: `${subclass.name} · Level ${feature.level}`,
      });
    }
  }
}

function addRite(rite, sourceId, locatorPrefix) {
  add({
    id: `${sourceId}-rite-${rite.level}-${slug(rite.name)}`,
    term: titleCase(rite.name),
    aliases: [rite.type, rite.whisper ? "Whisper" : "Rite"],
    body: [
      `Performing: ${rite.performing}`,
      `Range: ${rite.range}`,
      `Duration: ${rite.duration}`,
      rite.special,
      rite.text,
      rite.upgrade ? `Upgrade: ${rite.upgrade}` : "",
    ],
    group: "Rites",
    sourceId,
    locator: `${locatorPrefix} · ${rite.whisper ? "Whisper" : `Level ${rite.level}`}`,
  });
}

for (const school of master.rites.bySchool) {
  for (const rite of school.rites) addRite({ ...rite, type: school.school }, "rites-by-school", school.school);
}
for (const rite of master.rites.bookOfDeepcaller.rites) addRite(rite, "book-of-deepcaller", rite.type);
for (const whisper of master.rites.whispers.whispers) addRite({ ...whisper, whisper: true }, "whispers", whisper.type);

// The scanned D&D glossary already carries exact PDF and printed-book pages.
for (const rulesPage of master.rulesReference.pages) {
  for (const [entryIndex, rule] of rulesPage.entries.entries()) {
    const continuation = rule.term.match(/^\[(?:continuation|continued)[^—-]*[—-]\s*([^\]]+)\]$/i);
    const ruleTerm = (continuation?.[1] ?? rule.term)
      .replace(/\s*\[[^\]]+\]/g, "")
      .replace(/\s*\((?:continued|continues)[^)]*\)/gi, "")
      .trim();
    add({
      id: `dnd-rules-${rulesPage.page}-${entryIndex}-${slug(rule.term)}`,
      term: ruleTerm.replace(/^"|"\.?$/g, ""),
      topic: ruleTerm,
      body: rule.text,
      group: "D&D Rules",
      sourceId: "rules-reference-scan",
      locator: `Rules Glossary · book p. ${rulesPage.bookPage}`,
      sourcePages: [rulesPage.page],
    });
  }
  for (const [tableIndex, rulesTable] of (rulesPage.tables ?? []).entries()) {
    const tableTerm = rulesTable.title.replace(/\s*\(.+$/, "").replace(/\s+under\s+.+$/i, "").trim();
    add({
      id: `dnd-rules-${rulesPage.page}-table-${tableIndex}-${slug(rulesTable.title)}`,
      term: tableTerm,
      topic: tableTerm,
      aliases: [rulesTable.title],
      tables: [normalizeTable(rulesTable)],
      group: "D&D Rules",
      sourceId: "rules-reference-scan",
      locator: `Rules Glossary table · book p. ${rulesPage.bookPage}`,
      sourcePages: [rulesPage.page],
    });
  }
}

// Player-created quick reference. The body is re-derived from paragraphs and
// tables, so master.json never needs a second drifting copy of searchable text.
for (const cardEntry of master.gameCard.entries) {
  add({
    id: `game-card-${cardEntry.id}`,
    term: cardEntry.term,
    aliases: cardEntry.aliases,
    body: cardEntry.paragraphs,
    tables: (cardEntry.tables ?? []).map(normalizeTable),
    group: "Game Card",
    sourceId: "game-card",
    locator: cardEntry.category,
    sourcePages: cardEntry.sourcePages,
  });
}

// Character sheets are searchable as field maps and creation-step guidance.
for (const sheet of master.characterSheets.sheets) {
  if (sheet.pages) {
    for (const page of sheet.pages) {
      add({
        id: `character-sheet-${slug(sheet.name)}-page-${page.page}`,
        term: `${sheet.name} — page ${page.page}`,
        topic: `character-sheet-${slug(sheet.name)}-page-${page.page}`,
        aliases: page.fields,
        body: page.fields,
        group: "Character Sheets",
        sourceId: "character-sheets",
        locator: `Page ${page.page}`,
        sourcePages: [page.page],
      });
    }
  }
  for (const step of sheet.numberedSteps ?? []) {
    add({
      id: `character-sheet-${slug(sheet.name)}-step-${step.number}`,
      term: `Character creation step ${step.number}: ${step.label}`,
      aliases: step.fields,
      body: step.fields,
      group: "Character Sheets",
      sourceId: "character-sheets",
      locator: sheet.name,
    });
  }
  for (const section of sheet.sections ?? []) {
    add({
      id: `character-sheet-${slug(sheet.name)}-${slug(section.heading)}`,
      term: section.heading,
      aliases: [sheet.name],
      body: section.content,
      group: "Character Sheets",
      sourceId: "character-sheets",
      locator: sheet.name,
    });
  }
}
add({
  id: "character-sheet-ability-and-skills",
  term: "Ability and Skills",
  aliases: ["skill list", "character sheet"],
  tables: [normalizeTable({ title: "Ability and Skills", ...master.characterSheets.abilityAndSkills })],
  group: "Character Sheets",
  sourceId: "character-sheets",
  locator: "Character Sheet For Sim",
  sourcePages: [1],
});
add({
  id: "character-sheet-field-reference",
  term: "On the Character Sheet",
  aliases: ["sheet fields", "character sheet"],
  tables: [normalizeTable({ title: "On the Character Sheet", ...master.characterSheets.onTheCharacterSheet })],
  group: "Character Sheets",
  sourceId: "character-sheets",
  locator: "Character Sheet For Sim",
  sourcePages: [1],
});

// Player-visible transformation rules. Secret Lost details and the Insane
// appendix's resolution mechanics intentionally never enter the generated app.
add({
  id: "transformation-level-master",
  term: "Transformation Level",
  body: [master.transformation.description, master.transformation.recording, objectLines(master.transformation.coreTerms)],
  group: "Appendices",
  sourceId: "transformation-table",
  locator: "Core rules",
  sourcePages: [1],
});
for (const [key, result] of Object.entries(master.transformation.results)) {
  add({
    id: `transformation-result-${key}`,
    term: result.name,
    body: result.secret ? "This result is resolved by the DM." : result.text,
    group: "Appendices",
    sourceId: "transformation-table",
    locator: "Transformation result",
    sourcePages: [1],
  });
}
const transformationNames = Object.fromEntries(Object.entries(master.transformation.results).map(([key, result]) => [key, result.name]));
add({
  id: "transformation-table-master",
  term: "Transformation Table",
  body: [master.transformation.table.note, objectLines(master.transformation.reducing)],
  tables: [table("Transformation Table", ["d20", ...Array.from({ length: 10 }, (_, index) => `Level ${index + 1}`)], master.transformation.table.rows.map((row) => [row.d20, ...row.byLevel.map((key) => transformationNames[key])]))],
  group: "Appendices",
  sourceId: "transformation-table",
  locator: "Full table and reduction rules",
  sourcePages: [1, 2],
});

add({
  id: "ability-point-costs-v2-master",
  term: master.abilityPointCostsV2.title,
  aliases: ["point buy", "ability scores"],
  body: [master.abilityPointCostsV2.description, `Budget: ${master.abilityPointCostsV2.budget}`, master.abilityPointCostsV2.repeatRule, master.abilityPointCostsV2.maxFinalScoreNote],
  tables: [normalizeTable(master.abilityPointCostsV2.table)],
  group: "Character Creation",
  sourceId: "ability-point-costs-v2",
  locator: "Point-buy variant",
  sourcePages: [1],
});

// Reconciliation records are first-class search results. They explain why two
// source versions differ instead of letting the UI pretend there is one answer.
for (const [index, conflict] of master.sourceConflicts.entries()) {
  add({
    id: `source-conflict-${index}-${slug(conflict.topic)}`,
    term: `Source conflict: ${conflict.topic}`,
    aliases: [conflict.topic],
    body: [conflict.note, JSON.stringify(conflict.perClass ?? conflict.handbookCh2CoreTraits ?? "")],
    group: "Source Notes",
    sourceId: "master-notes",
    locator: "Master content reconciliation",
    warning: "The source documents disagree. This note records the current app choice; confirm unresolved values with the DM.",
  });
}

function titleCase(value) {
  return String(value).toLowerCase().replace(/(^|[\s-])\w/g, (match) => match.toUpperCase());
}

const sources = master.index
  .filter((item) => item.audience !== "dm")
  .map((item) => ({
    id: item.id,
    title: item.title,
    shortLabel: item.shortLabel,
    kind: item.kind,
    authority: item.authority,
    audience: item.audience,
    description: item.description,
    pageCount: item.pageCount ?? 0,
    publicPath: item.publicPath,
    sourceFiles: item.sourceFiles,
    fileLabels: item.sourceFiles.map((file) => basename(file)),
  }));

const output = { schemaVersion: 1, sources, entries };
writeFileSync(OUTPUT_PATH, `${JSON.stringify(output, null, 2)}\n`);
writeFileSync(GAME_CARD_OUTPUT_PATH, `${JSON.stringify(master.gameCard, null, 2)}\n`);
console.log(`Generated ${OUTPUT_PATH}: ${entries.length} entries from ${sources.length} player-facing sources.`);
