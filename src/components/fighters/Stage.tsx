import { useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { AdditiveBlending, DoubleSide, type Group } from "three";
import { glowTexture } from "./textures";
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
      <ambientLight intensity={0.42} color="#2a2533" />
      <directionalLight position={[4, 7, 6]} intensity={0.75} color="#ffe9c7" />
      {rims.map((r, i) => (
        <directionalLight key={i} position={[r.x, 5, -6]} intensity={2.7} color={r.c} />
      ))}
      <pointLight position={[0, -0.4, 5]} intensity={0.5} color={themes[0].accent} distance={26} decay={1.1} />
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
