import { jsPDF } from "jspdf";
import type { AbilityKey, HunterCard, HunterClass } from "@/types";
import { getClass, getSubclass } from "@/data/classes";
import { ARMOR_BY_ID } from "@/data/armor";
import { SKILLS_BY_ABILITY } from "@/data/skills";
import { RITE_BY_ID } from "@/data/rites";
import { resolveInventory, groupByCarry, totalWeight, carryCondition } from "@/lib/inventory";
import { ABILITIES, abilityModifier, formatModifier } from "@/data/abilities";
import {
  maxHp,
  armorClass,
  maxSanity,
  proficiencyBonus,
  saveModifier,
  skillModifier,
  riteStats,
  initiativeMod,
  earnedLevel,
  insightToNext,
} from "@/lib/character";

// Colours (print-friendly: dark ink on white, brass/blood accents).
const INK: [number, number, number] = [31, 26, 18];
const GRAY: [number, number, number] = [110, 102, 86];
const GOLD: [number, number, number] = [138, 111, 46];
const LINE: [number, number, number] = [200, 190, 168];
const BOX: [number, number, number] = [244, 240, 231];
const WHITE: [number, number, number] = [255, 255, 255];

const PAGE_W = 595;
const PAGE_BOTTOM = 798; // start a new page before drawing past this
const TOP = 60;
const M = 40; // margin
const CONTENT_W = PAGE_W - M * 2;

/** Move to a new page if `needed` points won't fit; returns the y to draw at. */
function ensure(doc: jsPDF, y: number, needed: number): number {
  if (y + needed > PAGE_BOTTOM) {
    doc.addPage();
    return TOP;
  }
  return y;
}

function slug(s: string): string {
  return s.trim().replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "") || "hunter";
}

function skillsForAbility(key: AbilityKey) {
  return SKILLS_BY_ABILITY.find((g) => g.ability === key)?.skills ?? [];
}

