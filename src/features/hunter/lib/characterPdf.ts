import { jsPDF } from "jspdf";
import type { HunterCard } from "@/types";
import { getClass } from "@/data/classes";
import { ARMOR_BY_ID } from "@/data/armor";
import { ABILITIES, ABILITY_NAME, abilityModifier, formatModifier } from "@/data/abilities";
import { maxHp, armorClass } from "@/lib/character";

// Colours (print-friendly: dark ink on white, brass/blood accents).
const INK: [number, number, number] = [31, 26, 18];
const GRAY: [number, number, number] = [110, 102, 86];
const GOLD: [number, number, number] = [138, 111, 46];
const LINE: [number, number, number] = [200, 190, 168];
const BOX: [number, number, number] = [244, 240, 231];

const PAGE_W = 595;
const PAGE_BOTTOM = 798; // start a new page before drawing past this
const TOP = 60;
const M = 42; // margin
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

/** Draw one full character sheet on the current page. */
function drawCharacter(doc: jsPDF, card: HunterCard): void {
  const klass = getClass(card.classId);
  const ac = armorClass(card.abilities, card.mainArmorId);
  const hpMax = klass ? maxHp(klass, card.abilities) : 0;
  const armor = card.mainArmorId ? ARMOR_BY_ID[card.mainArmorId] : null;
  let y = 60;

  // Header
  doc.setTextColor(...INK);
  doc.setFont("times", "bold");
  doc.setFontSize(24);
  doc.text(card.name || "Unnamed Hunter", M, y);
  y += 18;
  doc.setFont("times", "italic");
  doc.setFontSize(11);
  doc.setTextColor(...GRAY);
  const sub = [klass?.title, card.background, klass ? `Level ${card.level}` : null]
    .filter(Boolean)
    .join("  ·  ");
  doc.text(sub, M, y);
  y += 14;
  doc.setDrawColor(...LINE);
  doc.line(M, y, PAGE_W - M, y);
  y += 16;

  // Vitals row
  const vitals: [string, string][] = [
    ["Armor Class", String(ac.total)],
    ["Hit Points", `${card.currentHp ?? hpMax} / ${hpMax}`],
    ["Speed", klass ? `${klass.speedFt}ft` : "—"],
    ["Prof.", "+2"],
    ["Madness", String(card.madness ?? 0)],
    ["Transform", String(card.transform ?? 0)],
  ];
  y = drawBoxRow(doc, y, vitals);
  y += 12;

  // Abilities
  doc.setFont("times", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...GOLD);
  doc.text("ABILITIES", M, y);
  y += 8;
  const abilityBoxes = ABILITIES.map(({ key, short }): [string, string] => {
    const score = card.abilities[key];
    return [short, `${formatModifier(abilityModifier(score))}  (${score})`];
  });
  y = drawBoxRow(doc, y, abilityBoxes);
  y += 14;

  // Proficiencies
  if (klass) {
    y = section(doc, y, "PROFICIENCIES");
    y = line(doc, y, "Saving throws", klass.savingThrows.map((k) => ABILITY_NAME[k]).join(", "));
    y = line(doc, y, "Skills", card.skillProficiencies.join(", ") || "—");
    y = line(doc, y, "Weapons", klass.weaponProficiencies);
    y = line(doc, y, "Tools", klass.toolProficiencies);
    y = line(doc, y, "Armor training", klass.armorTraining.join(", "));
    y += 8;
  }

  if (klass?.signature) {
    y = section(doc, y, "SIGNATURE");
    y = paragraph(doc, y, klass.signature);
    y += 6;
  }

  // Armor & gear
  y = section(doc, y, "ARMOR & GEAR");
  y = line(doc, y, "Worn", armor ? `${armor.name} (${armor.ac})` : "Unarmored");
  if (armor) y = paragraph(doc, y, armor.special);
  if (klass) y = line(doc, y, "Equipment", klass.startingEquipment.join(", "));
  y += 8;

  if (card.notes) {
    y = section(doc, y, "NOTES");
    y = paragraph(doc, y, card.notes);
  }

  // Footer
  doc.setFont("times", "italic");
  doc.setFontSize(8);
  doc.setTextColor(...GRAY);
  doc.text(
    `Catacombs & Starspawns · generated ${new Date().toLocaleDateString()}`,
    M,
    820,
  );
}

function drawBoxRow(doc: jsPDF, y: number, items: [string, string][]): number {
  const n = items.length;
  const gap = 8;
  const w = (CONTENT_W - gap * (n - 1)) / n;
  const h = 40;
  y = ensure(doc, y, h);
  items.forEach(([label, value], i) => {
    const x = M + i * (w + gap);
    doc.setFillColor(...BOX);
    doc.setDrawColor(...LINE);
    doc.roundedRect(x, y, w, h, 4, 4, "FD");
    doc.setFont("times", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(...GRAY);
    doc.text(label.toUpperCase(), x + w / 2, y + 13, { align: "center" });
    doc.setFont("times", "bold");
    doc.setFontSize(13);
    doc.setTextColor(...INK);
    doc.text(value, x + w / 2, y + 30, { align: "center" });
  });
  return y + h;
}

function section(doc: jsPDF, y: number, title: string): number {
  // Keep the heading with at least the first following line.
  y = ensure(doc, y, 30);
  doc.setFont("times", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...GOLD);
  doc.text(title, M, y);
  return y + 14;
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
