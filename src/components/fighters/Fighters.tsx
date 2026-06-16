import { lazy, Suspense } from "react";
import { useFighterShows } from "./useFighterShows";

// The whole three.js/R3F stack is code-split here so it never weighs on first
// paint — it's only fetched when the first show is about to start.
const FighterScene = lazy(() => import("./FighterScene"));

/**
 * Occasional 3D fighter overlay. Renders nothing (no canvas, no WebGL) between
 * shows; during a show it mounts a single fighter that walks in, attacks, and
 * walks off, then the canvas is torn down again until the next show.
 */
export function Fighters() {
  const { show, endShow } = useFighterShows();
  if (!show) return null;
  return (
    <Suspense fallback={null}>
      <FighterScene key={show.key} fighter={show.fighter} name={show.name} onDone={endShow} />
    </Suspense>
  );
}
