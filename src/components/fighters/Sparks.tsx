import { forwardRef, useImperativeHandle, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { AdditiveBlending, BufferAttribute, BufferGeometry, Points, PointsMaterial } from "three";
import { glowTexture } from "./textures";

/** Trigger a short, additive spark burst at a world position, tinted `color`. */
export interface SparksHandle {
  burst: (x: number, y: number, color: string) => void;
}

const COUNT = 30;
const GONE = -9999;

/** A small reusable particle burst for weapon clashes (one pool, re-fired). */
export const Sparks = forwardRef<SparksHandle>(function Sparks(_, ref) {
  const points = useRef<Points>(null);
  const vel = useRef(new Float32Array(COUNT * 3));
  const life = useRef(new Float32Array(COUNT));

  const geom = useMemo(() => {
    const g = new BufferGeometry();
    const pos = new Float32Array(COUNT * 3).fill(GONE);
    g.setAttribute("position", new BufferAttribute(pos, 3));
    return g;
  }, []);
  const mat = useMemo(
    () =>
      new PointsMaterial({
        size: 0.42,
        map: glowTexture(),
        transparent: true,
        blending: AdditiveBlending,
        depthWrite: false,
        opacity: 1,
        sizeAttenuation: true,
      }),
    [],
  );

  useImperativeHandle(
    ref,
    () => ({
      burst: (x, y, color) => {
        mat.color.set(color);
        const pos = geom.attributes.position.array as Float32Array;
        for (let i = 0; i < COUNT; i++) {
          pos[i * 3] = x;
          pos[i * 3 + 1] = y;
          pos[i * 3 + 2] = 0.4;
          const a = Math.random() * Math.PI * 2;
          const sp = 1.5 + Math.random() * 3.5;
          vel.current[i * 3] = Math.cos(a) * sp;
          vel.current[i * 3 + 1] = Math.sin(a) * sp + 1.6;
          vel.current[i * 3 + 2] = (Math.random() - 0.5) * 1.5;
          life.current[i] = 0.35 + Math.random() * 0.35;
        }
        geom.attributes.position.needsUpdate = true;
        if (points.current) points.current.visible = true;
      },
    }),
    [geom, mat],
  );

  useFrame((_, dt) => {
    const pts = points.current;
    if (!pts || !pts.visible) return;
    const pos = geom.attributes.position.array as Float32Array;
    let alive = 0;
    let maxLife = 0;
    for (let i = 0; i < COUNT; i++) {
      if (life.current[i] <= 0) continue;
      life.current[i] -= dt;
      if (life.current[i] <= 0) {
        pos[i * 3 + 1] = GONE;
        continue;
      }
      alive++;
      maxLife = Math.max(maxLife, life.current[i]);
      vel.current[i * 3 + 1] -= 6 * dt; // gravity
      pos[i * 3] += vel.current[i * 3] * dt;
      pos[i * 3 + 1] += vel.current[i * 3 + 1] * dt;
      pos[i * 3 + 2] += vel.current[i * 3 + 2] * dt;
    }
    geom.attributes.position.needsUpdate = true;
    mat.opacity = Math.min(1, maxLife * 3);
    if (!alive) pts.visible = false;
  });

  return <points ref={points} geometry={geom} material={mat} visible={false} frustumCulled={false} />;
});
