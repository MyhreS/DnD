export type ManagerOutcome = "finished" | "needs_simon" | "declined";

export type AgentResult = {
  outcome: ManagerOutcome;
  summaryForCreator: string;
  technicalSummary?: string;
  productionUrl?: string;
  needsSimonReason?: string;
  declineReason?: string;
};

const RISK_PATTERNS = [
  /\b(delete|erase|purge|wipe)\b.*\b(user|account|database|collection|history|production)\b/i,
  /\b(secret|api key|password|credential|private key|token)\b/i,
  /\b(billing|payment|charge|purchase|subscription)\b/i,
  /\b(authentication|authorization|permission|security rules?)\b/i,
  /\b(legal|license|copyright|privacy policy)\b/i,
  /\b(workshop (agent|manager|bot)|heartbeat worker)\b/i,
  /\b(migrate|overwrite|replace)\b.*\b(production|database|user data)\b/i,
];
const REVIEW_REQUEST = /\b(?:ready for|needs?|please|can you|could you)\b.{0,80}\b(?:review|approve|merge)\b/i;

export function ticketNeedsSimon(text: string): string | null {
  if (text.length > 40_000) return "The request is unusually large and needs to be split into a clear first change.";
  if (RISK_PATTERNS.some((pattern) => pattern.test(text))) {
    return "This request touches a protected or high-impact area. Simon needs to approve the exact change.";
  }
  return null;
}

export function requiresSimonReply(reason: string | null, approvedInThread: boolean): boolean {
  return reason !== null && !approvedInThread;
}

export function parseAgentResult(raw: string): AgentResult {
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    throw new Error("The coding agent did not return a valid result.");
  }
  const result = value as Partial<AgentResult>;
  if (result.outcome !== "finished" && result.outcome !== "needs_simon" && result.outcome !== "declined") {
    throw new Error("The coding agent returned an unknown outcome.");
  }
  if (!result.summaryForCreator?.trim()) {
    throw new Error("The coding agent did not explain the result.");
  }
  if (result.outcome === "needs_simon" && !result.needsSimonReason?.trim()) {
    throw new Error("The coding agent did not state what Simon needs to decide.");
  }
  if (result.outcome === "declined" && !result.declineReason?.trim()) {
    throw new Error("The coding agent did not explain why the request was declined.");
  }
  return {
    outcome: result.outcome,
    summaryForCreator: result.summaryForCreator.trim().slice(0, 4_000),
    technicalSummary: result.technicalSummary?.trim().slice(0, 8_000),
    productionUrl: safeProductionUrl(result.productionUrl),
    needsSimonReason: result.needsSimonReason?.trim().slice(0, 2_000),
    declineReason: result.declineReason?.trim().slice(0, 2_000),
  };
}

function safeProductionUrl(value: string | undefined): string | undefined {
  if (!value) return undefined;
  try {
    const url = new URL(value);
    return url.protocol === "https:" ? url.toString() : undefined;
  } catch {
    return undefined;
  }
}

export function outcomeMessage(result: AgentResult): string {
  if (result.outcome === "needs_simon") {
    return `I need Simon to decide one thing before I continue: ${result.needsSimonReason}`;
  }
  if (result.outcome === "declined") {
    return `Declined — ${result.declineReason}`;
  }
  if (REVIEW_REQUEST.test(result.summaryForCreator)) {
    return "Done — the updated version is available now.";
  }
  return result.summaryForCreator.startsWith("Done")
    ? result.summaryForCreator
    : `Done — the updated version is available now. ${result.summaryForCreator}`;
}
