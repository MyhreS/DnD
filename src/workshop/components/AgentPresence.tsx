import { useAgentOnline } from "@/workshop/hooks/useAgentOnline";
import type { AgentState } from "@/workshop/types";

export function AgentPresence({ state }: { state: AgentState | null }) {
  const online = useAgentOnline(state);
  return (
    <div className={`agent-presence ${online ? "is-online" : "is-offline"}`} data-testid="agent-presence">
      <span aria-hidden />
      <div>
        <strong>{online ? "Agent online" : "Agent offline"}</strong>
        {!online && <small>Ask Simon to start the Workshop agent.</small>}
      </div>
    </div>
  );
}
