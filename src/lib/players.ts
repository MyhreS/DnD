import {
  doc,
  getDoc,
  setDoc,
  collection,
  getDocs,
} from "firebase/firestore";
import { db } from "./firebase";
import type { HunterCard } from "@/types";

const playersCol = collection(db, "players");

export async function loadHunterCard(uid: string): Promise<HunterCard | null> {
  const snap = await getDoc(doc(playersCol, uid));
  return snap.exists() ? (snap.data() as HunterCard) : null;
}

export async function saveHunterCard(card: HunterCard): Promise<void> {
  await setDoc(doc(playersCol, card.uid), card, { merge: true });
}

/** Every party member's card (allowed by rules for any allowlisted user). */
export async function loadParty(): Promise<HunterCard[]> {
  const snap = await getDocs(playersCol);
  return snap.docs.map((d) => d.data() as HunterCard);
}
