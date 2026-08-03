import { useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { AdditiveBlending, DoubleSide, type Group } from "three";
import { glowTexture, shadowTexture } from "./textures";
import type { FighterTheme } from "./fighterConfig";

/**
 * The lighting + atmosphere the fighters perform in. The canvas is transparent
 * (it floats over the live app), so there's no dark backdrop — the grim mood
 * comes from a low cool ambient, a soft warm key, and a strong class-coloured
 * rim light raking each fighter's silhouette, plus a faint drifting ground mist.
 */
export function Stage({ themes }: { themes: FighterTheme[] }) {
  const { viewport } = useThree();
  const groundY = -viewport.height / 2 + 0.1;

  // One rim per fighter, biased to that fighter's side of the stage.
  const rims =
    themes.length === 2
      ? [
          { c: themes[0].rim, x: -4 },
          { c: themes[1].rim, x: 4 },
        ]
      : [{ c: themes[0].rim, x: 0 }];

  return (
    <>
      {/* A pool of darkness behind the fighters separates them from the bright
          app UI and reads as a cinematic spotlight on the duel. */}
      <mesh position={[0, groundY + 2.6, -2]}>
        <planeGeometry args={[13, 8]} />
        <meshBasicMaterial map={shadowTexture()} color="#05040a" transparent opacity={0.62} depthWrite={false} />
      </mesh>
      {/* A neutral warm key is the *dominant* light, so each fighter shows its
          own real colours (skin, armour, cloth) rather than reading as a flat
          one-colour silhouette. The class-coloured rim from behind only catches
          the edges, and a soft cool fill lifts the shadow side. */}
      <ambientLight intensity={0.6} color="#534d5e" />
      <directionalLight position={[4, 7, 6]} intensity={1.9} color="#fff1dd" />
      <directionalLight position={[-5, 3, 4]} intensity={0.45} color="#9fb4ff" />
      {rims.map((r, i) => (
        <directionalLight key={i} position={[r.x, 5, -6]} intensity={1.5} color={r.c} />
      ))}
      <Mist color={themes[0].accent} groundY={groundY} />
    </>
  );
}

/** Two slow, soft, additive sheets of coloured haze low on the stage. */
function Mist({ color, groundY }: { color: string; groundY: number }) {
  const a = useRef<Group>(null);
  const b = useRef<Group>(null);
  const tex = useMemo(() => glowTexture(), []);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    if (a.current) a.current.position.x = Math.sin(t * 0.18) * 1.4;
    if (b.current) b.current.position.x = Math.cos(t * 0.13) * 1.8;
  });

  const sheet = (opacity: number) => (
    <mesh>
      <planeGeometry args={[9, 3.2]} />
      <meshBasicMaterial map={tex} color={color} transparent opacity={opacity} blending={AdditiveBlending} depthWrite={false} side={DoubleSide} />
    </mesh>
  );

  return (
    <>
      <group ref={a} position={[0, groundY + 0.9, -1.5]}>{sheet(0.1)}</group>
      <group ref={b} position={[0, groundY + 0.5, -0.8]}>{sheet(0.07)}</group>
    </>
  );
}
