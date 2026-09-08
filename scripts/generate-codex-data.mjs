import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { basename, join } from "node:path";

/**
 * The current player-facing sources are addressed by an explicit, hard-coded
 * allowlist. The directory is NEVER globbed: `docs/rules/hidden-condition-sheet.txt`
 * is GM-only and must never be opened, copied, or parsed by this generator.
 */
const SOURCES = [
  {
    id: "core-rulebook",
    file: "docs/rules/core-rulebook.txt",
    title: "C&S Core Rulebook",
    shortLabel: "Core Rulebook",
    kind: "core rulebook",
    authority: "current game-maker source",
    audience: "player",
    description: "The current 126-page Core Rulebook (Beta): core mechanics, combat, conditions, equipment, rest and transformation.",
    pageCount: 126,
  },
  {
    id: "book-of-the-deepcaller",
    file: "docs/rules/book-of-the-deepcaller.txt",
    title: "C&S Book of the Deepcaller",
    shortLabel: "Deepcaller Book",
    kind: "rite book",
    authority: "current game-maker source",
    audience: "player",
    description: "The current thirteen-page Book of the Deepcaller, containing twenty-one leveled Rites.",
    pageCount: 13,
  },
  {
    id: "character-sheet",
    file: "docs/rules/character-sheet.txt",
    title: "C&S Character Sheet",
    shortLabel: "Character Sheet",
    kind: "character sheet",
    authority: "current game-maker source",
    audience: "player",
    description: "The current printable character sheet: six logical sections printed across eleven pages.",
    pageCount: 11,
  },
  {
    id: "whispers",
    file: "docs/rules/whispers-sheet.txt",
    title: "C&S Whispers Sheet",
    shortLabel: "Whispers",
    kind: "whisper reference",
    authority: "current game-maker source",
    audience: "player",
    description: "The current two-page Whispers reference, containing six Whispers.",
    pageCount: 2,
  },
];

const HIDDEN_SOURCE_NAMES = ["hidden-condition-sheet"];
for (const source of SOURCES) {
  for (const hidden of HIDDEN_SOURCE_NAMES) {
    if (source.file.includes(hidden)) throw new Error(`GM-only source in the public allowlist: ${source.file}`);
  }
}
if (new Set(SOURCES.map((source) => source.id)).size !== SOURCES.length) throw new Error("Duplicate source id.");
if (new Set(SOURCES.map((source) => source.file)).size !== SOURCES.length) throw new Error("Duplicate source file.");

const OUTPUT_PATH = "src/data/codex.generated.json";
const PUBLIC_DOCUMENT_ROOT = "public/source-library";

