import { useEffect } from "react";
import { useAuthStore } from "@/features/auth/store/authStore";
import { usePlayerStore } from "../store/playerStore";

/** Live-subscribes to the signed-in user's hunter card. */
export function useHunterCard(): void {
  const uid = useAuthStore((s) => s.user?.uid);
  const subscribe = usePlayerStore((s) => s.subscribe);

  useEffect(() => {
    if (uid) subscribe(uid);
  }, [uid, subscribe]);
}
