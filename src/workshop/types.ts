import type { Timestamp } from "firebase/firestore";

export type WorkshopStatus = "not_done" | "doing_now" | "needs_simon" | "finished" | "declined";

export type WorkshopAttachment = {
  name: string;
  path: string;
  contentType: string;
  size: number;
};

export type WorkshopTicket = {
  id: string;
  title: string;
  status: WorkshopStatus;
  authorName: string;
  authorEmail: string;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
  revision: number;
  attachmentCount: number;
};

export type WorkshopMessage = {
  id: string;
  kind: "request" | "follow_up" | "agent" | "system";
  body: string;
  authorName: string;
  sequence: number;
  createdAt?: Timestamp;
  attachments: WorkshopAttachment[];
  productionUrl?: string;
};

export type AgentState = {
  lastHeartbeatAt?: Timestamp;
  workerId?: string;
  currentTicketId?: string | null;
};

export const STATUS_LABELS: Record<WorkshopStatus, string> = {
  not_done: "Not done",
  doing_now: "Doing now",
  needs_simon: "Needs Simon",
  finished: "Finished",
  declined: "Declined",
};
