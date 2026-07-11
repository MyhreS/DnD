import { useEffect } from "react";
import { useAuthStore } from "@/features/auth/store/authStore";
import { usePlayerStore } from "@/features/hunter/store/playerStore";
import { sheetClassName } from "@/features/hunter/lib/papersheet";
import { useGameStore } from "../store/gameStore";

/** A player who arrives after the game has begun is auto-registered so the DM
 * and party see them (the lobby's explicit join only exists before "begin").
 * A named hunter is enough — sheet-made hunters have classId "" forever. */
export function useAutoJoinGame(gameId: string, isDM: boolean, joined: boolean) {
  const user = useAuthStore((s) => s.user);
  const card = usePlayerStore((s) => s.card);
  const join = useGameStore((s) => s.join);
  const hasHunter = !!card && !!card.name;
  useEffect(() => {
    if (!isDM && hasHunter && !joined && user && card) {
      void join(gameId, {
        uid: user.uid,
        name: card.name,
        classId: card.classId,
        subclassId: card.subclassId ?? null,
        className: sheetClassName(card.sheet) || null,
        level: card.level,
        role: "player",
      });
    }
  }, [isDM, hasHunter, joined, gameId, user, card, join]);
}
