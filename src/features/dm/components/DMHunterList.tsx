import { useMemo } from "react";
import { DMHunterRow } from "./DMHunterRow";
import type { HunterCard } from "@/types";

/** The board list. Takes the characters to show as a prop — the page resolves
 * the DM's picks upstream — plus an optional per-hunter remove callback. */
export function DMHunterList({
  characters,
  onRemove,
}: {
  characters: HunterCard[];
  onRemove?: (id: string) => void;
}) {
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
        <DMHunterRow key={c.id} card={c} onRemove={onRemove && (() => onRemove(c.id))} />
      ))}
    </div>
  );
}
