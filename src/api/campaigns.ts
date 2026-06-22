import {
  collection,
  doc,
  addDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  onSnapshot,
  query,
  where,
  limit,
  arrayUnion,
  arrayRemove,
  serverTimestamp,
  type Timestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Campaign, CampaignMember } from "@/types";

const campaignsCol = collection(db, "campaigns");

/** Coerce a Firestore Timestamp | number | undefined to ms epoch. */
function ms(v: unknown): number {
  if (typeof v === "number") return v;
  if (v && typeof (v as Timestamp).toMillis === "function") return (v as Timestamp).toMillis();
  return 0;
}

/** Generate a 6-char invite code (uppercase, no ambiguous 0/O/1/I). */
export function generateInviteCode(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return code;
}

function toCampaign(id: string, data: Record<string, unknown>): Campaign {
  return {
    id,
    name: (data.name as string) ?? "Campaign",
    dmUid: (data.dmUid as string) ?? "",
    dmName: (data.dmName as string) ?? "DM",
    inviteCode: (data.inviteCode as string) ?? "",
    memberUids: (data.memberUids as string[]) ?? [],
    createdAt: ms(data.createdAt),
  };
}

function membersCol(campaignId: string) {
  return collection(db, "campaigns", campaignId, "members");
}

export interface CreateCampaignInput {
  name: string;
  dmUid: string;
  dmName: string;
  dmEmail: string;
}

export async function createCampaign(input: CreateCampaignInput): Promise<string> {
  const ref = await addDoc(campaignsCol, {
    name: input.name,
    dmUid: input.dmUid,
    dmName: input.dmName,
    inviteCode: generateInviteCode(),
    memberUids: [input.dmUid],
    createdAt: serverTimestamp(),
  });
  await setDoc(doc(membersCol(ref.id), input.dmUid), {
    uid: input.dmUid,
    name: input.dmName,
    email: input.dmEmail,
    role: "dm",
    characterId: null,
    joinedAt: serverTimestamp(),
  });
  return ref.id;
}

export interface JoinCampaignInput {
  code: string;
  uid: string;
  name: string;
  email: string;
}

export async function joinCampaign(input: JoinCampaignInput): Promise<string> {
  const code = input.code.trim().toUpperCase();
  const snap = await getDocs(query(campaignsCol, where("inviteCode", "==", code), limit(1)));
  if (snap.empty) throw new Error("No campaign found for that code.");
  const campaignId = snap.docs[0].id;
  await updateDoc(doc(campaignsCol, campaignId), { memberUids: arrayUnion(input.uid) });
  await setDoc(
    doc(membersCol(campaignId), input.uid),
    {
      uid: input.uid,
      name: input.name,
      email: input.email,
      role: "player",
      characterId: null,
      joinedAt: serverTimestamp(),
    },
    { merge: true },
  );
  return campaignId;
}

export async function setMemberCharacter(
  campaignId: string,
  uid: string,
  characterId: string | null,
): Promise<void> {
  await setDoc(doc(membersCol(campaignId), uid), { characterId }, { merge: true });
}

export async function leaveCampaign(campaignId: string, uid: string): Promise<void> {
  await updateDoc(doc(campaignsCol, campaignId), { memberUids: arrayRemove(uid) });
  await deleteDoc(doc(membersCol(campaignId), uid));
}

/** Live-subscribe to the campaigns the given user is a member of. */
export function subscribeMyCampaigns(
  uid: string,
  cb: (campaigns: Campaign[]) => void,
  onError?: (err: unknown) => void,
): () => void {
  const q = query(campaignsCol, where("memberUids", "array-contains", uid));
  return onSnapshot(
    q,
    (snap) => cb(snap.docs.map((d) => toCampaign(d.id, d.data()))),
    (err) => {
      console.error("My campaigns subscription failed", err);
      onError?.(err);
    },
  );
}

export function subscribeCampaign(
  id: string,
  cb: (campaign: Campaign | null) => void,
  onError?: (err: unknown) => void,
): () => void {
  return onSnapshot(
    doc(campaignsCol, id),
    (snap) => cb(snap.exists() ? toCampaign(snap.id, snap.data()) : null),
    (err) => {
      console.error("Campaign subscription failed", err);
      onError?.(err);
    },
  );
}

export function subscribeMembers(
  campaignId: string,
  cb: (members: CampaignMember[]) => void,
  onError?: (err: unknown) => void,
): () => void {
  return onSnapshot(
    membersCol(campaignId),
    (snap) =>
      cb(
        snap.docs.map((d) => {
          const data = d.data();
          return {
            uid: (data.uid as string) ?? d.id,
            name: (data.name as string) ?? "Hunter",
            email: (data.email as string) ?? "",
            role: (data.role as CampaignMember["role"]) ?? "player",
            characterId: (data.characterId as string | null) ?? null,
            joinedAt: ms(data.joinedAt),
          } satisfies CampaignMember;
        }),
      ),
    (err) => {
      console.error("Members subscription failed", err);
      onError?.(err);
    },
  );
}
