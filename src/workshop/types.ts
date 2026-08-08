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
  readAtBy?: Record<string, Timestamp>;
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

export type WorkshopPresence = {
  uid: string;
  name: string;
  state: "active" | "away";
  viewingTicketId: string | null;
  lastSeenAt?: Timestamp;
};

export type AgentWorkState = {
  progressStage?: number;
  progressActivity?: string;
  lastCompletedActivity?: string;
  progressUpdatedAt?: Timestamp;
  workStartedAt?: Timestamp;
};

export type AgentState = AgentWorkState & {
  lastHeartbeatAt?: Timestamp;
  workerId?: string;
  currentTicketId?: string | null;
  activeTicketIds?: string[];
  activeTicketCount?: number;
  maxConcurrentTickets?: number;
  activeTickets?: Record<string, AgentWorkState>;
  checkingNow?: boolean;
  triggerMode?: "realtime_with_fallback";
  fallbackIntervalMs?: number;
  watchingChanges?: boolean;
  model?: string;
  reasoningEffort?: string;
};

export const STATUS_LABELS: Record<WorkshopStatus, string> = {
  not_done: "Not done",
  doing_now: "Doing now",
  needs_simon: "Needs decision",
  finished: "Finished",
  declined: "Declined",
};
