import { useEffect, useState } from "react";
import { subscribeGames, subscribeUserGames } from "@/api/games";
import { isPreviewActive, previewGame } from "@/dev/preview";
import { useAuthStore } from "@/features/auth/store/authStore";
import type { Game, HunterCard } from "@/types";
import { sessionsForCharacter } from "../lib/characterSessions";

function previewSessions(): Game[] {
  const current = previewGame();
  const endedAt = current.createdAt - 6 * 24 * 60 * 60 * 1000;
  return [
    { ...current, title: "The Sunless Vault", status: "active", startedAt: current.createdAt - 95 * 60 * 1000 },
    {
      ...current,
      id: "preview-game-previous",
      title: "The Chapel Below",
      status: "ended",
      createdAt: endedAt - 3 * 60 * 60 * 1000,
      startedAt: endedAt - 2 * 60 * 60 * 1000,
      endedAt,
    },
  ];
}

export function useCharacterSessions(card: HunterCard) {
  const userId = useAuthStore((state) => state.user?.uid);
  const preview = isPreviewActive();
  const [games, setGames] = useState<Game[]>(preview ? previewSessions() : []);
  const [error, setError] = useState("");

  useEffect(() => {
    if (preview) return;
    if (card.campaignId) {
      return subscribeGames(card.campaignId, setGames, () => setError("Could not load this campaign's sessions."));
    }
    if (!userId) return;
    return subscribeUserGames(userId, setGames, () => setError("Could not load this character's sessions."));
  }, [card.campaignId, preview, userId]);

  return { sessions: sessionsForCharacter(games, card), error };
}
