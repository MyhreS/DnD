import { Suspense, useEffect, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { useAnimations, useGLTF, Html } from "@react-three/drei";
import {
  AnimationAction,
  Group,
  LoopRepeat,
  MathUtils,
} from "three";
import { FIGHTER } from "./fighterConfig";

useGLTF.preload(FIGHTER.url);

// Where the fighter faces (rotation about Y). The model's front is +Z, the
// camera sits on +Z, so 0 faces the viewer.
const FACE_RIGHT = Math.PI / 2;
const FACE_VIEWER = 0.35; // a 3/4 view reads better than dead-on

// A portrait phone viewport is narrow, so the fighter stays near centre: it
// walks in from just off the left edge, fights at centre, and exits right.
const ENTER_X = -3.4; // start just off-screen left
const FIGHT_X = 0; // where it stops to fight (screen centre)
const EXIT_X = 3.4; // off-screen right
const WALK_SPEED = 1.4; // units / second

type Phase = "enter" | "fight" | "cheer" | "exit" | "done";

interface FighterProps {
  name: string | null;
  onDone: () => void;
}

/** The character + its walk-in → fight → cheer → walk-off choreography. */
function Fighter({ name, onDone }: FighterProps) {
  const group = useRef<Group>(null);
  const { scene, animations } = useGLTF(FIGHTER.url);
  const { actions } = useAnimations(animations, group);

  const phase = useRef<Phase>("enter");
  const phaseT = useRef(0);
  const current = useRef<AnimationAction | null>(null);

  // Crossfade to a named clip.
  const play = (name: keyof typeof FIGHTER.clips, loop = true) => {
    const next = actions[FIGHTER.clips[name]];
    if (!next || next === current.current) return;
    next.reset();
    next.setLoop(LoopRepeat, loop ? Infinity : 1);
    next.fadeIn(0.3).play();
    current.current?.fadeOut(0.3);
    current.current = next;
  };

  useEffect(() => {
    const g = group.current;
    if (g) {
      g.position.set(ENTER_X, FIGHTER.yOffset, 0);
      g.rotation.y = FACE_RIGHT;
    }
    play("walk");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useFrame((_, dt) => {
    const g = group.current;
    if (!g) return;
    phaseT.current += dt;

    switch (phase.current) {
      case "enter": {
        g.position.x += WALK_SPEED * dt;
        if (g.position.x >= FIGHT_X) {
          g.position.x = FIGHT_X;
          phase.current = "fight";
          phaseT.current = 0;
          play("attack");
        }
        break;
      }
      case "fight": {
        // Turn to face the viewer and keep swinging the weapon.
        g.rotation.y = MathUtils.damp(g.rotation.y, FACE_VIEWER, 6, dt);
        if (phaseT.current > 9) {
          phase.current = "cheer";
          phaseT.current = 0;
          play("cheer");
        }
        break;
      }
      case "cheer": {
        if (phaseT.current > 3) {
          phase.current = "exit";
          phaseT.current = 0;
          g.rotation.y = FACE_RIGHT;
          play("walk");
        }
        break;
      }
      case "exit": {
        g.rotation.y = MathUtils.damp(g.rotation.y, FACE_RIGHT, 6, dt);
        g.position.x += WALK_SPEED * dt;
        if (g.position.x >= EXIT_X) {
          phase.current = "done";
          onDone();
        }
        break;
      }
      case "done":
        break;
    }
  });

  return (
    <group ref={group} scale={FIGHTER.scale}>
      <primitive object={scene} />
      {name && (
        <Html position={[0, 4.2, 0]} center distanceFactor={9} pointerEvents="none">
          <span className="fighter-name">{name}</span>
        </Html>
      )}
    </group>
  );
}

/**
 * Full-screen, click-through 3D overlay that performs one fighter show, then
 * calls `onDone`. Mounted only during a show, so there's no idle WebGL cost.
 */
export default function FighterScene({ name, onDone }: FighterProps) {
  const fired = useRef(false);
  const done = () => {
    if (fired.current) return;
    fired.current = true;
    onDone();
  };
  return (
    <div className="fighters no-print" aria-hidden>
      <Canvas
        camera={{ position: [0, 0, 16], fov: 32 }}
        dpr={[1, 1.75]}
        gl={{ alpha: true, antialias: true }}
        style={{ position: "fixed", inset: 0, pointerEvents: "none" }}
      >
        <hemisphereLight args={["#fff5e6", "#1a1620", 1.1]} />
        <directionalLight position={[3, 6, 4]} intensity={2.2} color="#ffe9c7" />
        <directionalLight position={[-4, 2, -2]} intensity={0.7} color="#7c5cff" />
        <Suspense fallback={null}>
          <Fighter name={name} onDone={done} />
        </Suspense>
      </Canvas>
    </div>
  );
}
