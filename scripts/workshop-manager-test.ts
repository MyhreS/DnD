import { outcomeMessage, parseAgentResult, requiresSimonReply, ticketNeedsSimon, workshopChannelContext } from "./workshop-manager-core";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

assert(ticketNeedsSimon("Make the mobile buttons cleaner") === null, "ordinary UI work must proceed");
assert(ticketNeedsSimon("Delete every user in production") !== null, "destructive production work must stop");
assert(ticketNeedsSimon("Please change the authentication permissions") !== null, "access changes must stop");
assert(requiresSimonReply("Protected change", false), "protected work must wait without Simon's thread reply");
assert(!requiresSimonReply("Protected change", true), "Simon's thread reply must unblock one protected run");

const channelContext = workshopChannelContext("myhrefjeld@gmail.com");
assert(channelContext.includes("not chatting in Codex"), "worker must know it replies through Workshop");
assert(channelContext.includes("myhrefjeld@gmail.com"), "worker must know the authenticated requester");
assert(channelContext.includes("cannot do: edit or delete messages"), "worker must know creator UI limitations");
assert(channelContext.includes("review or merge a pull request"), "worker must not delegate repository work to the creator");
assert(channelContext.includes("technicalSummary is stored only in the internal run log"), "worker must separate visible and private output");
assert(channelContext.includes("They do not see your reasoning"), "worker must understand what is hidden from the creator");
assert(channelContext.includes("Only an authenticated reply from Simon"), "worker must understand Needs Simon authorization");

const finished = parseAgentResult(JSON.stringify({
  outcome: "finished",
  summaryForCreator: "The game page is cleaner.",
  productionUrl: "https://dandd-ea955.web.app/game",
}));
assert(finished.outcome === "finished", "finished outcome must parse");
assert(outcomeMessage(finished).startsWith("Done"), "creator result must be plain and explicit");

const reviewRequest = parseAgentResult(JSON.stringify({
  outcome: "finished",
  summaryForCreator: "The pull request is ready for review. Please approve and merge it.",
}));
assert(outcomeMessage(reviewRequest) === "Done — the updated version is available now.", "finished work must never ask the creator for review");

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
