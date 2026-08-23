import {
  WORKSHOP_AGENT_HARD_TIMEOUT_MS,
  WORKSHOP_AGENT_RESULT_GRACE_MS,
  WORKSHOP_AGENT_STALE_PROGRESS_MS,
  WORKSHOP_CODEX_STDIN,
  WORKSHOP_MODEL,
  WORKSHOP_MAIN_REFRESH_MS,
  WORKSHOP_MAIN_SYNC_BRIEF,
  WORKSHOP_MAX_CONCURRENT_TICKETS,
  WORKSHOP_REASONING_EFFORT,
  WORKSHOP_UI_QUALITY_BRIEF,
  agentRunWatchdogDecision,
  codexSessionIdFromEvent,
  deploymentContainsCommit,
  outcomeMessage,
  parseAgentResult,
  parseRecoveryResult,
  progressFromCodexEvent,
  isAttachmentAccessProblem,
  isTemporaryServiceWait,
  isLikelyServiceProblem,
  overlappingChangeScopes,
  overlappingChangedPaths,
  retryDelayMs,
  resolveWorkshopAgentConfig,
  requiresDecisionReply,
  ticketNeedsDecision,
  workshopChannelContext,
  workshopCodexArgs,
  workshopCodexResumeArgs,
} from "./workshop-manager-core";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

assert(ticketNeedsDecision("Make the mobile buttons cleaner") === null, "ordinary UI work must proceed");
assert(ticketNeedsDecision("detail ".repeat(8_000)) === null, "long-lived conversations must not become permanently blocked by total size");
assert(ticketNeedsDecision("Delete every user in production") !== null, "destructive production work must stop");
assert(ticketNeedsDecision("Please change the authentication permissions") !== null, "access changes must stop");
assert(requiresDecisionReply("Protected change", false), "protected work must wait without an owner reply");
assert(!requiresDecisionReply("Protected change", true), "an owner reply must unblock one protected run");
assert(isTemporaryServiceWait("Please reply after GitHub Actions has recovered."), "GitHub recovery waits must retry automatically");
assert(!isTemporaryServiceWait("Choose which old data may be removed."), "real product decisions must still wait for an owner");
assert(isLikelyServiceProblem("Coding agent exited with status 1."), "interrupted coding processes must start recovery");
assert(isLikelyServiceProblem("Firebase quota returned 429"), "provider quotas must start recovery");
assert(!isLikelyServiceProblem("The coding agent did not return a valid result."), "invalid worker output is not automatically a service outage");
assert(isAttachmentAccessProblem("403 Forbidden: storage.objects.get"), "attachment permission failures must not loop through service recovery");
assert(!isAttachmentAccessProblem("socket hang up"), "transient attachment downloads may still retry");
assert(retryDelayMs(2_000, 1_000) === 1_000, "future retries must wake at their scheduled time");
assert(retryDelayMs(1_000, 2_000) === 0, "expired retries must wake immediately");

