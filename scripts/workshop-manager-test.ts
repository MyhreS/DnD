import {
  WORKSHOP_MODEL,
  WORKSHOP_MAX_CONCURRENT_TICKETS,
  WORKSHOP_REASONING_EFFORT,
  WORKSHOP_UI_QUALITY_BRIEF,
  deploymentContainsCommit,
  outcomeMessage,
  parseAgentResult,
  progressFromCodexEvent,
  isTemporaryServiceWait,
  requiresDecisionReply,
  ticketNeedsDecision,
  workshopChannelContext,
  workshopCodexArgs,
} from "./workshop-manager-core";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

assert(ticketNeedsDecision("Make the mobile buttons cleaner") === null, "ordinary UI work must proceed");
assert(ticketNeedsDecision("Delete every user in production") !== null, "destructive production work must stop");
assert(ticketNeedsDecision("Please change the authentication permissions") !== null, "access changes must stop");
assert(requiresDecisionReply("Protected change", false), "protected work must wait without an owner reply");
assert(!requiresDecisionReply("Protected change", true), "an owner reply must unblock one protected run");
assert(isTemporaryServiceWait("Please reply after GitHub Actions has recovered."), "GitHub recovery waits must retry automatically");
assert(!isTemporaryServiceWait("Choose which old data may be removed."), "real product decisions must still wait for an owner");

const channelContext = workshopChannelContext("myhrefjeld@gmail.com");
assert(channelContext.includes("not chatting in Codex"), "worker must know it replies through Workshop");
assert(channelContext.includes("myhrefjeld@gmail.com"), "worker must know the authenticated requester");
assert(channelContext.includes("cannot do: edit or delete messages"), "worker must know creator UI limitations");
assert(channelContext.includes("review or merge a pull request"), "worker must not delegate repository work to the creator");
assert(channelContext.includes("technicalSummary is stored only in the internal run log"), "worker must separate visible and private output");
assert(channelContext.includes("They do not see private reasoning"), "worker must understand what is hidden from the creator");
assert(channelContext.includes("equally authorized Workshop owners"), "worker must understand equal Workshop authorization");
assert(channelContext.includes("answer it directly with the answered outcome"), "worker must answer ordinary questions directly");
assert(channelContext.includes("not automatically approval or an answer"), "worker must evaluate what an owner actually replied");
assert(channelContext.includes("GitHub Actions being unavailable are not Workshop decisions"), "worker must own temporary service recovery");
assert(WORKSHOP_MODEL === "gpt-5.6-terra", "Workshop must use Terra explicitly");
assert(WORKSHOP_REASONING_EFFORT === "medium", "Workshop must use medium reasoning explicitly");
assert(WORKSHOP_UI_QUALITY_BRIEF.includes("not optional polish"), "every worker prompt must treat UI quality as part of implementation");
assert(WORKSHOP_UI_QUALITY_BRIEF.includes("instead of appending another panel"), "workers must integrate features instead of bolting on UI");
assert(WORKSHOP_UI_QUALITY_BRIEF.includes("inspect screenshots yourself"), "workers must visually review their own UI work");
assert(WORKSHOP_MAX_CONCURRENT_TICKETS === 3, "Workshop must run at most three ticket agents");
assert(deploymentContainsCommit("old", "old", () => false), "the exact deployed commit must satisfy the release");
assert(deploymentContainsCommit("old", "new", (ancestor, descendant) => ancestor === "old" && descendant === "new"), "a successful newer deployment containing the commit must satisfy a cancelled release");
assert(!deploymentContainsCommit("old", "unrelated", () => false), "an unrelated deployment must not hide a failed release");
const codexArgs = workshopCodexArgs("schema.json", "result.json", "prompt");
assert(codexArgs.includes("gpt-5.6-terra"), "coding command must pin Terra");
assert(codexArgs.includes('model_reasoning_effort="medium"'), "coding command must pin medium reasoning");
assert(codexArgs.includes("--json"), "coding command must stream structured progress events");

const editingProgress = progressFromCodexEvent({
  type: "item.started",
  item: { type: "command_execution", command: "apply_patch src/workshop/WorkshopApp.tsx" },
});
assert(editingProgress?.stage === 3 && editingProgress.activity === "Updating the app", "editing must produce safe creator-facing progress");
const testProgress = progressFromCodexEvent({
  type: "item.started",
  item: { type: "command_execution", command: "bun run e2e:workshop" },
});
assert(testProgress?.stage === 4 && testProgress.activity === "Testing the update", "tests must advance the visible stage");
const deployProgress = progressFromCodexEvent({
  type: "item.completed",
  item: { type: "command_execution", command: "firebase deploy --only hosting:workshop" },
});
assert(deployProgress?.stage === 5 && deployProgress.lastCompleted === "Published or checked the live update", "deployment must expose a safe completed step");
assert(progressFromCodexEvent({ type: "item.completed", item: { type: "agent_message", text: "private reasoning" } }) === null, "agent prose must never leak into live progress");

const answered = parseAgentResult(JSON.stringify({
  outcome: "answered",
  summaryForCreator: "You do not need to reply. I will recheck the service and continue myself.",
  productionUrl: "https://dandd-ea955.web.app",
}));
assert(answered.outcome === "answered", "answered outcome must parse");
assert(outcomeMessage(answered) === answered.summaryForCreator, "direct answers must not claim an app update");
assert(answered.productionUrl === undefined, "direct answers must not expose a production link");

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
