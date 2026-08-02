import { useEffect, useState } from "react";
import { saveCombatSession, subscribeCombatSession } from "@/api/combat";
import { isPreviewActive } from "@/dev/preview";
import { useCombatStore } from "../store/combatStore";
import type { CombatSession } from "../types";

const CHANNEL_NAME = "cs-combat-live-v1";
const SAVE_DEBOUNCE_MS = 120;

export type CombatSyncStatus = "connecting" | "live" | "offline" | "local" | "error";

interface CombatMessage {
  source: string;
  writer: boolean;
  type: "request" | "snapshot";
  session?: CombatSession;
}

export function useCombatSync(canWrite = false): CombatSyncStatus {
  const [status, setStatus] = useState<CombatSyncStatus>("connecting");

  useEffect(() => {
    const preview = isPreviewActive();
    const source = crypto.randomUUID?.() ?? `combat-sync-${Date.now()}`;
    const channel = "BroadcastChannel" in window ? new BroadcastChannel(CHANNEL_NAME) : null;
    let applyingRemote = false;
    let saveTimer: number | null = null;
    let pendingSession: CombatSession | null = null;

    const applyRemote = (session: CombatSession) => {
      applyingRemote = true;
      useCombatStore.getState().replaceSession(session);
      applyingRemote = false;
    };

    const postSnapshot = () => {
      channel?.postMessage({
        source,
        writer: canWrite,
        type: "snapshot",
        session: useCombatStore.getState().session,
      } satisfies CombatMessage);
    };

    const flushSave = async () => {
      const session = pendingSession;
      pendingSession = null;
      saveTimer = null;
      if (!session) return;
      try {
        await saveCombatSession(session);
        setStatus("live");
      } catch (error) {
        console.error("Combat save failed", error);
        setStatus("offline");
      }
    };

    const scheduleSave = (session: CombatSession) => {
      pendingSession = session;
      if (saveTimer !== null) window.clearTimeout(saveTimer);
      saveTimer = window.setTimeout(() => void flushSave(), SAVE_DEBOUNCE_MS);
    };

    const handleMessage = (event: MessageEvent<CombatMessage>) => {
      const message = event.data;
      if (!message || message.source === source) return;
      if (message.type === "request") {
        if (canWrite) postSnapshot();
      } else if (message.writer && message.session) {
        applyRemote(message.session);
      }
    };
    if (channel) channel.onmessage = handleMessage;

    const unsubscribeStore = useCombatStore.subscribe(({ session }) => {
      if (applyingRemote) return;
      if (canWrite) {
        postSnapshot();
        if (!preview) scheduleSave(session);
      }
    });

    const unsubscribeRemote = preview
      ? () => {}
      : subscribeCombatSession(
          ({ session, fromCache }) => {
            if (session) applyRemote(session);
            else if (canWrite) scheduleSave(useCombatStore.getState().session);
            setStatus(fromCache ? "offline" : "live");
          },
          () => setStatus("error"),
        );

    if (preview) setStatus("local");
    channel?.postMessage({ source, writer: canWrite, type: "request" } satisfies CombatMessage);

    return () => {
      unsubscribeStore();
      unsubscribeRemote();
      channel?.close();
      if (saveTimer !== null) window.clearTimeout(saveTimer);
      if (pendingSession && canWrite && !preview) {
        void saveCombatSession(pendingSession).catch((error) => {
          console.error("Final combat save failed", error);
        });
      }
    };
  }, [canWrite]);

  return status;
}
