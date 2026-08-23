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
  lastMessageAt?: Timestamp;
  lastAgentReplyAt?: Timestamp;
  retryAfter?: Timestamp;
  readAtBy?: Record<string, Timestamp>;
  revision: number;
  claimedRevision?: number;
  lastCompletedRevision?: number;
  lastOutcome?: "finished" | "answered" | "needs_simon" | "declined";
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
  model?: string;
  reasoningEffort?: string;
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
  mainRefreshIntervalMs?: number;
  lastMainRefreshAt?: Timestamp | null;
};

export const WORKSHOP_AGENT_MODELS = ["gpt-5.6-sol", "gpt-5.6-terra"] as const;
export const WORKSHOP_REASONING_EFFORTS = ["low", "medium", "high", "xhigh", "max"] as const;
export type WorkshopAgentModel = typeof WORKSHOP_AGENT_MODELS[number];
export type WorkshopReasoningEffort = typeof WORKSHOP_REASONING_EFFORTS[number];
export type WorkshopAgentConfig = {
  model: WorkshopAgentModel;
  reasoningEffort: WorkshopReasoningEffort;
  revision?: number;
  updatedAt?: Timestamp;
};

export const WORKSHOP_DEFAULT_AGENT_CONFIG: WorkshopAgentConfig = {
  model: "gpt-5.6-sol",
  reasoningEffort: "xhigh",
};

export const STATUS_LABELS: Record<WorkshopStatus, string> = {
  not_done: "Not done",
  doing_now: "Doing now",
  needs_simon: "Needs decision",
  finished: "Finished",
  declined: "Declined",
};
