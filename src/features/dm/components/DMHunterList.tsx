import { useMemo } from "react";
import { DMHunterRow } from "./DMHunterRow";
import type { HunterCard } from "@/types";

/** The overview list. Takes the characters to show as a prop, so a future
 * "whose sheets do I want on the table?" selection can simply filter the
 * array upstream without touching this component. */
export function DMHunterList({ characters }: { characters: HunterCard[] }) {
  // Group by player: sort by owner name first, hunter name second.
  const sorted = useMemo(
    () =>
      [...characters].sort(
        (a, b) =>
          (a.ownerName || "").localeCompare(b.ownerName || "") ||
          (a.name || "").localeCompare(b.name || ""),
      ),
    [characters],
  );

  return (
    <div className="card-grid">
      {sorted.map((c) => (
        <DMHunterRow key={c.id} card={c} />
      ))}
    </div>
  );
}
