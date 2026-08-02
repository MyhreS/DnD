import { useEffect } from "react";
import { COMBAT_STORAGE_KEY, useCombatStore } from "../store/combatStore";
import type { CombatSession } from "../types";

const CHANNEL_NAME = "cs-combat-live-v1";

interface CombatMessage {
  source: string;
  type: "request" | "snapshot";
  session?: CombatSession;
}

export function useCombatSync(): void {
  useEffect(() => {
    const source = crypto.randomUUID?.() ?? `combat-sync-${Date.now()}`;
    const channel = "BroadcastChannel" in window ? new BroadcastChannel(CHANNEL_NAME) : null;
    let applyingRemote = false;

    const postSnapshot = () => {
      channel?.postMessage({
        source,
        type: "snapshot",
        session: useCombatStore.getState().session,
      } satisfies CombatMessage);
    };

    const handleMessage = (event: MessageEvent<CombatMessage>) => {
      const message = event.data;
      if (!message || message.source === source) return;
      if (message.type === "request") {
        postSnapshot();
        return;
      }
      if (!message.session) return;
      applyingRemote = true;
      useCombatStore.getState().replaceSession(message.session);
      applyingRemote = false;
    };
    if (channel) channel.onmessage = handleMessage;

    const unsubscribe = useCombatStore.subscribe(() => {
      if (!applyingRemote) postSnapshot();
    });

    const handleStorage = (event: StorageEvent) => {
      if (event.key !== COMBAT_STORAGE_KEY || !event.newValue) return;
      try {
        const persisted = JSON.parse(event.newValue) as { state?: { session?: CombatSession } };
        if (!persisted.state?.session) return;
        applyingRemote = true;
        useCombatStore.getState().replaceSession(persisted.state.session);
        applyingRemote = false;
      } catch {
        // Ignore malformed storage written by old development builds.
      }
    };
    window.addEventListener("storage", handleStorage);
    channel?.postMessage({ source, type: "request" } satisfies CombatMessage);

    return () => {
      unsubscribe();
      window.removeEventListener("storage", handleStorage);
      channel?.close();
    };
  }, []);
}