/** Draw one full character sheet (may span multiple pages). */
function drawCharacter(doc: jsPDF, card: HunterCard): void {
  const startPage = doc.getNumberOfPages();
  const klass = getClass(card.classId);
  const sub = getSubclass(card.classId, card.subclassId);
  const ac = armorClass(card.abilities, card.mainArmorId);
  const lvl = card.level;
  const prof = proficiencyBonus(lvl);
  const hpMax = klass ? maxHp(klass, card.abilities, lvl) : 0;
  const sanMax = klass ? maxSanity(klass, card.abilities, lvl) : 0;
  const armor = card.mainArmorId ? ARMOR_BY_ID[card.mainArmorId] : null;
  const inv = resolveInventory(card);
  let y = TOP;

  // --- Identity header (echoes the sheet's name / class / subclass block) ---
  doc.setTextColor(...INK);
  doc.setFont("times", "bold");
  doc.setFontSize(22);
  doc.text(card.name || "Unnamed Hunter", M, y);
  y += 16;
  doc.setFont("times", "italic");
  doc.setFontSize(10.5);
  doc.setTextColor(...GRAY);
  const subtitle = [klass?.title, sub?.name, card.background, klass ? `Level ${lvl}` : null]
    .filter(Boolean)
    .join("   ·   ");
  doc.text(subtitle || "Unfinished hunter", M, y);
  y += 12;
  doc.setDrawColor(...LINE);
  doc.line(M, y, PAGE_W - M, y);
  y += 16;

  // --- Vitals / derived block (HP, Sanity, AC, Initiative, Speed, Insight…) ---
  const earned = earnedLevel(card);
  const toNext = insightToNext(card.insight ?? 0);
  const insightSub = earned > lvl ? "level-up ready" : toNext ? `${toNext.remaining} to L${toNext.nextLevel}` : "max level";
  const passivePerc = 10 + skillModifier(card.abilities, "Perception", card.skillProficiencies.includes("Perception"), lvl);

  y = metricRow(doc, y, [
    { label: "Armor Class", value: String(ac.total), sub: ac.category },
    { label: "Hit Points", value: `${card.currentHp ?? hpMax} / ${hpMax}`, sub: "current / max" },
    { label: "Hit Dice", value: klass ? `${lvl}d${klass.hitDie}` : "—" },
    { label: "Speed", value: klass ? `${klass.speedFt} ft` : "—" },
    { label: "Initiative", value: formatModifier(initiativeMod(card.abilities)) },
    { label: "Passive Perc.", value: String(passivePerc) },
  ]);
  y += 8;
  y = metricRow(doc, y, [
    { label: "Prof. Bonus", value: formatModifier(prof) },
    { label: "Level", value: String(lvl) },
    { label: "Insight", value: String(card.insight ?? 0), sub: insightSub },
    { label: "Transform.", value: String(card.transformationLevel ?? 0) },
    { label: "Sanity", value: klass ? `${card.sanity ?? sanMax} / ${sanMax}` : "—", sub: "current / max" },
    { label: "Sanity Die", value: klass ? klass.sanityDie : "—" },
  ]);
  y += 10;
  doc.setFont("times", "italic");
  doc.setFontSize(8.5);
  doc.setTextColor(...GRAY);
  doc.text(
    `Blood Tinge: ${card.bloodTinge ? "Yes" : "No"}      ·      Size: Medium      ·      Primary ability: ${klass?.primaryAbility ?? "—"}`,
    M,
    y,
  );
  y += 18;

  // --- Abilities & skills (three columns, mirroring the official sheet) ---
  if (klass) {
    doc.setFont("times", "bold");
    doc.setFontSize(10.5);
    doc.setTextColor(...GOLD);
    doc.text("ABILITIES & SKILLS", M, y);
    doc.setDrawColor(...LINE);
    doc.line(M, y + 4, PAGE_W - M, y + 4);
    y += 18;

    const gap = 14;
    const colW = (CONTENT_W - 2 * gap) / 3;
    const cols: AbilityKey[][] = [
      ["str", "dex"],
      ["con", "int"],
      ["wis", "cha"],
    ];
    let maxY = y;
    cols.forEach((keys, ci) => {
      const x = M + ci * (colW + gap);
      let cy = y;
      keys.forEach((key) => {
        cy = abilityBlock(doc, x, cy, colW, card, klass, key, lvl);
        cy += 16;
      });
      maxY = Math.max(maxY, cy);
    });
    y = maxY + 4;
  }

  // --- Proficiencies & training ---
  if (klass) {
    y = section(doc, y, "Proficiencies & Training");
    y = checks(doc, y, "Armor training", [
      { text: "Light", on: klass.armorTraining.includes("Light armor") },
      { text: "Medium", on: klass.armorTraining.includes("Medium armor") },
      { text: "Heavy", on: klass.armorTraining.includes("Heavy armor") },
    ]);
    y = line(doc, y, "Weapons", klass.weaponProficiencies);
    if (klass.toolProficiencies) y = line(doc, y, "Tools", klass.toolProficiencies);
    if (card.feat) y = line(doc, y, "Origin feat", card.feat);
    y += 8;
  }

  if (klass?.signature) {
    y = section(doc, y, "Signature");
    y = paragraph(doc, y, klass.signature);
    y += 6;
  }

  // --- Rites (Deepcaller) ---
  if (klass?.caster) {
    const r = riteStats(card.abilities, lvl);
    y = section(doc, y, "Rites & Whispers");
    y = line(doc, y, "Rite stats", `Save DC ${r.saveDc}   ·   Attack ${formatModifier(r.attack)}   ·   INT ${formatModifier(r.modifier)}`);
    const prepared = (card.preparedWhispers ?? [])
      .map((id) => RITE_BY_ID[id]?.name)
      .filter(Boolean)
      .join(", ");
    y = line(doc, y, "Prepared", prepared || "—");
    y += 6;
  }

  // --- Armor & equipment ---
  y = section(doc, y, "Armor & Equipment");
  y = line(
    doc,
    y,
    "Worn armor",
    armor ? `${armor.name} — ${armor.ac}  (total AC ${ac.total}, ${ac.category})` : `Unarmored — AC ${ac.total}`,
  );
  if (armor?.special) y = paragraph(doc, y, armor.special);
  if (inv.length) {
    const wt = totalWeight(inv);
    const carry = carryCondition(card.abilities.str, wt);
    const delta = carry.speedDelta ? `  (speed ${carry.speedDelta > 0 ? "+" : ""}${carry.speedDelta} ft)` : "";
    y = line(doc, y, "Carried weight", `${wt} lb — ${carry.label}${delta}`);
  }
  y = line(doc, y, "Coins", `${card.coins ?? 0} GP`);
  if (klass?.startingEquipment.length) y = line(doc, y, "Starting kit", klass.startingEquipment.join(", "));
  y += 8;

  // --- Inventory ---
  if (inv.length) {
    y = section(doc, y, "Inventory");
    for (const { carry, entries } of groupByCarry(inv)) {
      const list = entries.map((e) => (e.qty > 1 ? `${e.item.name} ×${e.qty}` : e.item.name)).join(", ");
      y = line(doc, y, carry, list);
    }
    y += 8;
  }

  // --- Notes ---
  if (card.notes) {
    y = section(doc, y, "Notes");
    paragraph(doc, y, card.notes);
  }

  // Footer on every page this character produced.
  const endPage = doc.getNumberOfPages();
  const total = endPage - startPage + 1;
  for (let p = startPage; p <= endPage; p++) {
    doc.setPage(p);
    drawFooter(doc, card, p - startPage + 1, total);
  }
  doc.setPage(endPage);
}

