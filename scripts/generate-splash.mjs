// Generates iOS PWA launch (splash) screens from an inline SVG using sharp.
//   bun run scripts/generate-splash.mjs
//   (or) node scripts/generate-splash.mjs
//
// Renders dark gothic portrait splash images at device-pixel resolution for the
// common modern iPhone logical sizes. Each splash = near-black background + a
// subtle blood-red top glow + the centered brand sigil + the gold serif wordmark
// "CATACOMBS & STARSPAWNS" below it.
//
// Outputs to /public/splash/: splash-<W>x<H>.png
import sharp from "sharp";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { mkdir } from "node:fs/promises";

const __dirname = dirname(fileURLToPath(import.meta.url));
const splashDir = join(__dirname, "..", "public", "splash");

// Target physical (device-pixel) resolutions for portrait iPhone launch images.
// w/h are in physical pixels (logical * dpr).
const targets = [
  { w: 1290, h: 2796, dpr: 3 }, // iPhone 14/15 Pro Max
  { w: 1179, h: 2556, dpr: 3 }, // iPhone 14/15 Pro
  { w: 1170, h: 2532, dpr: 3 }, // iPhone 12/13/14
  { w: 1284, h: 2778, dpr: 3 }, // iPhone 12/13 Pro Max
  { w: 1125, h: 2436, dpr: 3 }, // iPhone X/XS/11 Pro
  { w: 828, h: 1792, dpr: 2 }, // iPhone XR/11
  { w: 750, h: 1334, dpr: 2 }, // iPhone 8/SE2/SE3
];

// Build a full-screen splash SVG sized to physical pixels.
// All geometry is expressed in device pixels so text stays crisp.
function splashSvg(w, h) {
  const cx = w / 2;
  // Place the sigil slightly above vertical centre so the wordmark sits centred.
  const cy = h * 0.44;
  // Sigil radius scales with the smaller dimension for consistency across sizes.
  const r = Math.round(Math.min(w, h) * 0.16);

  // Sigil geometry derived from the icon's 512-viewBox artwork, scaled to `r`.
  // In the icon, the outer gold ring radius is 176/256 of half-canvas. We treat
  // `r` as that outer ring radius and scale the rest proportionally.
  const k = r / 176; // scale factor from icon units to device px

  // Blood-drop path (icon coords centred at 256,256), translated to (cx,cy).
  const drop = `M256 96c54 80 96 132 96 188a96 96 0 0 1-192 0c0-56 42-108 96-188Z`;
  const star = `M256 232l17 35 38 4-29 26 8 38-34-20-34 20 8-38-29-26 38-4 17-35Z`;
  const sigilTransform = `translate(${cx - 256 * k} ${cy - 256 * k}) scale(${k})`;

  // Wordmark: small, gold, serif, letter-spaced, below the sigil.
  const wordY = cy + r + Math.round(r * 0.55);
  const fontSize = Math.round(r * 0.18);
  const letterSpacing = Math.round(fontSize * 0.32);

  return `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <radialGradient id="bg" cx="50%" cy="0%" r="95%">
      <stop offset="0%" stop-color="#1a0708"/>
      <stop offset="45%" stop-color="#0d0c10"/>
      <stop offset="100%" stop-color="#0a0a0c"/>
    </radialGradient>
    <radialGradient id="glow" cx="50%" cy="0%" r="55%">
      <stop offset="0%" stop-color="#b3121a" stop-opacity="0.30"/>
      <stop offset="60%" stop-color="#b3121a" stop-opacity="0.06"/>
      <stop offset="100%" stop-color="#b3121a" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="${w}" height="${h}" fill="#0a0a0c"/>
  <rect width="${w}" height="${h}" fill="url(#bg)"/>
  <rect width="${w}" height="${h}" fill="url(#glow)"/>
  <g transform="${sigilTransform}">
    <circle cx="256" cy="256" r="176" fill="none" stroke="#c9a45a" stroke-width="6" opacity="0.55"/>
    <circle cx="256" cy="256" r="150" fill="none" stroke="#c9a45a" stroke-width="2" opacity="0.3"/>
    <path d="${drop}" fill="#b3121a"/>
    <path d="${star}" fill="#0a0a0c"/>
  </g>
  <text x="${cx}" y="${wordY}"
        text-anchor="middle"
        font-family="Georgia, 'Times New Roman', 'Hoefler Text', serif"
        font-size="${fontSize}"
        font-weight="500"
        letter-spacing="${letterSpacing}"
        fill="#c9a45a">CATACOMBS &amp; STARSPAWNS</text>
</svg>`;
}

await mkdir(splashDir, { recursive: true });

for (const { w, h } of targets) {
  const name = `splash-${w}x${h}.png`;
  const svg = splashSvg(w, h);
  // density high enough to keep text edges crisp at these large raster sizes.
  await sharp(Buffer.from(svg), { density: 144 })
    .resize(w, h)
    .png()
    .toFile(join(splashDir, name));
  console.log(`✓ ${name} (${w}×${h})`);
}

console.log("Splash screens generated in /public/splash");
