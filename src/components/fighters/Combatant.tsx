import { forwardRef, useImperativeHandle, useRef } from "react";
import { Html } from "@react-three/drei";
import { DoubleSide, type Group } from "three";
import { useFighterModel, type PlayOpts } from "./useFighterModel";
import { shadowTexture } from "./textures";
import type { FighterConfig } from "./fighterConfig";

export interface CombatantHandle {
  /** The outer group the choreography moves/rotates. Null until mounted. */
  readonly group: Group | null;
  play: (clip: string, opts?: PlayOpts) => void;
}

interface Props {
  fighter: FighterConfig;
  name: string | null;
}

/**
 * A single fighter on stage. The outer group is positioned/rotated by the
 * choreography (its origin is the fighter's feet); the model, a tracking contact
 * shadow and the name label hang off it.
 */
export const Combatant = forwardRef<CombatantHandle, Props>(function Combatant(
  { fighter, name },
  ref,
) {
  const group = useRef<Group>(null);
  const { model, feetY, headY, play } = useFighterModel(fighter);
  const s = fighter.scale;

  useImperativeHandle(
    ref,
    () => ({
      get group() {
        return group.current;
      },
      play: (clip, opts) => {
        play(clip, opts);
      },
    }),
    [play],
  );

  return (
    <group ref={group}>
      {/* Sink the model so its feet sit on the group origin (the ground line),
          plus an optional per-model vertical nudge. */}
      <group position={[0, -feetY * s + fighter.yOffset, 0]} scale={s}>
        <primitive object={model} />
      </group>
      <mesh rotation-x={-Math.PI / 2} position-y={0.02} renderOrder={-1}>
        <planeGeometry args={[1.7, 1.7]} />
        <meshBasicMaterial map={shadowTexture()} transparent opacity={0.55} depthWrite={false} side={DoubleSide} />
      </mesh>
      {name && (
        <Html position={[0, (headY - feetY) * s + 0.4, 0]} center distanceFactor={9} pointerEvents="none">
          <span className="fighter-name">{name}</span>
        </Html>
      )}
    </group>
  );
});
