import {
  collection,
  doc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  startAfter,
  type Unsubscribe,
} from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { getBlob, ref, uploadBytes } from "firebase/storage";
import { workshopDb, workshopFunctions, workshopStorage } from "@/workshop/firebase";
import type {
  AgentState,
  WorkshopAttachment,
  WorkshopMessage,
  WorkshopPresence,
  WorkshopTicket,
} from "@/workshop/types";

export const WORKSHOP_TICKET_PAGE_SIZE = 15;
export const WORKSHOP_MESSAGE_PAGE_SIZE = 20;

export type WorkshopTicketBatch = {
  tickets: WorkshopTicket[];
  hasMore: boolean;
};

export type WorkshopMessagePage = {
  messages: WorkshopMessage[];
  hasOlder: boolean;
};

const claimAccessCall = httpsCallable<undefined, { ok: boolean; role: "admin" | "creator" }>(
  workshopFunctions,
  "claimWorkshopAccess",
);
const createTicketCall = httpsCallable<
  { body: string; attachments: WorkshopAttachment[]; submissionId: string },
  { ok: boolean; ticketId: string }
>(workshopFunctions, "createWorkshopTicket");
const replyTicketCall = httpsCallable<
  { ticketId: string; body: string; attachments: WorkshopAttachment[]; submissionId: string },
  { ok: boolean }
>(workshopFunctions, "replyWorkshopTicket");
const markTicketReadCall = httpsCallable<{ ticketId: string }, { ok: boolean }>(workshopFunctions, "markWorkshopTicketRead");
export async function claimWorkshopAccess(): Promise<"admin" | "creator"> {
  return (await claimAccessCall()).data.role;
}

export async function createWorkshopTicket(body: string, attachments: WorkshopAttachment[], submissionId: string) {
  return (await createTicketCall({ body, attachments, submissionId })).data.ticketId;
}

export async function replyWorkshopTicket(
  ticketId: string,
  body: string,
  attachments: WorkshopAttachment[],
  submissionId: string,
) {
  await replyTicketCall({ ticketId, body, attachments, submissionId });
}

export async function markWorkshopTicketRead(ticketId: string) {
  await markTicketReadCall({ ticketId });
}

export async function uploadWorkshopImages(uid: string, files: File[]): Promise<WorkshopAttachment[]> {
  const draftId = crypto.randomUUID();
  return Promise.all(files.map(async (file) => {
    const safeName = file.name.replace(/[^A-Za-z0-9._-]/g, "_").slice(-120) || "image";
    const path = `workshop/${uid}/${draftId}/${crypto.randomUUID()}-${safeName}`;
    await uploadBytes(ref(workshopStorage, path), file, { contentType: file.type });
    return { name: file.name, path, contentType: file.type, size: file.size };
  }));
}

export async function workshopImageBlob(path: string): Promise<Blob> {
  return getBlob(ref(workshopStorage, path));
}

export function subscribeWorkshopTickets(
  visibleLimit: number,
  next: (batch: WorkshopTicketBatch) => void,
  fail: (error: Error) => void,
): Unsubscribe {
  return onSnapshot(
    query(collection(workshopDb, "workshopTickets"), orderBy("updatedAt", "desc"), limit(visibleLimit + 1)),
    (snapshot) => {
      const visible = snapshot.docs.slice(0, visibleLimit);
      next({
        tickets: visible.map((item) => ({ id: item.id, ...item.data() }) as WorkshopTicket),
        hasMore: snapshot.docs.length > visibleLimit,
      });
    },
    fail,
  );
}

export function subscribeWorkshopTicket(
  ticketId: string,
  next: (ticket: WorkshopTicket | null) => void,
  fail: (error: Error) => void,
): Unsubscribe {
  return onSnapshot(doc(workshopDb, "workshopTickets", ticketId), (snapshot) => {
    next(snapshot.exists() ? ({ id: snapshot.id, ...snapshot.data() } as WorkshopTicket) : null);
  }, fail);
}

export function subscribeWorkshopMessages(
  ticketId: string,
  next: (page: WorkshopMessagePage) => void,
  fail: (error: Error) => void,
): Unsubscribe {
  return onSnapshot(
    query(
      collection(workshopDb, "workshopTickets", ticketId, "messages"),
      orderBy("sequence", "desc"),
      limit(WORKSHOP_MESSAGE_PAGE_SIZE + 1),
    ),
    (snapshot) => {
      const visible = snapshot.docs.slice(0, WORKSHOP_MESSAGE_PAGE_SIZE);
      next({
        messages: visible.map((item) => ({ id: item.id, ...item.data() }) as WorkshopMessage).reverse(),
        hasOlder: snapshot.docs.length > WORKSHOP_MESSAGE_PAGE_SIZE,
      });
    },
    fail,
  );
}

export async function loadOlderWorkshopMessages(ticketId: string, beforeSequence: number): Promise<WorkshopMessagePage> {
  const snapshot = await getDocs(query(
    collection(workshopDb, "workshopTickets", ticketId, "messages"),
    orderBy("sequence", "desc"),
    startAfter(beforeSequence),
    limit(WORKSHOP_MESSAGE_PAGE_SIZE + 1),
  ));
  const visible = snapshot.docs.slice(0, WORKSHOP_MESSAGE_PAGE_SIZE);
  return {
    messages: visible.map((item) => ({ id: item.id, ...item.data() }) as WorkshopMessage).reverse(),
    hasOlder: snapshot.docs.length > WORKSHOP_MESSAGE_PAGE_SIZE,
  };
}

export function subscribeAgentState(next: (state: AgentState | null) => void, fail: (error: Error) => void): Unsubscribe {
  return onSnapshot(doc(workshopDb, "workshopAgent", "state"), (snapshot) => {
    next(snapshot.exists() ? snapshot.data() as AgentState : null);
  }, fail);
}

export async function updateWorkshopPresence(
  uid: string,
  name: string,
  state: WorkshopPresence["state"],
  viewingTicketId: string | null,
): Promise<void> {
  await setDoc(doc(workshopDb, "workshopPresence", uid), {
    uid,
    name: name.trim().slice(0, 80) || "Workshop member",
    state,
    viewingTicketId,
    lastSeenAt: serverTimestamp(),
  });
}

export function subscribeWorkshopPresence(
  next: (presence: WorkshopPresence[]) => void,
  fail: (error: Error) => void,
): Unsubscribe {
  return onSnapshot(
    query(collection(workshopDb, "workshopPresence"), orderBy("lastSeenAt", "desc"), limit(20)),
    (snapshot) => {
      next(snapshot.docs.map((item) => item.data() as WorkshopPresence));
    },
    fail,
  );
}
