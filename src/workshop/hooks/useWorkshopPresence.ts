import { useEffect, useState } from "react";
import type { User } from "firebase/auth";
import { subscribeWorkshopPresence, updateWorkshopPresence } from "@/api/workshop";
import type { WorkshopPresence } from "@/workshop/types";

const PRESENCE_HEARTBEAT_MS = 15_000;

function presenceName(user: User): string {
  return user.displayName?.trim() || user.email?.split("@")[0] || "Workshop member";
}

export function useWorkshopPresence(user: User | null, enabled: boolean, viewingTicketId: string | null) {
  const [people, setPeople] = useState<WorkshopPresence[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled || !user) return;
    return subscribeWorkshopPresence((next) => {
      setPeople(next);
      setError(null);
    }, () => setError("Live presence is temporarily unavailable."));
  }, [enabled, user]);

  useEffect(() => {
    if (!enabled || !user) return;
    const publish = (state: WorkshopPresence["state"]) => {
      void updateWorkshopPresence(user.uid, presenceName(user), state, viewingTicketId)
        .catch(() => setError("Live presence is temporarily unavailable."));
    };
    const publishCurrentState = () => publish(
      document.visibilityState === "visible" && navigator.onLine ? "active" : "away",
    );

    publishCurrentState();
    const heartbeat = window.setInterval(() => {
      if (document.visibilityState === "visible" && navigator.onLine) publish("active");
    }, PRESENCE_HEARTBEAT_MS);
    document.addEventListener("visibilitychange", publishCurrentState);
    window.addEventListener("focus", publishCurrentState);
    window.addEventListener("online", publishCurrentState);
    window.addEventListener("offline", publishCurrentState);
    return () => {
      window.clearInterval(heartbeat);
      document.removeEventListener("visibilitychange", publishCurrentState);
      window.removeEventListener("focus", publishCurrentState);
      window.removeEventListener("online", publishCurrentState);
      window.removeEventListener("offline", publishCurrentState);
    };
  }, [enabled, user, viewingTicketId]);

  return { people, error };
}
