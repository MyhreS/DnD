import {
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  type Unsubscribe,
} from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { getBlob, ref, uploadBytes } from "firebase/storage";
import { workshopDb, workshopFunctions, workshopStorage } from "@/workshop/firebase";
import type {
  AgentState,
  WorkshopAttachment,
  WorkshopMessage,
  WorkshopTicket,
} from "@/workshop/types";

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
  next: (tickets: WorkshopTicket[]) => void,
  fail: (error: Error) => void,
): Unsubscribe {
  return onSnapshot(
    query(collection(workshopDb, "workshopTickets"), orderBy("updatedAt", "desc")),
    (snapshot) => next(snapshot.docs.map((item) => ({ id: item.id, ...item.data() }) as WorkshopTicket)),
    fail,
  );
}

export function subscribeWorkshopMessages(
  ticketId: string,
  next: (messages: WorkshopMessage[]) => void,
  fail: (error: Error) => void,
): Unsubscribe {
  return onSnapshot(
    query(collection(workshopDb, "workshopTickets", ticketId, "messages"), orderBy("sequence", "asc")),
    (snapshot) => next(snapshot.docs.map((item) => ({ id: item.id, ...item.data() }) as WorkshopMessage)),
    fail,
  );
}

export function subscribeAgentState(next: (state: AgentState | null) => void, fail: (error: Error) => void): Unsubscribe {
  return onSnapshot(doc(workshopDb, "workshopAgent", "state"), (snapshot) => {
    next(snapshot.exists() ? snapshot.data() as AgentState : null);
  }, fail);
}
