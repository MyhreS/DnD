import { Suspense, useRef } from "react";
import { Canvas } from "@react-three/fiber";
import { Stage } from "./Stage";
import { Solo } from "./Solo";
import { Duel } from "./Duel";
import { Sparks, type SparksHandle } from "./Sparks";
import type { Impact } from "./fighterConfig";
import type { Show } from "./useFighterShows";

interface Props {
  show: Show;
  onDone: () => void;
}

/**
 * Full-screen, click-through 3D overlay that performs one show (a solo hero or a
 * duel), then calls `onDone`. Mounted only during a show, so there's no idle
 * WebGL cost. The canvas is transparent and floats over the live app.
 */
export default function FighterScene({ show, onDone }: Props) {
  const fired = useRef(false);
  const done = () => {
    if (fired.current) return;
    fired.current = true;
    onDone();
  };

  const sparks = useRef<SparksHandle>(null);
  const onImpact: Impact = (x, y, color) => sparks.current?.burst(x, y, color);

  const themes =
    show.kind === "duel"
      ? [show.left.fighter.theme, show.right.fighter.theme]
      : [show.cast.fighter.theme];

  return (
    <div className="fighters no-print" aria-hidden>
      <Canvas
        camera={{ position: [0, 0, 16], fov: 32 }}
        dpr={[1, 1.75]}
        gl={{ alpha: true, antialias: true }}
        style={{ position: "absolute", inset: 0, pointerEvents: "none" }}
      >
        <Stage themes={themes} />
        <Suspense fallback={null}>
          {show.kind === "duel" ? (
            <Duel left={show.left} right={show.right} onImpact={onImpact} onDone={done} />
          ) : (
            <Solo cast={show.cast} onImpact={onImpact} onDone={done} />
          )}
        </Suspense>
        <Sparks ref={sparks} />
      </Canvas>
    </div>
  );
}
