import { useEffect } from "react";
import { useAuthStore } from "@/features/auth/store/authStore";
import { usePlayerStore } from "../store/playerStore";

/** Loads the signed-in user's hunter card into the player store. */
export function useHunterCard(): void {
  const user = useAuthStore((s) => s.user);
  const status = usePlayerStore((s) => s.status);
  const load = usePlayerStore((s) => s.load);

  useEffect(() => {
    if (user && status === "idle") void load(user.uid);
  }, [user, status, load]);
}
