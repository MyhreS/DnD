import { cardClassName } from "@/features/hunter/lib/papersheet";
import type { HunterCard } from "@/types";

function searchText(card: HunterCard): string {
  return [card.name, card.ownerName, card.ownerEmail, card.classId, cardClassName(card), card.background, card.level]
    .join(" ")
    .toLocaleLowerCase();
}

/** Hunters matching a free-text search over both the Hunter and its player.
 * Every word must match somewhere, so "simon bloodbound" or "ada sable" finds
 * that player's Hunter, and a player's name alone lists all of their Hunters.
 * Results are grouped by player so one player's Hunters sit together. */
export function searchHunters(cards: HunterCard[], query: string, limit: number): HunterCard[] {
  const words = query.toLocaleLowerCase().split(/\s+/).filter(Boolean);
  const unique = [...new Map(cards.map((card) => [card.id, card])).values()];
  const matches = words.length === 0
    ? unique
    : unique.filter((card) => {
      const text = searchText(card);
      return words.every((word) => text.includes(word));
    });
  return matches
    .sort((a, b) => (a.ownerName || a.ownerEmail || "").localeCompare(b.ownerName || b.ownerEmail || "") || a.name.localeCompare(b.name))
    .slice(0, limit);
}
