import { useCurrentTime } from "@/workshop/hooks/useAgentOnline";
import type { AgentWorkState } from "@/workshop/types";

const STAGE_COUNT = 5;
const SLOW_PROGRESS_AFTER_MS = 10 * 60_000;

function minutesSince(timestamp: AgentWorkState["progressUpdatedAt"], now: number): number | null {
  if (!timestamp) return null;
  return Math.max(0, Math.floor((now - timestamp.toMillis()) / 60_000));
}

function updateAge(minutes: number | null): string {
  if (minutes === null || minutes < 1) return "updated just now";
  if (minutes < 60) return `updated ${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  return `updated ${hours}h ago`;
}

function elapsedTime(timestamp: AgentWorkState["workStartedAt"], now: number): string | null {
  if (!timestamp) return null;
  const minutes = Math.max(0, Math.floor((now - timestamp.toMillis()) / 60_000));
  if (minutes < 1) return "under 1m elapsed";
  if (minutes < 60) return `${minutes}m elapsed`;
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return `${hours}h${remainder ? ` ${remainder}m` : ""} elapsed`;
}

type WorkActivityProps = {
  placement: "list" | "detail";
  state: AgentWorkState | null;
  online: boolean;
  replySync?: "included" | "queued";
};

export function WorkActivity({ placement, state, online, replySync }: WorkActivityProps) {
  const tick = useCurrentTime();
  const minutes = minutesSince(state?.progressUpdatedAt, tick);
  const elapsed = elapsedTime(state?.workStartedAt, tick);
  const stage = Math.min(STAGE_COUNT, Math.max(1, state?.progressStage ?? 1));
  const slow = online && minutes !== null && minutes * 60_000 >= SLOW_PROGRESS_AFTER_MS;
  const activity = online
    ? state?.progressActivity ?? "Starting work"
    : "Agent paused or disconnected";
  const timing = [
    `Stage ${stage} of ${STAGE_COUNT}`,
    elapsed,
    online ? updateAge(minutes) : minutes === null ? "waiting to reconnect" : `last update ${updateAge(minutes).replace("updated ", "")}`,
  ].filter(Boolean).join(" · ");

  return (
    <span
      className={`work-activity work-activity-${placement}${online ? "" : " is-paused"}${slow ? " is-slow" : ""}`}
      data-testid={`work-activity-${placement}`}
      role={placement === "detail" ? "status" : undefined}
    >
      <span className="work-activity-dots" aria-hidden><i /><i /><i /></span>
      <span className="work-activity-copy">
        <strong>{activity}</strong>
        <span>{timing}</span>
        {placement === "detail" && state?.lastCompletedActivity && (
          <span className="work-activity-last">Last completed: {state.lastCompletedActivity}</span>
        )}
        {replySync === "included" && (
          <span className="work-activity-reply is-included">
            {placement === "detail" ? "Latest reply included: this pass started after your newest message." : "Latest reply included in this pass."}
          </span>
        )}
        {replySync === "queued" && (
          <span className="work-activity-reply is-queued">
            {placement === "detail" ? "Latest reply saved: this pass will stop before publishing and restart with it." : "Latest reply saved; safe restart pending."}
          </span>
        )}
        {placement === "detail" && slow && (
          <span className="work-activity-slow">No new step for {minutes}m. The agent is still online.</span>
        )}
      </span>
    </span>
  );
}
