import { CURRENT_WHISPERS } from "@/data/codex";
import type { AbilityKey, HunterCard, SheetData } from "@/types";

const ABILITY_KEYS: AbilityKey[] = ["str", "dex", "con", "int", "wis", "cha"];

function displayId(value: string | null | undefined): string {
  return (value ?? "")
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

/** Seed the current manual sheet from values already stored on a legacy card.
 * This preserves player data without re-running any removed class, armor,
 * progression, sanity, or carrying rules. Unknown derived maxima stay blank. */
export function deriveSheetFromCard(card: HunterCard): SheetData {
  const sheet: SheetData = {};
  const put = (key: string, value: string | boolean | number | null | undefined) => {
    if (value === undefined || value === null || value === "" || value === false) return;
    sheet[key] = typeof value === "number" ? String(value) : value;
  };

  put("actualName", card.ownerName);
  put("name", card.name);
  put("background", card.background);
  put("class", displayId(card.classId));
  put("subclass", displayId(card.subclassId));
  put("level", Math.max(1, card.level || 1));
  put("insight", card.insight);
  put("transformation", card.transformationLevel);
  put("sanityCur", card.sanity);
  put("hpCur", card.currentHp);
  put("bloodTinge", card.bloodTinge === true);
  put("coins", card.coins);

  for (const key of ABILITY_KEYS) {
    const score = card.abilities?.[key];
    if (typeof score === "number" && Number.isFinite(score)) put(`${key}Score`, score);
  }

  const featNames = [...new Set([card.feat, ...(card.feats ?? [])].filter((value): value is string => Boolean(value)))];
  put("feats", featNames.join("\n"));
  put("pageNotes", card.notes);

  const equipment = [
    ...(card.sheetAutomation?.legacyEquipment ?? []),
    ...(card.customItems ?? []).map((item) => ({
      name: item.name,
      carrying: item.carry,
      slot: item.itemSlot ?? "",
      weight: item.weightLb == null ? "" : String(item.weightLb),
    })),
  ];
  equipment.slice(0, 12).forEach((line, row) => {
    put(`eq_${row}_0`, line.name);
    put(`eq_${row}_1`, line.carrying);
    put(`eq_${row}_2`, line.slot);
    put(`eq_${row}_3`, line.weight);
  });

  const currentWhisperIds = new Set(CURRENT_WHISPERS.map((whisper) => whisper.id));
  for (const id of card.preparedWhispers ?? []) {
    if (currentWhisperIds.has(id)) put(`whisper_${id}`, true);
  }

  return sheet;
}
