import {
  collection,
  doc,
  addDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  getDoc,
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
import { db, auth } from "@/lib/firebase";
import { emptyCard } from "@/lib/character";
import { saveCharacter } from "@/api/players";
import { logEvent, purgeCampaignActivity } from "@/api/activity";
import type { Campaign, CampaignMember, HunterCard } from "@/types";

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
    invitedEmails: (data.invitedEmails as string[]) ?? [],
    sandbox: (data.sandbox as boolean) ?? false,
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
  sandbox?: boolean;
}

export async function createCampaign(input: CreateCampaignInput): Promise<string> {
  const ref = await addDoc(campaignsCol, {
    name: input.name,
    dmUid: input.dmUid,
    dmName: input.dmName,
    inviteCode: generateInviteCode(),
    memberUids: [input.dmUid],
    invitedEmails: [],
    sandbox: input.sandbox ?? false,
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
  await logEvent({
    campaignId: ref.id,
    type: "campaign.created",
    message: `${input.dmName} founded the campaign «${input.name}».`,
    actorUid: input.dmUid,
    actorName: input.dmName,
  });
  return ref.id;
}

const TEST_BOTS = Array.from({ length: 5 }, (_, index) => ({
  name: `Bot · Example Hunter ${index + 1}`,
}));

function buildBotCard(botUid: string, campaignId: string, name: string): HunterCard {
  return {
    ...emptyCard({ ownerUid: botUid, email: "", displayName: name }),
    name,
    classId: "",
    level: 3,
    campaignId,
    sheet: {
      actualName: "Synthetic test player",
      name,
      class: "Example class",
      background: "Example background",
      level: "3",
      hpCur: "20",
      hpMax: "20",
      ac: "12",
      initiative: "+1",
    },
  };
}

/** Create a real, playable "Test Run" campaign seeded with the DM + 5 bot hunters
 * (they take no actions) so the DM can see how the populated app looks & plays.
 * Requires the relaxed /characters create rule (campaign DM authors bot cards). */
export async function createTestCampaign(dm: { uid: string; name: string; email: string }): Promise<string> {
  // A DM only ever needs one Test Run at a time: delete previous sandboxes
  // (and their bot hunters) first, so abandoned Test Runs can't pile up in the
  // world-readable hunter gallery. Best-effort — a failed purge must never
  // block the new Test Run; the next one retries it.
  try {
    const mine = await getDocs(query(campaignsCol, where("memberUids", "array-contains", dm.uid)));
    const stale = mine.docs.filter((d) => d.data().sandbox === true && d.data().dmUid === dm.uid);
    for (const d of stale) await deleteCampaign(d.id);
  } catch (err) {
    console.warn("Couldn't clean up a previous Test Run", err);
  }
  const campaignId = await createCampaign({
    name: "Test Run",
    dmUid: dm.uid,
    dmName: dm.name,
    dmEmail: dm.email,
    sandbox: true,
  });
  for (let i = 0; i < TEST_BOTS.length; i++) {
    const bot = TEST_BOTS[i];
    const botUid = `bot-${campaignId}-${i + 1}`;
    const card = buildBotCard(botUid, campaignId, bot.name);
    // Write the member doc FIRST — the relaxed /characters create rule requires
    // an existing member doc for the owner (rules see committed state), so this
    // must precede saveCharacter(card).
    await setDoc(doc(membersCol(campaignId), botUid), {
      uid: botUid,
      name: bot.name,
      email: "",
      role: "player",
      characterId: card.id,
      joinedAt: serverTimestamp(),
    });
    await updateDoc(doc(campaignsCol, campaignId), { memberUids: arrayUnion(botUid) });
    await saveCharacter(card);
  }
  return campaignId;
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
  await logEvent({
    campaignId,
    type: "member.joined",
    message: `${input.name} joined the campaign (invite code).`,
    actorUid: input.uid,
    actorName: input.name,
  });
  return campaignId;
}

/** DM invites a player by email (lowercased; they'll see it in their menu). */
export async function inviteByEmail(campaignId: string, email: string): Promise<void> {
  await updateDoc(doc(campaignsCol, campaignId), {
    invitedEmails: arrayUnion(email.trim().toLowerCase()),
  });
}

/** DM revokes an email invite. */
export async function uninviteEmail(campaignId: string, email: string): Promise<void> {
  await updateDoc(doc(campaignsCol, campaignId), {
    invitedEmails: arrayRemove(email.trim().toLowerCase()),
  });
}

/** DM regenerates the share code (invalidates the old one). Returns the new code. */
export async function regenerateInviteCode(campaignId: string): Promise<string> {
  const code = generateInviteCode();
  await updateDoc(doc(campaignsCol, campaignId), { inviteCode: code });
  return code;
}

/** Live-subscribe to campaigns this email has been invited to. */
export function subscribeInvitedCampaigns(
  email: string,
  cb: (campaigns: Campaign[]) => void,
  onError?: (err: unknown) => void,
): () => void {
  const q = query(campaignsCol, where("invitedEmails", "array-contains", email.toLowerCase()));
  return onSnapshot(
    q,
    (snap) => cb(snap.docs.map((d) => toCampaign(d.id, d.data()))),
    (err) => {
      console.error("Invited campaigns subscription failed", err);
      onError?.(err);
    },
  );
}

export interface AcceptInviteInput {
  campaignId: string;
  uid: string;
  name: string;
  email: string;
}

/** Accept an invite: become a member and clear the email invite. */
export async function acceptInvite(input: AcceptInviteInput): Promise<void> {
  await updateDoc(doc(campaignsCol, input.campaignId), {
    memberUids: arrayUnion(input.uid),
    invitedEmails: arrayRemove(input.email.toLowerCase()),
  });
  await setDoc(
    doc(membersCol(input.campaignId), input.uid),
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
  await logEvent({
    campaignId: input.campaignId,
    type: "member.joined",
    message: `${input.name} joined the campaign (accepted an invite).`,
    actorUid: input.uid,
    actorName: input.name,
  });
}

/** Decline an invite: just clear the email invite. */
export async function declineInvite(campaignId: string, email: string): Promise<void> {
  await updateDoc(doc(campaignsCol, campaignId), {
    invitedEmails: arrayRemove(email.toLowerCase()),
  });
}

export async function setMemberCharacter(
  campaignId: string,
  uid: string,
  characterId: string | null,
  /** For the campaign log: who did it, and which hunter came in. */
  meta?: { actorUid: string; actorName: string; characterName: string; ownerUid: string },
): Promise<void> {
  await setDoc(doc(membersCol(campaignId), uid), { characterId }, { merge: true });
  if (meta && characterId) {
    await logEvent({
      campaignId,
      type: "hunter.brought",
      message: `${meta.actorName} brought ${meta.characterName} into the campaign.`,
      actorUid: meta.actorUid,
      actorName: meta.actorName,
      characterId,
      ownerUid: meta.ownerUid,
    });
  }
}

export async function leaveCampaign(campaignId: string, uid: string, name?: string): Promise<void> {
  // Log first — after the member doc is gone, the rules no longer let us write.
  await logEvent({
    campaignId,
    type: "member.left",
    message: `${name ?? "A hunter"} left the campaign.`,
    actorUid: uid,
    actorName: name ?? "A hunter",
  });
  // Un-bind the leaver's own hunters first (while still a member), so they
  // don't stay labelled with a campaign they're no longer in.
  const chars = await getDocs(
    query(collection(db, "characters"), where("campaignId", "==", campaignId), where("ownerUid", "==", uid)),
  );
  await Promise.all(chars.docs.map((d) => setDoc(d.ref, { campaignId: null }, { merge: true })));
  await updateDoc(doc(campaignsCol, campaignId), { memberUids: arrayRemove(uid) });
  await deleteDoc(doc(membersCol(campaignId), uid));
}

/** DM: permanently delete a campaign and its scoped data. Seeded bots are
 *  removed; real players' hunters are KEPT (just un-bound from the campaign).
 *  The DM can only delete docs the rules permit, so other players' RSVPs under a
 *  deleted session may be left orphaned (harmless — their session is gone). */
export async function deleteCampaign(campaignId: string): Promise<void> {
  // Self-heal an orphaned campaign: if the DM's member doc is missing (a
  // half-completed create or delete), every member-gated purge below would be
  // denied and the campaign would be stuck forever. Rules always allow writing
  // your own member doc, so restore it before purging.
  const uid = auth.currentUser?.uid;
  if (uid) {
    const camp = await getDoc(doc(campaignsCol, campaignId));
    if (camp.exists() && camp.data().dmUid === uid) {
      const me = await getDoc(doc(membersCol(campaignId), uid));
      if (!me.exists()) {
        await setDoc(doc(membersCol(campaignId), uid), {
          uid,
          name: (camp.data().dmName as string) ?? "DM",
          email: "",
          role: "dm",
          characterId: null,
          joinedAt: serverTimestamp(),
        });
      }
    }
  }
  const purgeScoped = async (coll: string, subs: string[] = []) => {
    const snap = await getDocs(query(collection(db, coll), where("campaignId", "==", campaignId)));
    for (const d of snap.docs) {
      for (const sub of subs) {
        const ss = await getDocs(collection(db, coll, d.id, sub));
        await Promise.all(ss.docs.map((x) => deleteDoc(x.ref)));
      }
      await deleteDoc(d.ref);
    }
  };
  await purgeScoped("games", ["participants", "loot", "notes", "combatants", "battleView"]);
  await purgeScoped("sessions");
  await purgeScoped("trades");
  await purgeScoped("shopListings");
  await purgeScoped("sellRequests");
  await purgeCampaignActivity(campaignId);
  // Characters: delete the seeded bots; keep real players' hunters (un-bind them).
  const chars = await getDocs(query(collection(db, "characters"), where("campaignId", "==", campaignId)));
  await Promise.all(
    chars.docs.map((d) =>
      (d.data().ownerUid as string | undefined)?.startsWith("bot-")
        ? deleteDoc(d.ref)
        : setDoc(d.ref, { campaignId: null }, { merge: true }),
    ),
  );
  // Members subcollection, then the campaign doc itself.
  const members = await getDocs(membersCol(campaignId));
  await Promise.all(members.docs.map((d) => deleteDoc(d.ref)));
  await deleteDoc(doc(campaignsCol, campaignId));
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
