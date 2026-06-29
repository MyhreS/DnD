import { jsPDF } from "jspdf";
import type { HunterCard } from "@/types";
import { getClass, getSubclass } from "@/data/classes";
import { ARMOR_BY_ID } from "@/data/armor";
import { SKILLS } from "@/data/skills";
import { RITE_BY_ID } from "@/data/rites";
import { resolveInventory, groupByCarry } from "@/lib/inventory";
import { ABILITIES, abilityModifier, formatModifier } from "@/data/abilities";
import {
  maxHp,
  armorClass,
  maxSanity,
  proficiencyBonus,
  saveModifier,
  skillModifier,
  riteStats,
} from "@/lib/character";

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
  const sub = getSubclass(card.classId, card.subclassId);
  const ac = armorClass(card.abilities, card.mainArmorId);
  const lvl = card.level;
  const prof = proficiencyBonus(lvl);
  const hpMax = klass ? maxHp(klass, card.abilities, lvl) : 0;
  const sanMax = klass ? maxSanity(klass, card.abilities, lvl) : 0;
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
  const subtitle = [klass?.title, sub?.name, card.background, klass ? `Level ${lvl}` : null]
    .filter(Boolean)
    .join("  ·  ");
  doc.text(subtitle, M, y);
  y += 14;
  doc.setDrawColor(...LINE);
  doc.line(M, y, PAGE_W - M, y);
  y += 16;

  // Vitals row
  const vitals: [string, string][] = [
    ["Armor Class", String(ac.total)],
    ["Hit Points", `${card.currentHp ?? hpMax} / ${hpMax}`],
    ["Speed", klass ? `${klass.speedFt}ft` : "—"],
    ["Prof.", formatModifier(prof)],
    ["Sanity", klass ? `${card.sanity ?? sanMax} / ${sanMax}` : "—"],
    ["Blood Tinge", card.bloodTinge ? "Yes" : "No"],
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

  // Saving throws & skills
  if (klass) {
    const saves = ABILITIES.map(
      ({ key, short }) =>
        `${short} ${formatModifier(saveModifier(klass, card.abilities, key, lvl))}${klass.savingThrows.includes(key) ? "*" : ""}`,
    ).join("   ");
    y = section(doc, y, "SAVING THROWS  (* = proficient)");
    y = paragraph(doc, y, saves);
    y += 4;

    if (card.skillProficiencies.length) {
      const skills = SKILLS.filter((s) => card.skillProficiencies.includes(s.name))
        .map((s) => `${s.name} ${formatModifier(skillModifier(card.abilities, s.name, true, lvl))}`)
        .join(",   ");
      y = section(doc, y, "SKILL PROFICIENCIES");
      y = paragraph(doc, y, skills);
      y += 4;
    }

    y = section(doc, y, "PROFICIENCIES");
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

  // Rites (Deepcaller)
  if (klass?.caster) {
    const r = riteStats(card.abilities, lvl);
    y = section(doc, y, "RITES");
    y = line(doc, y, "Rite stats", `Save DC ${r.saveDc}   ·   Attack ${formatModifier(r.attack)}   ·   INT ${formatModifier(r.modifier)}`);
    const prepared = (card.preparedWhispers ?? [])
      .map((id) => RITE_BY_ID[id]?.name)
      .filter(Boolean)
      .join(", ");
    y = line(doc, y, "Prepared", prepared || "—");
    y += 6;
  }

  // Armor & gear
  y = section(doc, y, "ARMOR & GEAR");
  y = line(doc, y, "Worn", armor ? `${armor.name} (${armor.ac})` : "Unarmored");
  if (armor) y = paragraph(doc, y, armor.special);
  y = line(doc, y, "Coins", `${card.coins ?? 0} GP`);
  if (klass) y = line(doc, y, "Equipment", klass.startingEquipment.join(", "));
  y += 8;

  // Inventory
  const inv = resolveInventory(card);
  if (inv.length) {
    y = section(doc, y, "INVENTORY");
    for (const { carry, entries } of groupByCarry(inv)) {
      const list = entries.map((e) => (e.qty > 1 ? `${e.item.name} ×${e.qty}` : e.item.name)).join(", ");
      y = line(doc, y, carry, list);
    }
    y += 8;
  }

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
