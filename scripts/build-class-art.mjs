// Exports the six shipped class-art posters from resources/images/classes/
// (the DM's raw ~2–3MB PNGs, 1055×1491) into public/art/classes/ as compressed
// 900px-wide webp (~70–150KB each). Keeps the basenames so /art/classes/ URLs
// stay stable. Re-run after replacing source art:
//   bun run art:classes   (or: node scripts/build-class-art.mjs)
import sharp from "sharp";
import { readdirSync, unlinkSync, mkdirSync } from "node:fs";
import { dirname, join, basename } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const srcDir = join(here, "../resources/images/classes");
const outDir = join(here, "../public/art/classes");

// classId → source file. The other files in resources/images/classes/
// (stalker-shadow, zealot-deepcaller, hunter-figure-and-flintlock) are
// alternates and stay unshipped. Keep in sync with src/data/classArt.ts.
const SOURCES = {
  brute: "hunter-brute-splash.png",
  scout: "hunter-scout-class-art.png",
  stalker: "hunter-stalker-class-art.png",
  deepcaller: "hunter-deepcaller-splash.png",
  bloodbound: "hunter-bloodbound-class-art.png",
  warden: "hunter-warden-class-art.png",
};

// 900px wide ≈ 1.45× the widest CSS render (~620px banner); q74 keeps the
// painterly detail without ballooning past ~150KB per image.
const WIDTH = 900;
const QUALITY = 74;

mkdirSync(outDir, { recursive: true });

for (const [classId, file] of Object.entries(SOURCES)) {
  const out = join(outDir, file.replace(/\.png$/, ".webp"));
  const info = await sharp(join(srcDir, file))
    .resize(WIDTH)
    .webp({ quality: QUALITY })
    .toFile(out);
  console.log(
    `✓ ${classId.padEnd(11)} ${basename(out)}  ${Math.round(info.size / 1024)}KB (${info.width}×${info.height})`,
  );
}

// Drop any leftover raw PNGs in public/ — the webp exports supersede them
// (sources stay in resources/images/classes/).
for (const f of readdirSync(outDir)) {
  if (f.endsWith(".png")) {
    unlinkSync(join(outDir, f));
    console.log(`− removed ${f}`);
  }
}
