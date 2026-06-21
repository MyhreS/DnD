import { useMemo, useRef } from "react";
import { useAnimations, useGLTF } from "@react-three/drei";
import {
  Box3,
  LoopOnce,
  LoopRepeat,
  MeshStandardMaterial,
  type AnimationAction,
  type Group,
  type Material,
  type Mesh,
} from "three";
import { clone } from "three/examples/jsm/utils/SkeletonUtils.js";
import type { FighterConfig } from "./fighterConfig";

export interface PlayOpts {
  /** Loop forever (default) vs. play once. */
  loop?: boolean;
  /** Crossfade seconds. */
  fade?: number;
  /** For one-shots: freeze on the last frame instead of snapping back. */
  clamp?: boolean;
  /** Playback rate. */
  timeScale?: number;
}

export interface FighterModel {
  model: Group;
  /** Local-space feet (min y) and head (max y) of the model, pre-scale. */
  feetY: number;
  headY: number;
  play: (clip: string, opts?: PlayOpts) => AnimationAction | null;
}

// Drag the bright, toy-like KayKit materials toward grim dark-fantasy: darker
// albedo, rougher surface, a touch of class-coloured inner glow. Materials are
// cloned first so we never mutate the GLTF cache shared by other instances.
function grit(mat: Material, accent: string): Material {
  const m = mat.clone();
  if (m instanceof MeshStandardMaterial) {
    m.color.multiplyScalar(0.52);
    m.roughness = Math.min(1, m.roughness * 0.4 + 0.7);
    m.metalness = Math.max(0, m.metalness * 0.6);
    m.emissive.set(accent);
    m.emissiveIntensity = 0.08;
    m.envMapIntensity = 0.3;
  }
  return m;
}

/** Loads + clones a fighter model, grits its materials, and returns a clip player. */
export function useFighterModel(fighter: FighterConfig): FighterModel {
  const { scene, animations } = useGLTF(fighter.url);

  const model = useMemo(() => {
    const c = clone(scene) as Group;
    c.traverse((o) => {
      if (fighter.hide.includes(o.name)) o.visible = false;
      const mesh = o as Mesh;
      if (mesh.isMesh && mesh.material) {
        mesh.material = Array.isArray(mesh.material)
          ? mesh.material.map((m) => grit(m, fighter.theme.accent))
          : grit(mesh.material, fighter.theme.accent);
      }
    });
    return c;
  }, [scene, fighter]);

  const { feetY, headY } = useMemo(() => {
    // Box only over *visible* meshes — the hidden weapon variants would
    // otherwise inflate the bounds (and throw off ground placement).
    const box = new Box3();
    const tmp = new Box3();
    model.updateWorldMatrix(true, true);
    model.traverse((o) => {
      const mesh = o as Mesh;
      if (!mesh.isMesh || !mesh.visible || !mesh.geometry) return;
      mesh.geometry.computeBoundingBox();
      if (mesh.geometry.boundingBox) box.union(tmp.copy(mesh.geometry.boundingBox).applyMatrix4(mesh.matrixWorld));
    });
    return { feetY: box.min.y, headY: box.max.y };
  }, [model]);

  const { actions } = useAnimations(animations, model);
  const current = useRef<AnimationAction | null>(null);

  const play = (clip: string, opts: PlayOpts = {}): AnimationAction | null => {
    const next = actions[clip];
    if (!next) return current.current;
    const { loop = true, fade = 0.22, clamp = false, timeScale = 1 } = opts;
    next.enabled = true;
    next.setEffectiveTimeScale(timeScale);
    next.setEffectiveWeight(1);
    if (loop) next.setLoop(LoopRepeat, Infinity);
    else {
      next.setLoop(LoopOnce, 1);
      next.clampWhenFinished = clamp;
    }
    if (next === current.current) return next;
    next.reset();
    next.fadeIn(fade).play();
    current.current?.fadeOut(fade);
    current.current = next;
    return next;
  };

  return { model, feetY, headY, play };
}
