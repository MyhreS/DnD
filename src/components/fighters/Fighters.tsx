import { lazy, Suspense } from "react";
import { useFighterShows } from "./useFighterShows";

// The whole three.js/R3F stack is code-split here so it never weighs on first
// paint — it's only fetched when the first show is about to start.
const FighterScene = lazy(() => import("./FighterScene"));

/**
 * Occasional 3D fighter overlay. Renders nothing (no canvas, no WebGL) between
 * shows; during a show it mounts a hero (solo) or a duel that performs its
 * choreography and then tears the canvas down again until the next show.
 */
export function Fighters() {
  const { show, endShow } = useFighterShows();
  if (!show) return null;
  return (
    <Suspense fallback={null}>
      <FighterScene key={show.key} show={show} onDone={endShow} />
    </Suspense>
  );
}