/** One ability + its skills: score box, modifier circle, saving throw and skill
 *  lines with proficiency dots. Returns the y below the block. */
function abilityBlock(
  doc: jsPDF,
  x: number,
  top: number,
  w: number,
  card: HunterCard,
  klass: HunterClass,
  key: AbilityKey,
  lvl: number,
): number {
  const meta = ABILITIES.find((a) => a.key === key)!;
  const score = card.abilities[key];
  const mod = abilityModifier(score);

  doc.setFont("times", "bold");
  doc.setFontSize(9);
  doc.setTextColor(...GOLD);
  doc.text(meta.name.toUpperCase(), x, top);

  const boxTop = top + 5;
  const boxW = 40;
  const boxH = 30;
  doc.setFillColor(...BOX);
  doc.setDrawColor(...LINE);
  doc.roundedRect(x, boxTop, boxW, boxH, 3, 3, "FD");
  doc.setFont("times", "bold");
  doc.setFontSize(16);
  doc.setTextColor(...INK);
  doc.text(String(score), x + boxW / 2, boxTop + 21, { align: "center" });

  const cx = x + boxW + 14;
  const cy = boxTop + boxH / 2;
  doc.setFillColor(...WHITE);
  doc.setDrawColor(...INK);
  doc.circle(cx, cy, 14, "FD");
  doc.setFontSize(13);
  doc.text(formatModifier(mod), cx, cy + 4.5, { align: "center" });

  doc.setFont("times", "normal");
  doc.setFontSize(6);
  doc.setTextColor(...GRAY);
  doc.text("SCORE", x + boxW / 2, boxTop + boxH + 7, { align: "center" });
  doc.text("MOD", cx, boxTop + boxH + 7, { align: "center" });

  let y = boxTop + boxH + 18;
  y = profLine(doc, x, y, w, "Saving throw", saveModifier(klass, card.abilities, key, lvl), klass.savingThrows.includes(key));
  for (const sk of skillsForAbility(key)) {
    const p = card.skillProficiencies.includes(sk.name);
    y = profLine(doc, x, y, w, sk.name, skillModifier(card.abilities, sk.name, p, lvl), p);
  }
  return y;
}

/** A "Label …… +N ●" row; the dot is filled when proficient. */
function profLine(doc: jsPDF, x: number, y: number, w: number, label: string, mod: number, prof: boolean): number {
  doc.setFont("times", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...INK);
  doc.text(label, x, y, { maxWidth: w - 26 });
  const dotX = x + w - 4;
  doc.setDrawColor(...INK);
  if (prof) doc.setFillColor(...INK);
  else doc.setFillColor(...WHITE);
  doc.circle(dotX, y - 2.5, 2.6, "FD");
  doc.setFont("times", "bold");
  doc.text(formatModifier(mod), dotX - 9, y, { align: "right" });
  return y + 12;
}

