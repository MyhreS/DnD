import { outcomeMessage, parseAgentResult, ticketNeedsSimon } from "./workshop-manager-core";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

assert(ticketNeedsSimon("Make the mobile buttons cleaner") === null, "ordinary UI work must proceed");
assert(ticketNeedsSimon("Delete every user in production") !== null, "destructive production work must stop");
assert(ticketNeedsSimon("Please change the authentication permissions") !== null, "access changes must stop");

const finished = parseAgentResult(JSON.stringify({
  outcome: "finished",
  summaryForCreator: "The game page is cleaner.",
  productionUrl: "https://dandd-ea955.web.app/game",
}));
assert(finished.outcome === "finished", "finished outcome must parse");
assert(outcomeMessage(finished).startsWith("Done"), "creator result must be plain and explicit");

const needsSimon = parseAgentResult(JSON.stringify({
  outcome: "needs_simon",
  summaryForCreator: "Waiting for a decision.",
  needsSimonReason: "Choose which old data may be removed.",
}));
assert(outcomeMessage(needsSimon).includes("Choose which old data"), "decision must be preserved");

const declined = parseAgentResult(JSON.stringify({
  outcome: "declined",
  summaryForCreator: "This request was declined.",
  declineReason: "It would remove the permanent ticket history.",
}));
assert(declined.outcome === "declined", "declined outcome must parse");
assert(outcomeMessage(declined) === "Declined — It would remove the permanent ticket history.", "decline reason must be clear");

let missingDeclineReasonFailed = false;
try {
  parseAgentResult(JSON.stringify({ outcome: "declined", summaryForCreator: "No." }));
} catch {
  missingDeclineReasonFailed = true;
}
assert(missingDeclineReasonFailed, "declined outcome without a reason must fail closed");

let invalidFailed = false;
try { parseAgentResult("not json"); } catch { invalidFailed = true; }
assert(invalidFailed, "invalid agent output must fail closed");

console.log("Workshop manager tests passed");