const recovered = parseRecoveryResult(JSON.stringify({
  outcome: "recovered",
  summaryForCreator: "The service is available again. I’m resuming this request now.",
  technicalSummary: "Health check passed.",
}));
assert(recovered.outcome === "recovered", "recovery result must parse");

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
assert(WORKSHOP_MODEL === "gpt-5.6-sol", "Workshop must default to Sol explicitly");
assert(WORKSHOP_REASONING_EFFORT === "xhigh", "Workshop must default to xhigh reasoning explicitly");
assert(WORKSHOP_MAIN_REFRESH_MS === 5 * 60_000, "Workshop must refresh origin/main every five minutes");
assert(WORKSHOP_MAIN_SYNC_BRIEF.includes("Do not pull, fetch, merge, rebase"), "ticket agents must leave synchronization to the manager");
assert(WORKSHOP_MAIN_SYNC_BRIEF.includes("serialized release gate"), "the manager must own final main synchronization");
assert(WORKSHOP_UI_QUALITY_BRIEF.includes("not optional polish"), "every worker prompt must treat UI quality as part of implementation");
assert(WORKSHOP_UI_QUALITY_BRIEF.includes("instead of appending another panel"), "workers must integrate features instead of bolting on UI");
assert(WORKSHOP_UI_QUALITY_BRIEF.includes("inspect screenshots yourself"), "workers must visually review their own UI work");
assert(WORKSHOP_MAX_CONCURRENT_TICKETS === 3, "Workshop must run at most three ticket agents");
assert(WORKSHOP_CODEX_STDIN === "ignore", "Workshop Codex runs must not wait for inherited stdin");
assert(agentRunWatchdogDecision({ elapsedMs: 30_000, stalledMs: 30_000 }) === "wait", "Healthy agents must keep running");
assert(agentRunWatchdogDecision({ elapsedMs: 30_000, stalledMs: 30_000, resultReadyForMs: WORKSHOP_AGENT_RESULT_GRACE_MS - 1 }) === "wait", "A new result gets a short exit grace period");
assert(agentRunWatchdogDecision({ elapsedMs: WORKSHOP_AGENT_HARD_TIMEOUT_MS, stalledMs: WORKSHOP_AGENT_STALE_PROGRESS_MS, resultReadyForMs: 1 }) === "wait", "A valid result must not be discarded while its exit grace period runs");
assert(agentRunWatchdogDecision({ elapsedMs: 30_000, stalledMs: 30_000, resultReadyForMs: WORKSHOP_AGENT_RESULT_GRACE_MS }) === "salvage", "A completed result must be salvaged when Codex stays open");
assert(agentRunWatchdogDecision({ elapsedMs: WORKSHOP_AGENT_STALE_PROGRESS_MS, stalledMs: WORKSHOP_AGENT_STALE_PROGRESS_MS }) === "timeout", "An agent without useful progress must time out");
assert(agentRunWatchdogDecision({ elapsedMs: WORKSHOP_AGENT_HARD_TIMEOUT_MS, stalledMs: 0 }) === "timeout", "Even noisy agents must have a hard runtime cap");
assert(resolveWorkshopAgentConfig(null).model === "gpt-5.6-sol", "missing config must fall back to Sol");
assert(resolveWorkshopAgentConfig({ model: "gpt-5.6-terra", reasoningEffort: "high" }).reasoningEffort === "high", "allowed config must be preserved");
assert(resolveWorkshopAgentConfig({ model: "untrusted", reasoningEffort: "ultra" }).reasoningEffort === "xhigh", "unsupported config must fail closed to the default");
assert(overlappingChangedPaths(["src/a.ts", "src/b.ts"], ["src/b.ts", "src/c.ts"]).join() === "src/b.ts", "same-file main changes must be detected");
assert(overlappingChangeScopes(["src/features/play/components/Page.tsx"], ["src/features/play/components/Toolbar.tsx"]).join() === "feature:play", "same-feature main changes must be treated as overlapping work");
assert(deploymentContainsCommit("old", "old", () => false), "the exact deployed commit must satisfy the release");
assert(deploymentContainsCommit("old", "new", (ancestor, descendant) => ancestor === "old" && descendant === "new"), "a successful newer deployment containing the commit must satisfy a cancelled release");
assert(!deploymentContainsCommit("old", "unrelated", () => false), "an unrelated deployment must not hide a failed release");
const codexArgs = workshopCodexArgs("schema.json", "result.json", "prompt");
assert(codexArgs.includes("gpt-5.6-sol"), "coding command must pin Sol by default");
assert(codexArgs.includes('model_reasoning_effort="xhigh"'), "coding command must pin xhigh reasoning by default");
const configuredCodexArgs = workshopCodexArgs("schema.json", "result.json", "prompt", { model: "gpt-5.6-terra", reasoningEffort: "low" });
assert(configuredCodexArgs.includes("gpt-5.6-terra"), "coding command must honor Simon's selected model");
assert(configuredCodexArgs.includes('model_reasoning_effort="low"'), "coding command must honor Simon's selected reasoning effort");
assert(codexArgs.includes("--json"), "coding command must stream structured progress events");
const resumedCodexArgs = workshopCodexResumeArgs(
  "schema.json",
  "result.json",
  "019d2c2b-8bea-7d40-8bfe-9866a5618c72",
  "Continue after the Workshop manager restart.",
  { model: "gpt-5.6-terra", reasoningEffort: "high" },
);
assert(resumedCodexArgs.slice(0, 3).join(" ") === "codex exec resume", "checkpoint recovery must use Codex exec resume");
assert(resumedCodexArgs.includes("019d2c2b-8bea-7d40-8bfe-9866a5618c72"), "checkpoint recovery must select the exact saved session");
assert(resumedCodexArgs.includes("--output-schema") && resumedCodexArgs.includes("--json"), "resumed agents must keep structured output and progress");
assert(resumedCodexArgs.includes("--dangerously-bypass-approvals-and-sandbox"), "resumed unattended agents must not pause for approvals");
assert(codexSessionIdFromEvent({
  type: "thread.started",
  thread_id: "019d2c2b-8bea-7d40-8bfe-9866a5618c72",
}) === "019d2c2b-8bea-7d40-8bfe-9866a5618c72", "the durable checkpoint must capture the Codex session id");
assert(codexSessionIdFromEvent({ type: "turn.started", thread_id: "not-a-session" }) === null, "untrusted progress events must not create checkpoints");

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
