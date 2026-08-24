import type { Game, HunterCard } from "@/types";

function includesCharacter(game: Game, characterId: string): boolean {
  return [...game.participantRoster, ...(game.attendeeRoster ?? [])]
    .some((participant) => participant.characterId === characterId);
}

/** Sessions relevant to a character, newest first. Campaign hunters share the
 * campaign journal; standalone hunters only see sessions they attended. */
export function sessionsForCharacter(games: Game[], card: HunterCard): Game[] {
  return games
    .filter((game) => !game.sandbox)
    .filter((game) => card.campaignId
      ? game.campaignId === card.campaignId
      : includesCharacter(game, card.id))
    .sort((a, b) => (b.endedAt ?? b.startedAt ?? b.createdAt) - (a.endedAt ?? a.startedAt ?? a.createdAt));
}
