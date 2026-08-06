import { useSyncExternalStore } from "react";
import type { AgentState } from "@/workshop/types";

let currentTime = 0;
let timer: number | undefined;
const listeners = new Set<() => void>();

function updateTime() {
  currentTime = Date.now();
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  if (listeners.size === 1) {
    updateTime();
    timer = window.setInterval(updateTime, 1_000);
  }
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) window.clearInterval(timer);
  };
}

function snapshot() { return currentTime; }

export function useAgentTiming(state: AgentState | null): { online: boolean; secondsUntilCheck: number | null } {
  const now = useSyncExternalStore(subscribe, snapshot, snapshot);
  const heartbeat = state?.lastHeartbeatAt?.toMillis() ?? 0;
  const nextPoll = state?.nextPollAt?.toMillis();
  return {
    online: now - heartbeat < 90_000,
    secondsUntilCheck: nextPoll === undefined || nextPoll === null
      ? null
      : Math.max(0, Math.ceil((nextPoll - now) / 1_000)),
  };
}

export function useAgentOnline(state: AgentState | null): boolean {
  return useAgentTiming(state).online;
}
