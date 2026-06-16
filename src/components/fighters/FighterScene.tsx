import { Suspense, useEffect, useMemo, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useAnimations, useGLTF, Html } from "@react-three/drei";
import { AnimationAction, Box3, Group, LoopRepeat, MathUtils } from "three";
import { clone } from "three/examples/jsm/utils/SkeletonUtils.js";
import type { FighterConfig } from "./fighterConfig";

// Where the fighter faces (rotation about Y). The model's front is +Z, the
// camera sits on +Z, so 0 faces the viewer.
const FACE_RIGHT = Math.PI / 2;
const FACE_VIEWER = 0.35; // a 3/4 view reads better than dead-on

const FIGHT_X = 0; // where it stops to fight (screen centre)
const WALK_SPEED = 1.4; // units / second
const SWINGS = 2; // number of weapon strikes before the flourish
const SWING_INTERVAL = 1.15; // seconds per strike
const CHEER_SECONDS = 2.2; // length of the wave finisher
const OFFSCREEN_MARGIN = 1; // extra world units past the edge so it's fully hidden

const rand = <T,>(xs: T[]): T => xs[Math.floor(Math.random() * xs.length)];

type Phase = "enter" | "fight" | "cheer" | "exit" | "done";

interface FighterProps {
  fighter: FighterConfig;
  name: string | null;
  onDone: () => void;
}

/** The character + its walk-in → fight → cheer → walk-off choreography. */
function Fighter({ fighter, name, onDone }: FighterProps) {
  const group = useRef<Group>(null);
  const { viewport } = useThree();
  const { scene, animations } = useGLTF(fighter.url);

  // Clone so each show gets its own instance, and hide every equipment mesh
  // except this fighter's loadout (KayKit models embed all weapon variants).
  const model = useMemo(() => {
    const c = clone(scene);
    c.traverse((o) => {
      if (fighter.hide.includes(o.name)) o.visible = false;
    });
    return c;
  }, [scene, fighter]);

  // Derive the walk-on path + ground line from the *actual* visible area, so the
  // fighter always starts fully off-screen (no matter the device/orientation)
  // and stands on the bottom edge.
  const feetY = useMemo(() => new Box3().setFromObject(model).min.y, [model]);
  const halfW = viewport.width / 2;
  const enterX = -(halfW + OFFSCREEN_MARGIN);
  const exitX = halfW + OFFSCREEN_MARGIN;
  const groundY = -viewport.height / 2 + 0.1 - feetY * fighter.scale + fighter.yOffset;

  const { actions } = useAnimations(animations, model);

  const phase = useRef<Phase>("enter");
  const phaseT = useRef(0);
  const lastSwing = useRef(0);
  const swings = useRef(0);
  const current = useRef<AnimationAction | null>(null);

  // Crossfade to a clip by name.
  const playClip = (clipName: string) => {
    const next = actions[clipName];
    if (!next || next === current.current) return;
    next.reset();
    next.setLoop(LoopRepeat, Infinity);
    next.fadeIn(0.25).play();
    current.current?.fadeOut(0.25);
    current.current = next;
  };

  useEffect(() => {
    const g = group.current;
    if (g) {
      g.position.set(enterX, groundY, 0);
      g.rotation.y = FACE_RIGHT;
    }
    playClip(fighter.clips.walk);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useFrame((_, dt) => {
    const g = group.current;
    if (!g) return;
    g.position.y = groundY;
    phaseT.current += dt;

    switch (phase.current) {
      case "enter": {
        g.position.x += WALK_SPEED * dt;
        if (g.position.x >= FIGHT_X) {
          g.position.x = FIGHT_X;
          phase.current = "fight";
          phaseT.current = 0;
          lastSwing.current = 0;
          swings.current = 1;
          playClip(rand(fighter.clips.attack));
        }
        break;
      }
      case "fight": {
        // Turn to face the viewer and throw a couple of weapon strikes.
        g.rotation.y = MathUtils.damp(g.rotation.y, FACE_VIEWER, 6, dt);
        if (phaseT.current - lastSwing.current >= SWING_INTERVAL) {
          lastSwing.current = phaseT.current;
          if (swings.current < SWINGS) {
            swings.current += 1;
            playClip(rand(fighter.clips.attack));
          } else {
            phase.current = "cheer";
            phaseT.current = 0;
            playClip(fighter.clips.cheer);
          }
        }
        break;
      }
      case "cheer": {
        if (phaseT.current > CHEER_SECONDS) {
          phase.current = "exit";
          phaseT.current = 0;
          g.rotation.y = FACE_RIGHT;
          playClip(fighter.clips.walk);
        }
        break;
      }
      case "exit": {
        g.rotation.y = MathUtils.damp(g.rotation.y, FACE_RIGHT, 6, dt);
        g.position.x += WALK_SPEED * dt;
        if (g.position.x >= exitX) {
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
    <group ref={group} scale={fighter.scale}>
      <primitive object={model} />
      {name && (
        <Html position={[0, 3, 0]} center distanceFactor={9} pointerEvents="none">
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
export default function FighterScene({ fighter, name, onDone }: FighterProps) {
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
          <Fighter fighter={fighter} name={name} onDone={done} />
        </Suspense>
      </Canvas>
    </div>
  );
}