/** A row of labelled metric boxes (value + optional sub-caption). */
function metricRow(
  doc: jsPDF,
  y: number,
  items: { label: string; value: string; sub?: string }[],
): number {
  const n = items.length;
  const gap = 8;
  const w = (CONTENT_W - gap * (n - 1)) / n;
  const h = 42;
  y = ensure(doc, y, h);
  items.forEach((it, i) => {
    const x = M + i * (w + gap);
    doc.setFillColor(...BOX);
    doc.setDrawColor(...LINE);
    doc.roundedRect(x, y, w, h, 4, 4, "FD");
    doc.setFont("times", "normal");
    doc.setFontSize(7);
    doc.setTextColor(...GRAY);
    doc.text(it.label.toUpperCase(), x + w / 2, y + 13, { align: "center", maxWidth: w - 6 });
    doc.setFont("times", "bold");
    doc.setFontSize(it.value.length > 7 ? 11 : 14);
    doc.setTextColor(...INK);
    doc.text(it.value, x + w / 2, y + (it.sub ? 28 : 30), { align: "center", maxWidth: w - 6 });
    if (it.sub) {
      doc.setFont("times", "italic");
      doc.setFontSize(6.5);
      doc.setTextColor(...GRAY);
      doc.text(it.sub, x + w / 2, y + 37, { align: "center", maxWidth: w - 6 });
    }
  });
  return y + h;
}

/** A labelled row of checkboxes (e.g. armor training). */
function checks(doc: jsPDF, y: number, label: string, items: { text: string; on: boolean }[]): number {
  y = ensure(doc, y, 16);
  doc.setFont("times", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...GRAY);
  doc.text(label, M, y);
  let x = M + 90;
  for (const it of items) {
    doc.setDrawColor(...INK);
    doc.setFillColor(...WHITE);
    doc.rect(x, y - 7, 8, 8, "FD");
    if (it.on) {
      doc.setFillColor(...INK);
      doc.rect(x + 2, y - 5, 4, 4, "F");
    }
    doc.setFont("times", "normal");
    doc.setFontSize(9.5);
    doc.setTextColor(...INK);
    doc.text(it.text, x + 12, y);
    x += 12 + doc.getTextWidth(it.text) + 18;
  }
  return y + 14;
}

function section(doc: jsPDF, y: number, title: string): number {
  // Keep the heading with at least the first following line.
  y = ensure(doc, y, 30);
  doc.setFont("times", "bold");
  doc.setFontSize(10.5);
  doc.setTextColor(...GOLD);
  doc.text(title.toUpperCase(), M, y);
  doc.setDrawColor(...LINE);
  doc.line(M, y + 4, PAGE_W - M, y + 4);
  return y + 16;
}

function line(doc: jsPDF, y: number, label: string, value: string): number {
  doc.setFont("times", "normal");
  doc.setFontSize(10);
  const wrapped = doc.splitTextToSize(value, CONTENT_W - 110);
  const h = Math.max(14, wrapped.length * 12);
  y = ensure(doc, y, h);
  doc.setFontSize(9);
  doc.setTextColor(...GRAY);
  doc.text(label, M, y);
  doc.setTextColor(...INK);
  doc.setFontSize(10);
  doc.text(wrapped, M + 110, y);
  return y + h;
}

function paragraph(doc: jsPDF, y: number, text: string): number {
  doc.setFont("times", "normal");
  doc.setFontSize(10);
  const wrapped = doc.splitTextToSize(text, CONTENT_W);
  const h = wrapped.length * 12 + 2;
  y = ensure(doc, y, h);
  doc.setTextColor(...INK);
  doc.text(wrapped, M, y);
  return y + h;
}

function drawFooter(doc: jsPDF, card: HunterCard, page: number, pages: number): void {
  doc.setFont("times", "italic");
  doc.setFontSize(8);
  doc.setTextColor(...GRAY);
  doc.text(`Catacombs & Starspawns — ${card.name || "Unnamed Hunter"}`, M, 822);
  if (pages > 1) doc.text(`Page ${page} of ${pages}`, PAGE_W - M, 822, { align: "right" });
}

function open(doc: jsPDF, filename: string): void {
  // Open in a new tab so the SPA isn't navigated away (iOS-friendly).
  const url = URL.createObjectURL(doc.output("blob"));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.target = "_blank";
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 8000);
}

/** Generate and download a single character's sheet. */
export function exportCharacterPdf(card: HunterCard): void {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  drawCharacter(doc, card);
  open(doc, `${slug(card.name)}.pdf`);
}

/** Generate one PDF with every hunter, one per page. */
export function exportPartyPdf(cards: HunterCard[]): void {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  cards.forEach((card, i) => {
    if (i > 0) doc.addPage();
    drawCharacter(doc, card);
  });
  open(doc, "catacombs-starspawns-hunters.pdf");
}
