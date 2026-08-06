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

export function useCurrentTime(): number {
  return useSyncExternalStore(subscribe, snapshot, snapshot);
}

export function useAgentOnline(state: AgentState | null): boolean {
  const now = useCurrentTime();
  const heartbeat = state?.lastHeartbeatAt?.toMillis() ?? 0;
  return now > 0 && heartbeat > 0 && now - heartbeat < 90_000;
}
