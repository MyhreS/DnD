import type { HunterCard, SheetData } from "@/types";

/** Load-time shape cleanup only. It preserves unknown historical ids and never
 * recalculates a character from retired rule catalogs. */
export function normalizeCard(raw: HunterCard): HunterCard {
  const sheet = raw.sheet && typeof raw.sheet === "object" && !Array.isArray(raw.sheet)
    ? raw.sheet as SheetData
    : undefined;
  return {
    ...raw,
    ...(sheet ? { sheet } : {}),
  };
}

/** Minimal compatibility skeleton. The current app immediately presents the
 * manual source sheet; no class, feat, armor, item, or point-buy defaults are
 * granted here. */
export function emptyCard(params: { ownerUid: string; email: string; displayName: string }): HunterCard {
  const now = Date.now();
  return {
    id: crypto.randomUUID(),
    ownerUid: params.ownerUid,
    ownerEmail: params.email,
    ownerName: params.displayName,
    name: "",
    classId: "",
    subclassId: null,
    background: "",
    level: 1,
    preparedWhispers: [],
    notes: "",
    createdAt: now,
    updatedAt: now,
  };
}

export function emptySheetCard(params: { ownerUid: string; email: string; displayName: string }): HunterCard {
  return { ...emptyCard(params), sheet: { actualName: params.displayName } };
}
