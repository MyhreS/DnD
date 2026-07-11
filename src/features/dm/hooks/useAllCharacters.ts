import { useEffect, useState } from "react";
import { subscribeAllCharacters } from "@/api/players";
import type { HunterCard } from "@/types";

/** Live list of every hunter card. Any signed-in user may read /characters
 * (same subscription the Party gallery uses); `null` while loading. */
export function useAllCharacters(): {
  characters: HunterCard[] | null;
  error: string | null;
} {
  const [characters, setCharacters] = useState<HunterCard[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    return subscribeAllCharacters(setCharacters, () =>
      setError("Could not load the hunters."),
    );
  }, []);

  return { characters, error };
}
