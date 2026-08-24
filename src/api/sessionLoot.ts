import { collection, onSnapshot, type Timestamp } from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { db, functions } from "@/lib/firebase";
import type { CustomItem, SessionLoot } from "@/types";

export type SessionItemDraft = Pick<CustomItem, "name" | "category" | "carry" | "weightLb"> &
  Partial<Pick<CustomItem, "note" | "armorCategory" | "acValue" | "attackBonus" | "damage" | "weaponNotes">>;

const createLootFn = httpsCallable<{ gameId: string; item: SessionItemDraft }, { lootId: string }>(
  functions,
  "createStandaloneGameLoot",
);
const claimLootFn = httpsCallable<{ gameId: string; lootId: string; characterId: string }, { ok: boolean }>(
  functions,
  "claimStandaloneGameLoot",
);

function ms(value: unknown): number {
  if (typeof value === "number") return value;
  if (value && typeof (value as Timestamp).toMillis === "function") return (value as Timestamp).toMillis();
  return 0;
}

export async function createSessionLoot(gameId: string, item: SessionItemDraft): Promise<string> {
  const result = await createLootFn({ gameId, item });
  return result.data.lootId;
}

export async function claimSessionLoot(gameId: string, lootId: string, characterId: string): Promise<void> {
  await claimLootFn({ gameId, lootId, characterId });
}

export function subscribeSessionLoot(
  gameId: string,
  callback: (loot: SessionLoot[]) => void,
  onError?: (error: unknown) => void,
): () => void {
  return onSnapshot(
    collection(db, "games", gameId, "loot"),
    (snapshot) => callback(snapshot.docs.flatMap((row) => {
      const data = row.data();
      const item = data.item as CustomItem | undefined;
      // This collection also contains the older fallen-Hunter drop format
      // (`itemId`, `qty`). Only session-authored unique items belong here.
      if (!item || typeof item.name !== "string" || typeof item.id !== "string") return [];
      return [{
        id: row.id,
        item,
        status: data.status === "claimed" ? "claimed" : "available",
        createdAt: ms(data.createdAt),
        claimedAt: data.claimedAt ? ms(data.claimedAt) : null,
        claimedByUid: (data.claimedByUid as string | null) ?? null,
        claimedByCharacterId: (data.claimedByCharacterId as string | null) ?? null,
        claimedByName: (data.claimedByName as string | null) ?? null,
      } satisfies SessionLoot];
    }).sort((a, b) => b.createdAt - a.createdAt)),
    (error) => {
      console.error("Session items subscription failed", error);
      onError?.(error);
    },
  );
}
