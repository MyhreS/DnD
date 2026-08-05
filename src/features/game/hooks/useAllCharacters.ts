import { useEffect, useState } from "react";
import { subscribeAllCharacters } from "@/api/players";
import type { HunterCard } from "@/types";

/** Live list of every Hunter available to the signed-in session creator. */
export function useAllCharacters(): {
  characters: HunterCard[] | null;
  error: string | null;
} {
  const [characters, setCharacters] = useState<HunterCard[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => subscribeAllCharacters(
    setCharacters,
    () => setError("Could not load the Hunters."),
  ), []);

  return { characters, error };
}
