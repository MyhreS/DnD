import { useAgentTiming } from "@/workshop/hooks/useAgentOnline";
import type { AgentState } from "@/workshop/types";

function formatCountdown(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

export function AgentCountdown({ state }: { state: AgentState | null }) {
  const { online, secondsUntilCheck } = useAgentTiming(state);
  let content;

  if (!online) content = "Next check starts when the agent is online.";
  else if (state?.currentTicketId) content = "The agent is working on a request now.";
  else if (state?.checkingNow || secondsUntilCheck === 0) content = "The agent is checking requests now.";
  else if (secondsUntilCheck === null) content = "The agent is preparing the next check.";
  else content = <>Next agent check in <time>{formatCountdown(secondsUntilCheck)}</time></>;

  return <p className="agent-countdown" data-testid="agent-countdown">{content}</p>;
}
