// Generates PWA / home-screen PNG icons from an inline SVG using sharp.
//   bun run icons
//
// Outputs to /public:
//   pwa-192x192.png, pwa-512x512.png, apple-touch-icon.png (180), favicon-...
import sharp from "sharp";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const publicDir = join(__dirname, "..", "public");

// Maskable-safe artwork: important content stays within the centre ~80%.
function iconSvg(size) {
  const s = size;
  return `<svg width="${s}" height="${s}" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <radialGradient id="bg" cx="50%" cy="32%" r="80%">
      <stop offset="0%" stop-color="#1a0708"/>
      <stop offset="55%" stop-color="#0d0c10"/>
      <stop offset="100%" stop-color="#0a0a0c"/>
    </radialGradient>
  </defs>
  <rect width="512" height="512" fill="url(#bg)"/>
  <circle cx="256" cy="256" r="176" fill="none" stroke="#c9a45a" stroke-width="6" opacity="0.5"/>
  <circle cx="256" cy="256" r="150" fill="none" stroke="#c9a45a" stroke-width="2" opacity="0.3"/>
  <path d="M256 96c54 80 96 132 96 188a96 96 0 0 1-192 0c0-56 42-108 96-188Z" fill="#b3121a"/>
  <path d="M256 232l17 35 38 4-29 26 8 38-34-20-34 20 8-38-29-26 38-4 17-35Z" fill="#0a0a0c"/>
</svg>`;
}

const targets = [
  { name: "pwa-192x192.png", size: 192 },
  { name: "pwa-512x512.png", size: 512 },
  { name: "apple-touch-icon.png", size: 180 },
];

for (const { name, size } of targets) {
  const buf = Buffer.from(iconSvg(size));
  await sharp(buf, { density: 384 })
    .resize(size, size)
    .png()
    .toFile(join(publicDir, name));
  console.log(`✓ ${name} (${size}×${size})`);
}

console.log("Icons generated in /public");
