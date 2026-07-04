import {
  collection,
  doc,
  addDoc,
  deleteDoc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  where,
  limit,
  serverTimestamp,
  type Timestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { isPreviewActive } from "@/dev/preview";
import { ITEM_BY_ID } from "@/data/items";
import type { ActivityEvent, ActivityType, InventoryEntry } from "@/types";

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

/** Coerce a Firestore Timestamp | number | undefined to ms epoch. */
function ms(v: unknown): number {
  if (typeof v === "number") return v;
  if (v && typeof (v as Timestamp).toMillis === "function") return (v as Timestamp).toMillis();
  return 0;
}

function toEvent(id: string, data: Record<string, unknown>): ActivityEvent {
  return {
    id,
    campaignId: (data.campaignId as string) ?? "",
    campaignName: (data.campaignName as string) ?? "a campaign",
    type: (data.type as ActivityType) ?? "campaign.created",
    message: (data.message as string) ?? "",
    actorUid: (data.actorUid as string) ?? "",
    actorName: (data.actorName as string) ?? "",
    characterId: (data.characterId as string | null) ?? null,
    ownerUid: (data.ownerUid as string | null) ?? null,
    at: ms(data.at),
  };
}

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

/** Live-subscribe to a campaign's log (newest first, sorted client-side to
 * avoid a composite index). */
export function subscribeCampaignActivity(
  campaignId: string,
  cb: (events: ActivityEvent[]) => void,
  onError?: (err: unknown) => void,
): () => void {
  const q = query(activityCol, where("campaignId", "==", campaignId), limit(300));
  return onSnapshot(
    q,
    (snap) => cb(snap.docs.map((d) => toEvent(d.id, d.data())).sort((a, b) => b.at - a.at)),
    (err) => {
      console.error("Activity subscription failed", err);
      onError?.(err);
    },
  );
}

/** Live-subscribe to one hunter's history across campaigns. The ownerUid
 * filter is what makes the query provable under the rules (owner reads own). */
export function subscribeCharacterActivity(
  characterId: string,
  ownerUid: string,
  cb: (events: ActivityEvent[]) => void,
  onError?: (err: unknown) => void,
): () => void {
  const q = query(
    activityCol,
    where("characterId", "==", characterId),
    where("ownerUid", "==", ownerUid),
    limit(200),
  );
  return onSnapshot(
    q,
    (snap) => cb(snap.docs.map((d) => toEvent(d.id, d.data())).sort((a, b) => b.at - a.at)),
    (err) => {
      console.error("Character history subscription failed", err);
      onError?.(err);
    },
  );
}

/** DM: purge a campaign's whole log (part of deleting the campaign). */
export async function purgeCampaignActivity(campaignId: string): Promise<void> {
  const snap = await getDocs(query(activityCol, where("campaignId", "==", campaignId)));
  await Promise.all(snap.docs.map((d) => deleteDoc(d.ref)));
}