function slug(value) {
  return String(value)
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

const SMALL_WORDS = new Set(["of", "the", "and", "a", "an", "to", "in", "or", "for", "on"]);
function titleCase(value) {
  return value
    .toLowerCase()
    .split(/\s+/)
    .map((word, index) => (index > 0 && SMALL_WORDS.has(word)
      ? word
      : word.replace(/(^|[-'])([a-z])/g, (_, lead, letter) => `${lead}${letter.toUpperCase()}`)))
    .join(" ");
}

/** The rulebook's text layer drops the ff/fi/fl ligatures. Repair the words we
 * republish; never invent wording beyond restoring the missing ligature. */
const LIGATURE_REPAIRS = [
  [/\bE ect/g, "Effect"], [/\be ect/g, "effect"], [/\be ects/g, "effects"], [/\bE ects/g, "Effects"],
  [/\bSu ocating/g, "Suffocating"], [/\bsu ocation/g, "suffocation"], [/\bsu er/g, "suffer"], [/\bsu ers/g, "suffers"],
  [/\bdi erent/g, "different"], [/\bdi er/g, "differ"], [/\bdi cult/g, "difficult"], [/\bDi culty/g, "Difficulty"], [/\bdi culty/g, "difficulty"],
  [/\bmodi er/g, "modifier"], [/\bmodi ers/g, "modifiers"], [/\bin uence/g, "influence"], [/\bIn uence/g, "Influence"],
  [/\bri e/g, "rifle"], [/\bri es/g, "rifles"], [/\b rst\b/g, "first"], [/\bo ers/g, "offers"],
  [/\bProfi ciency/g, "Proficiency"],
];
function repairLigatures(value) {
  let output = value;
  for (const [pattern, replacement] of LIGATURE_REPAIRS) output = output.replace(pattern, replacement);
  return output.replace(/\s+/g, " ").trim();
}

function readSource(id) {
  const source = SOURCES.find((item) => item.id === id);
  if (!source) throw new Error(`Unknown source: ${id}`);
  return readFileSync(source.file, "utf8").replaceAll("\r\n", "\n").split("\n");
}

function sha256(path) {
  return createHash("sha256").update(readFileSync(path)).digest("hex").toUpperCase();
}

// ---------------------------------------------------------------- rites -----

function parsePipeTable(lines) {
  const cells = lines.map((line) => line.trim().slice(1, -1).split("|").map((cell) => cell.trim()));
  const columns = cells[0];
  const rows = cells.slice(2);
  return { columns, rows };
}

function parseRites() {
  const lines = readSource("book-of-the-deepcaller");
  const rites = [];
  let page = 0;
  let section;
  let current = null;
  const flush = () => {
    if (!current) return;
    const tables = [];
    const bodyLines = [];
    for (let index = 0; index < current.body.length; index += 1) {
      const line = current.body[index];
      if (!line.startsWith("|")) { bodyLines.push(line); continue; }
      const block = [];
      while (index < current.body.length && current.body[index].startsWith("|")) { block.push(current.body[index]); index += 1; }
      index -= 1;
      const table = parsePipeTable(block);
      tables.push({ title: `${table.columns[0]} — ${table.columns[1]}`, columns: table.columns, rows: table.rows });
    }
    const upgradeIndex = bodyLines.findIndex((line) => /^Using (a )?Higher-Level Strain\./.test(line));
    const upgrade = upgradeIndex >= 0 ? bodyLines[upgradeIndex] : "";
    const text = bodyLines.filter((_, index) => index !== upgradeIndex).join(" ").trim();
    const rite = {
      id: slug(current.name),
      name: current.name,
      level: current.level,
      ...(current.section ? { section: current.section } : {}),
      type: current.fields.Type,
      performing: current.fields.Performing,
      range: current.fields.Range,
      duration: current.fields.Duration,
      ...(current.fields["Special Requirements"] ? { special: `Special Requirements: ${current.fields["Special Requirements"]}` } : {}),
      text: text.replace(/\.\.\.$/, "…"),
      ...(text.endsWith("...") || text.endsWith("…")
        ? { sourceNote: "The supplied entry ends with an ellipsis and provides no further destination or resolution procedure." }
        : {}),
      upgrade,
      ...(tables.length ? { tables } : {}),
      sourcePages: [current.page],
    };
    rites.push(rite);
    current = null;
  };

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const pageMatch = line.match(/^\[page (\d+)\]$/);
    if (pageMatch) { page = Number(pageMatch[1]); continue; }
    if (/^# Hidden Truths$/.test(line)) { flush(); section = "Hidden Truths"; continue; }
    if (line.startsWith("# ")) { flush(); continue; }
    if (line.startsWith("## ")) {
      flush();
      const name = titleCase(line.slice(3).trim());
      const level = Number(lines[index + 1].match(/^Level (\d+)$/)?.[1]);
      if (!Number.isFinite(level)) throw new Error(`Rite without a level: ${name}`);
      current = { name, level, section, page, fields: {}, body: [] };
      index += 1;
      continue;
    }
    if (!current) continue;
    const trimmed = line.trim();
    if (!trimmed) continue;
    if (trimmed.startsWith("(") || trimmed.startsWith("---")) { flush(); continue; }
    const fieldMatch = trimmed.match(/^(Type|Performing|Range|Duration|Special Requirements): (.+)$/);
    if (fieldMatch && current.body.length === 0) { current.fields[fieldMatch[1]] = fieldMatch[2]; continue; }
    current.body.push(trimmed.replace(/^\[sic:[^\]]*\]\s*/, ""));
  }
  flush();
  return rites;
}

function parseWhispers() {
  const lines = readSource("whispers");
  const whispers = [];
  let page = 0;
  let current = null;
  const flush = () => {
    if (!current) return;
    const paragraphs = current.body.map((line) => line.replaceAll("**", "").trim()).filter(Boolean);
    const upgradeIndex = paragraphs.findIndex((line) => /^Whisper Upgrade\./.test(line));
    whispers.push({
      id: slug(current.name),
      name: current.name,
      type: current.fields.Type,
      performing: current.fields.Performing,
      range: current.fields.Range,
      duration: current.fields.Duration,
      ...(current.fields["Special Requirements"] ? { special: `Special Requirements: ${current.fields["Special Requirements"]}` } : {}),
      text: paragraphs.filter((_, index) => index !== upgradeIndex).join(" "),
      upgrade: upgradeIndex >= 0 ? paragraphs[upgradeIndex] : "",
      sourcePages: [current.page],
    });
    current = null;
  };

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const pageMatch = line.match(/^<!-- \[page (\d+)\] -->$/);
    if (pageMatch) { page = Number(pageMatch[1]); continue; }
    if (line.startsWith("## ")) {
      flush();
      current = { name: titleCase(line.slice(3).trim()), page, fields: {}, body: [] };
      if (lines[index + 1]?.trim() !== "Whisper") throw new Error(`Whisper marker missing for ${current.name}`);
      index += 1;
      continue;
    }
    if (!current) continue;
    const trimmed = line.trim();
    if (!trimmed) continue;
    if (trimmed.startsWith("|")) {
      const cells = trimmed.slice(1, -1).split("|").map((cell) => cell.trim());
      if (cells[0] === "Field" || cells[0].startsWith("---")) continue;
      current.fields[cells[0]] = cells[1];
      continue;
    }
    current.body.push(trimmed);
  }
  flush();
  return whispers;
}

// -------------------------------------------------------- character sheet ---

const ABILITY_ORDER = ["Strength", "Dexterity", "Constitution", "Intelligence", "Wisdom", "Charisma"];

function parseCharacterSheet() {
  const lines = readSource("character-sheet");
  const sections = [];
  let page = 0;
  let current = null;
  const flush = () => {
    if (current) sections.push({ id: slug(current.title), title: current.title, sourcePages: [...current.pages], fields: [...new Set(current.fields)] });
    current = null;
  };
  for (const line of lines) {
    const pageMatch = line.match(/^\[page (\d+)\]$/);
    if (pageMatch) { page = Number(pageMatch[1]); continue; }
    const sheetMatch = line.match(/^--- SHEET PAGE \d+ · (.+?) ---$/);
    if (sheetMatch) { flush(); current = { title: titleCase(sheetMatch[1]).replace(/\bAnd\b/g, "and"), pages: [page], fields: [] }; continue; }
    if (/^--- END OF DOCUMENT ---$/.test(line)) { flush(); continue; }
    if (!current) continue;
    const label = line.trim().replace(/\s*\(\d\)\s*$/, "");
    if (!label) continue;
    if (!current.pages.includes(page)) current.pages.push(page);
    if (/^[A-Z][A-Z0-9 &'/·-]*$/.test(label) && label.length > 2 && !/^\[/.test(label)) current.fields.push(titleCase(label));
  }
  flush();

  const skills = [];
  let ability = null;
  const sheetPageOne = lines.slice(0, lines.findIndex((line) => /^--- SHEET PAGE 2 /.test(line)));
  for (const line of sheetPageOne) {
    const trimmed = line.trim();
    const abilityMatch = trimmed.match(/^([A-Z]+) \(3\)$/);
    if (abilityMatch) {
      const name = titleCase(abilityMatch[1]);
      ability = ABILITY_ORDER.includes(name) ? name : null;
      continue;
    }
    if (trimmed && !trimmed.startsWith("|") && !trimmed.startsWith("[")) { ability = null; continue; }
    if (!ability || !trimmed.startsWith("|")) continue;
    const cells = trimmed.slice(1, -1).split("|").map((cell) => cell.trim());
    const skill = cells[0].replace(/\s*\(\d\)\s*$/, "");
    if (!skill || skill === "Entry" || skill.startsWith("---") || skill === "Saving Throw") continue;
    if (!skills.some((entry) => entry.name === skill)) skills.push({ name: skill, ability });
  }
  skills.sort((left, right) => ABILITY_ORDER.indexOf(left.ability) - ABILITY_ORDER.indexOf(right.ability));

  return {
    sourceId: "character-sheet",
    printedPageCount: 11,
    logicalSectionCount: sections.length,
    abilities: ABILITY_ORDER,
    skills,
    sections,
  };
}

// -------------------------------------------------------------- rulebook ----

function rulebookPage(lines, number) {
  const start = lines.indexOf(`[page ${number}]`);
  if (start < 0) throw new Error(`Core rulebook page ${number} not found.`);
  let end = start + 1;
  while (end < lines.length && !/^\[page \d+\]$/.test(lines[end])) end += 1;
  return lines.slice(start + 1, end);
}

const CONDITION_TABLES = [
  { page: 21, headings: ["Conditions: IMPAIRMENTS", "Conditions: HAZARDS & AFFLICTIONS"] },
  { page: 22, headings: ["Conditions: BATTLEFIELD STATES"] },
];

/** GM-only pointers printed in the public book. Their names may appear, their
 * triggers and effects never do — and neither belongs in a player picker. */
const GM_ONLY_CONDITION_NAMES = ["Lost", "Lost Condition", "Second Threshold"];

function parseConditionTables() {
  const lines = readSource("core-rulebook");
  const groups = [];
  for (const { page, headings } of CONDITION_TABLES) {
    const pageLines = rulebookPage(lines, page);
    for (const heading of headings) {
      const start = pageLines.findIndex((line) => line.trim() === heading.trim());
      if (start < 0) throw new Error(`Conditions table not found: ${heading}`);
      const next = pageLines.findIndex((line, index) => index > start && /^\s*Conditions:/.test(line));
      const block = pageLines.slice(start + 1, next < 0 ? pageLines.length : next);
      const content = block.filter((line) => line.trim());
      const indents = content.map((line) => line.length - line.trimStart().length);
      const histogram = new Map();
      for (const indent of indents) histogram.set(indent, (histogram.get(indent) ?? 0) + 1);
      const descriptionIndent = [...histogram.entries()].sort((left, right) => right[1] - left[1])[0][0];
      const rows = [];
      for (const line of content) {
        const indent = line.length - line.trimStart().length;
        const name = indent < descriptionIndent ? repairLigatures(line.slice(0, descriptionIndent)) : "";
        const rest = repairLigatures(line.slice(descriptionIndent));
        if (name) {
          if (!/^[A-Z][A-Za-z' -]{2,24}$/.test(name) || name === "Condition") continue;
          rows.push({ name, effect: [rest].filter(Boolean) });
        } else if (rows.length && rest && !/^[a-z]{1,4}$/.test(rest)) {
          rows[rows.length - 1].effect.push(rest);
        }
      }
      groups.push({ category: heading.replace(/^Conditions:\s*/, ""), page, rows });
    }
  }

  // The Special subcategory is two-column prose that also carries GM-only
  // pointers; only its public condition NAMES are read, never their text.
  const specialLines = rulebookPage(lines, 23);
  const special = [];
  for (const line of specialLines) {
    const match = line.trim().match(/^([A-Z][A-Za-z ]{2,20}?) Condition\.\s*(.*)$/);
    if (!match) continue;
    if (/hidden condition/i.test(match[2])) continue;
    if (GM_ONLY_CONDITION_NAMES.includes(match[1])) continue;
    special.push(match[1]);
  }
  groups.push({
    category: "Special",
    page: 23,
    rows: special.map((name) => ({
      name,
      effect: ["The Special subcategory has an expanded ruleset. See the Core Rulebook, page 23."],
    })),
  });
  return groups;
}

/** Reference rules that live in the rulebook prose rather than in app logic.
 * The rulebook's two-column text layer cannot be re-flowed automatically, so
 * these bodies are hand-transcribed from the cited pages and kept verbatim. */
const RULEBOOK_REFERENCES = [
  {
    group: "Combat",
    term: "Difficulty Classes",
    aliases: ["DC table", "typical difficulty classes", "group check"],
    pages: [9, 10],
    paragraphs: [
      "Difficulty Class. The GM sets the check's DC based on the difficulty of the task. If the total equals or exceeds the DC, the check succeeds.",
      "For saving throws, the effect causing the saving throw usually states its DC. If it does not, the GM sets the DC. A Rite's save DC is calculated using the Rite performer's relevant ability and Proficiency Bonus.",
      "Group Checks. When the band attempts a task together, the GM may call for a group ability check. Every participating Hunter makes the same check against the same DC. If at least half the group succeeds, rounded up, the entire group succeeds. Otherwise, the group fails. Use a group check only when successful Hunters can help cover those who fail.",
    ],
    tables: [{
      title: "Typical Difficulty Classes",
      columns: ["Task Difficulty", "DC"],
      rows: [
        ["Very Easy", "5"],
        ["Easy", "10"],
        ["Medium", "15"],
        ["Hard", "20"],
        ["Very Hard", "25"],
        ["Nearly Impossible", "30"],
      ],
    }],
  },
  {
    group: "Combat",
    term: "Mounted Combat",
    aliases: ["mount", "mounted rules"],
    pages: [19, 20],
    paragraphs: [
      "Mount / Dismount. Mounting or dismounting costs half your speed. You may mount a willing creature within 5 feet that is at least one size larger than you and has suitable anatomy. You cannot mount or dismount while your Speed is 0 or when you lack enough movement.",
      "Mounted Rules. A trained mount shares your Initiative and moves as you direct during your turn. It uses its own Speed and can take only Dash, Disengage, or Dodge. Its action does not replace yours. You cannot use your own movement while mounted except to dismount. You occupy the mount's space for determining your reach, range, and position. Attacks can target either you or the mount, and area effects can affect both.",
      "Independent Mount: An untrained or unwillingly independent mount keeps its Initiative and chooses its own movement and actions.",
      "Opportunity Attacks: When the mount provokes an Opportunity Attack while carrying you, the attacker may target either you or the mount.",
      "Falling Off: If you or the mount are knocked Prone, or the mount is moved against its will, make a DC 10 Dexterity saving throw. On a failure, you fall into an unoccupied space within 5 feet of the mount and become Prone.",
    ],
  },
  {
    group: "Combat",
    term: "Obscurement & Senses",
    aliases: ["lightly obscured", "heavily obscured", "darkvision", "blindsight", "truesight"],
    pages: [19, 20],
    paragraphs: [
      "Effects that obscure vision can prove a significant hindrance to most adventuring tasks.",
      "Lightly obscured — Disadvantage on Perception. Dim light, patchy fog, moderate foliage. Creatures have disadvantage on Wisdom (Perception) checks that rely on sight.",
      "Heavily obscured — Effectively blind. Darkness, opaque fog, dense foliage. A creature in a heavily obscured area effectively suffers from the blinded condition.",
      "The presence or absence of light in an environment creates three categories of illumination.",
      "Bright light — Normal vision. Bright light lets most creatures see normally. Gloomy days still provide bright light, as do torches, lanterns, fires, and other sources of illumination within a specific radius.",
      "Dim light — Lightly obscured. Dim light, also called shadows. Creates a lightly obscured area. An area of dim light is usually a boundary between a source of bright light, such as a torch, and surrounding darkness. The soft light of twilight and dawn also counts as dim light. A particularly brilliant full moon might bathe the land in dim light.",
      "Darkness — Heavily obscured. Creates a heavily obscured area. Characters face darkness outdoors at night (unless a very moonlit night), within the confines of an unlit catacomb or a subterranean vault, or in an area of magical darkness.",
      "Some creatures have extraordinary senses that allow them to perceive their environment.",
      "Blindsight — Perceive without sight. Perceive your surroundings without relying on sight, within a certain radius. Creatures without eyes, such as oozes, and creatures with echolocation or heightened senses, such as bats and true dragons, have this sense.",
      "Darkvision — Limited vision in darkness. A creature with Darkvision can see better in the dark or low light conditions, within a certain radius. Within a specified range, a creature with darkvision can see in darkness as if the darkness were dim light, so areas of darkness are only lightly obscured as far as that creature is concerned. However, the creature can't discern color in darkness, only shades of gray.",
      "Truesight — See in darkness. And see the truth of the world. A creature with truesight can see everything in its true form, independent of the environment. A creature with truesight can, out to a specific range, see in normal and magical darkness, see invisible creatures and objects, automatically detect visual illusions and succeed on saving throws against them, and perceives the original form of a shape-changer or a creature that is transformed by magic. Furthermore, the creature can see into other planes.",
    ],
  },
  {
    group: "Combat",
    term: "Difficult Shots",
    aliases: ["cover", "long range", "ranged attack penalties"],
    pages: [19, 20],
    paragraphs: [
      "Obstacles can provide cover during combat, making a target more difficult to harm.",
      "Half cover — AC and DEX Save Bonus + 2.",
      "Three-quarters cover — AC and DEX Save Bonus + 5.",
      "Full cover — In Total cover the target can't be targeted directly, but might still be affected by AoE rites etc.",
      "Ranged Attack Rules for Difficult Shots: Trace a straight line from the center of the attacker's space through the center of the target's space and extend it 5 feet beyond the target.",
      "A creature between the attacker and target grants the target Half Cover. A creature sharing the target's space, Grappling it, or Grappled by it grants Three-Quarters Cover.",
      "If an attack misses only because of cover granted by a creature, compare the same attack total against that creature's AC. On a hit, that creature is hit instead. If several creatures are in the line of fire, use the one closest to the attacker.",
      "A creature in the first space directly behind the target does not grant cover. However, if the attack misses the target by 1 or 2 and would hit that creature's AC, it hits that creature instead. A merely adjacent creature is not at risk unless the line crosses its space.",
    ],
    tables: [{
      title: "Cover",
      columns: ["Cover", "Effect"],
      rows: [
        ["Half cover", "AC and DEX Save Bonus + 2"],
        ["Three-quarters cover", "AC and DEX Save Bonus + 5"],
        ["Full cover", "Cannot be targeted directly, but might still be affected by AoE rites etc."],
      ],
    }],
  },
  {
    group: "Equipment",
    term: "Damaging Objects",
    aliases: ["object hit points", "object armor class"],
    pages: [108],
    paragraphs: [
      "An object can be targeted by an attack unless the GM determines that the attack could not reasonably damage it. When an object does not have listed statistics, the GM may use the following guidelines:",
      "Fragile Object: AC 10; 5 Hit Points. Sturdy Object: AC 15; 15 Hit Points. Reinforced Object: AC 20; 30 Hit Points.",
      "Objects are normally Immune to Poison and Mind damage. The GM may grant an object Resistance or Immunity to any damage type that could not reasonably damage its material. An object is broken or destroyed when reduced to 0 Hit Points. A specific object's statistics override these general rules.",
    ],
    tables: [{
      title: "Object statistics",
      columns: ["Object", "Armor Class", "Hit Points"],
      rows: [
        ["Fragile Object", "10", "5"],
        ["Sturdy Object", "15", "15"],
        ["Reinforced Object", "20", "30"],
      ],
    }],
  },
  {
    group: "Equipment",
    term: "Improvised Weapons",
    aliases: ["improvised weapon"],
    pages: [108],
    paragraphs: [
      "If you use an object—such as a table leg, frying pan, or bottle—as a makeshift weapon, see the rules below. Also see those rules if you wield a weapon in an unusual way, such as using a Ranged weapon to make a melee attack.",
      "An improvised weapon is an object that was not designed to be used as a weapon, or a normal weapon used in an unintended manner.",
      "A melee improvised weapon deals 1d4 Bludgeoning, Piercing, or Slashing damage, as determined by the GM, and uses Strength for its attack and damage rolls.",
      "A thrown improvised weapon has a normal range of 20 feet and a long range of 60 feet. It deals 1d4 damage of a type determined by the GM and uses Dexterity for its attack and damage rolls.",
      "Add your Proficiency Bonus if you are proficient with improvised weapons. At the GM's discretion, an object that closely resembles an existing weapon may instead use that weapon's statistics and proficiency.",
    ],
  },
  {
    group: "Conditions",
    term: "The Madness Die",
    aliases: ["madness die", "star face", "blank face", "eye face", "insane quirks"],
    pages: [3, 23],
    paragraphs: [
      "C&S uses a special Madness Die while a creature is Insane. It is an eight-sided die with three blank faces, three star faces, and two eye faces. If the custom Madness Die is unavailable, use a normal d8: 1-3 = Blank, 4-6 = Star, and 7-8 = Eye.",
      "Insane Condition. When your Madness equals or exceeds your Max Sanity, you gain the Insane condition. The Insane condition ends immediately when your current Madness is reduced below your Max Sanity.",
      "When you gain the Insane condition, roll a d100 and consult the Insane Quirks table. You retain the rolled Insane Quirk until the Insane condition ends.",
      "While Insane, you also have a Madness Die. This die represent your unstable violence and has the following consequences; Once per turn, when you take the Attack action or perform a harmful Rite, choose your target or area as normal. Before resolving the attack or Rite, roll the Madness Die.",
      "Star. Resolve the attack or Rite normally.",
      "Blank. The attack or Rite turns against your nearest ally instead. If more than one ally is equally near, you choose which one is targeted. If no ally is within range, you must spend available movement to bring an ally within range or reach, if possible. If no ally can be targeted after this movement, the attack or Rite turns inward and targets you instead.",
      "Eye. For one moment, you understand what you are about to do. You may either end your turn immediately with no effect, or roll the Madness Die again. If the second roll is another Eye, the vision breaks you: roll your Sanity Die, suffer that much Mind damage, and gain 1 Madness.",
      "Cracked Perception. While Insane, you have Advantage on Wisdom (Perception) checks and Intelligence (Eldritch Knowledge) checks made to notice unnatural things, hidden entities, dream-architecture, impossible movement, or occult distortions.",
    ],
    tables: [{
      title: "Madness Die faces",
      columns: ["Face", "d8", "Result"],
      rows: [
        ["Blank", "1-3", "The attack or Rite turns against your nearest ally instead."],
        ["Star", "4-6", "Resolve the attack or Rite normally."],
        ["Eye", "7-8", "End your turn with no effect, or roll again; a second Eye costs your Sanity Die in Mind damage and 1 Madness."],
      ],
    }],
  },
  {
    group: "Rest & Transformation",
    term: "Unsafe Rest Checks",
    aliases: ["guards", "unsafe rest", "rest guards"],
    pages: [26],
    paragraphs: [
      "Guarding an Unsafe Rest. Before resting outside a Safe Zone, choose any number of characters to act as Guards. A Guard remains awake for the entire rest and gains none of its benefits. Their Sleepless Counters continue to increase normally.",
      "The GM rolls once on the Unsafe Rest Check table. If the result is within the listed range, the rest is interrupted. The interruption might be an attack, patrol, flood, collapsing shelter, eldritch disturbance, or another danger appropriate to the location. The GM has to decide before the rest what occurs on a interrupted rest.",
      "Guards make any checks required to detect the approaching danger. Characters surprised by an interruption roll Initiative with Disadvantage.",
    ],
    tables: [{
      title: "Unsafe Rest Checks",
      columns: ["Guards", "Rest Is Interrupted On…"],
      rows: [
        ["0", "1-10"],
        ["1", "1-6"],
        ["2", "1-3"],
        ["3 or more", "1"],
      ],
    }],
  },
  {
    group: "Rest & Transformation",
    term: "Rest Interruption",
    aliases: ["interrupted rest", "short rest", "long rest"],
    pages: [25],
    paragraphs: [
      "Interruption: A Short Rest is interrupted if you roll Initiative, take damage, perform a Rite other than a Whisper, or undertake strenuous activity. An interrupted Short Rest grants no benefits.",
      "Interruption: A Long Rest is interrupted if you roll Initiative, take damage, perform a Rite other than a Whisper, or spend 1 hour walking or performing strenuous activity. If at least 1 hour passed before the interruption, you gain the benefits of an unsafe Short Rest. You may resume the Long Rest after the interruption, but its required duration increases by 1 hour for each interruption.",
    ],
  },
];

// --------------------------------------------------------------- output -----

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

function riteParagraphs(entry, kind) {
  return [
    kind === "Whisper" ? `Whisper · ${entry.type}` : `Level ${entry.level} ${entry.type}`,
    entry.section ? `Section: ${entry.section}` : "",
    `Performing: ${entry.performing}`,
    `Range: ${entry.range}`,
    `Duration: ${entry.duration}`,
    entry.special,
    entry.text,
    entry.upgrade,
    entry.sourceNote ? `Source note: ${entry.sourceNote}` : "",
  ].filter(Boolean);
}

const rites = parseRites();
const whispers = parseWhispers();
const characterSheet = parseCharacterSheet();
const conditionGroups = parseConditionTables();
const conditionsNamedByCurrentSources = conditionGroups.flatMap((group) => group.rows.map((row) => row.name));

if (rites.length !== 21) throw new Error(`Expected 21 Rites, parsed ${rites.length}.`);
if (whispers.length !== 6) throw new Error(`Expected 6 Whispers, parsed ${whispers.length}.`);
if (characterSheet.sections.length !== 6) throw new Error(`Expected 6 character-sheet pages, parsed ${characterSheet.sections.length}.`);
for (const name of conditionsNamedByCurrentSources) {
  if (GM_ONLY_CONDITION_NAMES.includes(name)) throw new Error(`GM-only condition reached the public catalog: ${name}`);
}

for (const rite of rites) {
  add({
    id: `rite-${rite.id}`,
    term: rite.name,
    aliases: [rite.type, `level ${rite.level} rite`, rite.section].filter(Boolean),
    paragraphs: riteParagraphs(rite, "Rite"),
    tables: rite.tables ?? [],
    group: "Rites",
    sourceId: "book-of-the-deepcaller",
    locator: `Level ${rite.level} · ${rite.type}`,
    sourcePages: rite.sourcePages,
  });
}

for (const whisper of whispers) {
  add({
    id: `whisper-${whisper.id}`,
    term: whisper.name,
    aliases: [whisper.type, "Whisper"],
    paragraphs: riteParagraphs(whisper, "Whisper"),
    group: "Whispers",
    sourceId: "whispers",
    locator: `Whisper · ${whisper.type}`,
    sourcePages: whisper.sourcePages,
  });
}

for (const section of characterSheet.sections) {
  add({
    id: `character-sheet-${section.id}`,
    term: section.title,
    aliases: section.fields,
    paragraphs: [`Fields: ${section.fields.join(", ")}.`],
    group: "Character Sheet",
    sourceId: "character-sheet",
    locator: section.title,
    sourcePages: section.sourcePages,
  });
}

add({
  id: "character-sheet-abilities-and-skills",
  term: "Abilities & Skills",
  aliases: ["skill list", ...characterSheet.abilities, ...characterSheet.skills.map((skill) => skill.name)],
  paragraphs: ["The current character sheet records a score, modifier, and saving throw for each ability, plus the listed skills."],
  tables: [{
    title: "Skills by ability",
    columns: ["Ability", "Skill"],
    rows: characterSheet.skills.map((skill) => [skill.ability, skill.name]),
  }],
  group: "Character Sheet",
  sourceId: "character-sheet",
  locator: "Identity & Abilities",
  sourcePages: [1, 2],
});

for (const group of conditionGroups) {
  for (const row of group.rows) {
    add({
      id: `condition-${slug(row.name)}`,
      term: row.name,
      aliases: ["condition", group.category.toLowerCase()],
      paragraphs: row.effect,
      group: "Conditions",
      sourceId: "core-rulebook",
      locator: `Conditions · ${group.category}`,
      sourcePages: [group.page],
    });
  }
}

for (const reference of RULEBOOK_REFERENCES) {
  add({
    id: `rulebook-${slug(reference.term)}`,
    term: reference.term,
    aliases: reference.aliases,
    paragraphs: reference.paragraphs ?? [`Reference rule in the C&S Core Rulebook, ${reference.pages.length === 1 ? "page" : "pages"} ${reference.pages.join("–")}. The rulebook is the authority; the app does not restate it.`],
    tables: reference.tables ?? [],
    group: reference.group,
    sourceId: "core-rulebook",
    locator: reference.term,
    sourcePages: reference.pages,
  });
}

rmSync(PUBLIC_DOCUMENT_ROOT, { recursive: true, force: true });

const sources = SOURCES.map((source) => {
  const publicPath = `/source-library/${source.id}/${source.id}.txt`;
  mkdirSync(join(PUBLIC_DOCUMENT_ROOT, source.id), { recursive: true });
  writeFileSync(`public${publicPath}`, readFileSync(source.file));
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
    sourceFiles: [source.file],
    fileLabels: [basename(source.file)],
  };
});

const output = {
  schemaVersion: 5,
  sources,
  sourceHashes: Object.fromEntries(SOURCES.map((source) => [source.id, sha256(source.file)])),
  entries,
  characterSheet,
  rites,
  whispers,
  conditionsNamedByCurrentSources,
};
writeFileSync(OUTPUT_PATH, `${JSON.stringify(output, null, 2)}\n`);
console.log(`Generated ${OUTPUT_PATH}: ${entries.length} player entries and ${sources.length} public downloads from ${SOURCES.length} current sources.`);
