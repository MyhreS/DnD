import { HANDBOOK } from "@/data/handbook";
import { CLASSES } from "@/data/classes";
import { BACKGROUNDS } from "@/data/backgrounds";
import { FEATS } from "@/data/feats";
import { RITES } from "@/data/rites";
import { ARMOR } from "@/data/armor";
import { sectionSlug } from "../hooks/useHandbookIntent";
import type { HunterClass } from "@/types";

export type HandbookTab = "rules" | "classes" | "backgrounds" | "feats" | "rites" | "armory";
export const HANDBOOK_TABS: readonly HandbookTab[] = [
  "rules",
  "classes",
  "backgrounds",
  "feats",
  "rites",
  "armory",
];

/** Result groups, in tab order — also the category chips of the search. */
export const HANDBOOK_GROUPS = [
  "Chapters",
  "Classes",
  "Backgrounds",
  "Feats",
  "Rites",
  "Armory",
] as const;
export type HandbookGroup = (typeof HANDBOOK_GROUPS)[number];

/** One searchable handbook entry + where clicking it should land: a tab, and
 * for chapter sections the `?chapter=&section=` deep link (anchor + pulse). */
export interface HandbookHit {
  id: string;
  term: string;
  aliases?: string[];
  body: string[];
  group: HandbookGroup;
  /** One-line context shown under the result title. */
  context: string;
  tab: HandbookTab;
  chapter?: string;
  section?: string;
  /** For class hits: the class card to auto-open on arrival (`?item=`). */
  item?: string;
}

/** Everything on the Handbook page, flattened for search — full user-visible
 * text, not just titles: every rules-chapter section body, each class with all
 * its level features + subclass text, and complete background / feat / rite /
 * armor descriptions. Pure data — built once at module load. */
export const HANDBOOK_INDEX: HandbookHit[] = [
  ...HANDBOOK.flatMap((ch) =>
    ch.sections.map(
      (s): HandbookHit => ({
        id: `chapter-${ch.id}-${sectionSlug(s.heading)}`,
        term: s.heading,
        aliases: [ch.title],
        body: s.body,
        group: "Chapters",
        context: ch.title,
        tab: "rules",
        chapter: ch.id,
        section: sectionSlug(s.heading),
      }),
    ),
  ),
  ...CLASSES.map(
    (c): HandbookHit => ({
      id: `class-${c.id}`,
      term: c.name,
      aliases: [c.title, ...(c.baseClass ? [c.baseClass] : []), ...c.subclasses.map((s) => s.name)],
      body: classBody(c),
      group: "Classes",
      context: c.tagline,
      tab: "classes",
      item: c.id,
    }),
  ),
  ...BACKGROUNDS.map(
    (b): HandbookHit => ({
      id: `background-${b.id}`,
      term: b.name,
      body: [b.text, b.skills.join(" "), b.feat ?? "", b.tool ?? "", b.equipment.join(", ")],
      group: "Backgrounds",
      context: `Background · ${b.skills.join(", ")}`,
      tab: "backgrounds",
    }),
  ),
  ...FEATS.map(
    (f): HandbookHit => ({
      id: `feat-${f.id}`,
      term: f.name,
      body: [f.text, f.prerequisite ?? "", f.category],
      group: "Feats",
      context: `${f.category} feat`,
      tab: "feats",
    }),
  ),
  ...RITES.map(
    (r): HandbookHit => ({
      id: `rite-${r.id}`,
      term: titleCase(r.name),
      body: [r.text, r.upgrade ?? "", r.special ?? "", r.type, r.performing, r.range, r.duration],
      group: "Rites",
      context: `${r.whisper ? "Whisper" : `Level ${r.level} Rite`} · ${r.type}`,
      tab: "rites",
    }),
  ),
  ...ARMOR.map(
    (a): HandbookHit => ({
      id: `armor-${a.id}`,
      term: a.name,
      body: [a.special, a.impression ?? "", a.category, a.subcategory ?? "", a.ac],
      group: "Armory",
      context: `${a.category} · ${a.ac}`,
      tab: "armory",
    }),
  ),
];

/** Every visible line of a class's detail view: stats, equipment, core
 * features level by level, and each subclass with its features. A hit inside
 * any feature lands on the class card (feature-level anchors don't exist). */
function classBody(c: HunterClass): string[] {
  return [
    c.tagline,
    c.blurb,
    c.signature ?? "",
    c.primaryAbility,
    c.weaponProficiencies,
    c.toolProficiencies,
    c.skillChoices.options.join(", "),
    c.startingEquipment.join(", "),
    ...(c.features ?? []).map(featureLine),
    ...c.subclasses.flatMap((s) => [s.tagline, s.blurb, ...s.features.map(featureLine)]),
  ].filter(Boolean);
}

/** "Name. text" so a body snippet shows which feature matched. */
function featureLine(f: { level: number; name: string; text: string }): string {
  return `${f.name} (level ${f.level}). ${f.text}`;
}

/** Rite names arrive ALL-CAPS from the source PDFs — soften for result cards. */
function titleCase(s: string): string {
  return s.toLowerCase().replace(/(^|[\s-])\w/g, (m) => m.toUpperCase());
}
