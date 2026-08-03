import { CanvasTexture, SRGBColorSpace, type Texture } from "three";

// Tiny procedural radial-gradient textures, generated once and shared. They give
// the scene its atmosphere without shipping any image assets:
//   • a soft black blob for the contact shadow under each fighter's feet,
//   • a soft white blob (tinted per-class via material colour, additive) for the
//     ground mist and the weapon-clash sparks.

function radial(rgb: string): CanvasTexture {
  const size = 128;
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const ctx = c.getContext("2d")!;
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, `rgba(${rgb},1)`);
  g.addColorStop(0.5, `rgba(${rgb},0.35)`);
  g.addColorStop(1, `rgba(${rgb},0)`);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  const tex = new CanvasTexture(c);
  tex.colorSpace = SRGBColorSpace;
  return tex;
}

let shadow: Texture | null = null;
let glow: Texture | null = null;

/** Soft black radial — the contact shadow under a fighter. */
export const shadowTexture = (): Texture => (shadow ??= radial("0,0,0"));

/** Soft white radial — tinted additively for mist + sparks. */
export const glowTexture = (): Texture => (glow ??= radial("255,255,255"));
