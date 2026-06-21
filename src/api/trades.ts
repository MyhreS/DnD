import {
  collection,
  doc,
  addDoc,
  updateDoc,
  onSnapshot,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
  type Timestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Trade, TradeSide, TradeStatus } from "@/types";

const tradesCol = collection(db, "trades");

/** Coerce a Firestore Timestamp | number | undefined to ms epoch. */
function ms(v: unknown): number {
  if (typeof v === "number") return v;
  if (v && typeof (v as Timestamp).toMillis === "function") return (v as Timestamp).toMillis();
  return 0;
}

function toSide(v: unknown): TradeSide {
  const side = (v as Partial<TradeSide> | undefined) ?? {};
  return {
    items: (side.items as TradeSide["items"]) ?? [],
    coins: (side.coins as number) ?? 0,
  };
}

function toTrade(id: string, data: Record<string, unknown>): Trade {
  return {
    id,
    gameId: (data.gameId as string | null) ?? null,
    fromUid: (data.fromUid as string) ?? "",
    fromName: (data.fromName as string) ?? "Hunter",
    toUid: (data.toUid as string) ?? "",
    toName: (data.toName as string) ?? "Hunter",
    offer: toSide(data.offer),
    request: toSide(data.request),
    status: (data.status as TradeStatus) ?? "pending",
    error: (data.error as string | null) ?? null,
    sandbox: (data.sandbox as boolean) ?? false,
    createdAt: ms(data.createdAt),
    updatedAt: ms(data.updatedAt),
    settledAt: data.settledAt ? ms(data.settledAt) : null,
  };
}

export interface CreateTradeInput {
  gameId: string | null;
  fromUid: string;
  fromName: string;
  toUid: string;
  toName: string;
  offer: TradeSide;
  request: TradeSide;
  sandbox?: boolean;
}

export async function createTrade(input: CreateTradeInput): Promise<string> {
  const ref = await addDoc(tradesCol, {
    gameId: input.gameId,
    fromUid: input.fromUid,
    fromName: input.fromName,
    toUid: input.toUid,
    toName: input.toName,
    offer: input.offer,
    request: input.request,
    status: "pending",
    error: null,
    sandbox: input.sandbox ?? false,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    settledAt: null,
  });
  return ref.id;
}

export async function acceptTrade(id: string): Promise<void> {
  await updateDoc(doc(tradesCol, id), { status: "accepted", updatedAt: serverTimestamp() });
}

export async function declineTrade(id: string): Promise<void> {
  await updateDoc(doc(tradesCol, id), { status: "declined", updatedAt: serverTimestamp() });
}

export async function cancelTrade(id: string): Promise<void> {
  await updateDoc(doc(tradesCol, id), { status: "cancelled", updatedAt: serverTimestamp() });
}

/** Live-subscribe to a game's recent trades (newest first). */
export function subscribeGameTrades(
  gameId: string,
  cb: (trades: Trade[]) => void,
  onError?: (e: unknown) => void,
): () => void {
  const q = query(
    tradesCol,
    where("gameId", "==", gameId),
    orderBy("createdAt", "desc"),
    limit(50),
  );
  return onSnapshot(
    q,
    (snap) => cb(snap.docs.map((d) => toTrade(d.id, d.data()))),
    (err) => {
      console.error("Trades subscription failed", err);
      onError?.(err);
    },
  );
}
