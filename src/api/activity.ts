import {
  collection,
  doc,
  addDoc,
  deleteDoc,
  getDoc,
  getDocs,
  query,
  where,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { isPreviewActive } from "@/dev/preview";
import { ITEM_BY_ID } from "@/data/items";
import type { ActivityType, InventoryEntry } from "@/types";

/** "2× Rope, 5 gp" — a human line for an item/coin bundle in log messages. */
export function describeLoot(items: InventoryEntry[], coins: number): string {
  const parts = items.map((e) => `${e.qty}× ${ITEM_BY_ID[e.itemId]?.name ?? e.itemId}`);
  if (coins > 0) parts.push(`${coins} gp`);
  return parts.join(", ") || "nothing";
}

// The campaign chronicle: append-only event lines, one doc per event. Members
// read a campaign's log; a hunter's owner reads that hunter's history across
// campaigns (see firestore.rules /activity).
const activityCol = collection(db, "activity");

// Campaign names are denormalized onto every event so a hunter's history can
// name campaigns the owner has since left. Cached per session — names rarely
// change and a stale name in old log lines is fine.
const nameCache = new Map<string, string>();
async function campaignName(campaignId: string): Promise<string> {
  const cached = nameCache.get(campaignId);
  if (cached) return cached;
  try {
    const snap = await getDoc(doc(db, "campaigns", campaignId));
    const name = (snap.data()?.name as string | undefined) ?? "a campaign";
    nameCache.set(campaignId, name);
    return name;
  } catch {
    return "a campaign";
  }
}

export interface LogInput {
  campaignId: string;
  type: ActivityType;
  message: string;
  actorUid: string;
  actorName: string;
  characterId?: string | null;
  ownerUid?: string | null;
}

/** Append a line to the campaign log. Fire-and-forget: NEVER throws — a failed
 * log line must not fail the action it describes. */
export async function logEvent(e: LogInput): Promise<void> {
  if (isPreviewActive()) return;
  try {
    await addDoc(activityCol, {
      campaignId: e.campaignId,
      campaignName: await campaignName(e.campaignId),
      type: e.type,
      message: e.message,
      actorUid: e.actorUid,
      actorName: e.actorName,
      characterId: e.characterId ?? null,
      ownerUid: e.ownerUid ?? null,
      at: serverTimestamp(),
    });
  } catch (err) {
    console.warn("Couldn't write to the campaign log", err);
  }
}

/** DM: purge a campaign's whole log (part of deleting the campaign). */
export async function purgeCampaignActivity(campaignId: string): Promise<void> {
  const snap = await getDocs(query(activityCol, where("campaignId", "==", campaignId)));
  await Promise.all(snap.docs.map((d) => deleteDoc(d.ref)));
}
