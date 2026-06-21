import { useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { MathUtils } from "three";
import { Combatant, type CombatantHandle } from "./Combatant";
import type { Cast } from "./useFighterShows";
import type { Impact } from "./fighterConfig";

const RUN = 3.4;
const WALK = 1.5;
const FACE_RIGHT = Math.PI / 2;
const FACE_VIEWER = 0.4;
const OFF = 1.2;
const BEAT = 1.05; // seconds per combat beat
const CHEER = 2.0;

const pick = <T,>(xs: T[]): T => xs[Math.floor(Math.random() * xs.length)];

type Phase = "enter" | "fight" | "cheer" | "exit" | "done";

interface Props {
  cast: Cast;
  onImpact: Impact;
  onDone: () => void;
}

/**
 * One hero's show: charge in from the left, turn to a 3/4 view, throw a short
 * flurry (attacks with the odd evasive hop), a victory flourish, then walk off.
 */
export function Solo({ cast, onImpact, onDone }: Props) {
  const ref = useRef<CombatantHandle>(null);
  const { viewport } = useThree();
  const halfW = viewport.width / 2;
  const exitX = halfW + OFF;
  const groundY = -viewport.height / 2 + 0.1;

  const phase = useRef<Phase>("enter");
  const t = useRef(0);
  const beat = useRef(0);
  const beats = useRef(3);
  const started = useRef(false);
  const fired = useRef(false);
  const clips = cast.fighter.clips;

  // Clips loop (crossfading to the next beat) so the rig never snaps to bind
  // pose between one-shots, matching the model's animation conventions.
  const swing = (c: CombatantHandle) => {
    if (beat.current > 0 && Math.random() < 0.3) {
      c.play(clips.dodge);
    } else {
      c.play(pick(clips.attack));
      onImpact(0.6, groundY + 1.9, cast.fighter.theme.accent);
    }
  };

  useFrame((_, dt) => {
    const c = ref.current;
    const g = c?.group;
    if (!c || !g) return;
    if (!started.current) {
      started.current = true;
      g.position.set(-(halfW + OFF), groundY, 0);
      g.rotation.y = FACE_RIGHT;
      c.play(clips.run);
    }
    g.position.y = groundY;
    t.current += dt;

    switch (phase.current) {
      case "enter":
        g.position.x += RUN * dt;
        if (g.position.x >= 0) {
          g.position.x = 0;
          phase.current = "fight";
          t.current = 0;
          beat.current = 0;
          beats.current = 3 + Math.floor(Math.random() * 2);
          swing(c);
        }
        break;
      case "fight":
        g.rotation.y = MathUtils.damp(g.rotation.y, FACE_VIEWER, 6, dt);
        if (t.current >= BEAT) {
          t.current = 0;
          beat.current += 1;
          if (beat.current >= beats.current) {
            phase.current = "cheer";
            t.current = 0;
            c.play(clips.cheer);
          } else {
            swing(c);
          }
        }
        break;
      case "cheer":
        if (t.current > CHEER) {
          phase.current = "exit";
          g.rotation.y = FACE_RIGHT;
          c.play(clips.walk);
        }
        break;
      case "exit":
        g.rotation.y = MathUtils.damp(g.rotation.y, FACE_RIGHT, 6, dt);
        g.position.x += WALK * dt;
        if (g.position.x >= exitX) {
          phase.current = "done";
          if (!fired.current) {
            fired.current = true;
            onDone();
          }
        }
        break;
      case "done":
        break;
    }
  });

  return <Combatant ref={ref} fighter={cast.fighter} name={cast.name} />;
}
