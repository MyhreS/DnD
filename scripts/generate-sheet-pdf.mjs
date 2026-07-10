// Pre-generate the BLANK paper character sheet as PDFs, straight from the
// app's own sheet (so the download always matches what's on screen). The
// results are committed under public/sheet/ and served by Firebase Hosting —
// the sheet's "Export to PDF" button downloads them instead of fighting
// window.print() on phones.
//
//   bun run dev                       # in another terminal
//   node scripts/generate-sheet-pdf.mjs [BASE]
//
// Re-run whenever the sheet's layout changes, and commit the new PDFs.
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";

const BASE = process.argv[2] ?? process.env.BASE ?? "http://localhost:5173";
const OUT = "public/sheet";
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1000, height: 1400 } });
page.on("pageerror", (e) => {
  console.error("pageerror:", e.message);
  process.exitCode = 1;
});

await page.goto(`${BASE}/character?preview=user.player`, { waitUntil: "load" });
// The sample hunter's FILLED sheet auto-pops — close it, then open a fresh
// blank draft (the "+ New hunter" flow IS the blank sheet now).
await page.waitForSelector(".papersheet .page");
await page.getByRole("button", { name: /Done/ }).click();
await page.waitForSelector(".papersheet", { state: "detached" });
await page.getByRole("button", { name: "+ New hunter" }).click();
await page.waitForSelector(".papersheet .page");
await page.evaluate(() => document.fonts.ready);
await page.waitForTimeout(500);

const pdfOpts = {
  format: "A4",
  printBackground: true,
  margin: { top: 0, right: 0, bottom: 0, left: 0 },
};

// With the red step numbers (the DM's "numbered" tutorial variant)…
await page.pdf({ ...pdfOpts, path: `${OUT}/character-sheet-numbered.pdf` });

// …and the plain one.
await page.locator(".papersheet-toolbar").getByLabel("Show step numbers").uncheck();
await page.waitForTimeout(200);
await page.pdf({ ...pdfOpts, path: `${OUT}/character-sheet.pdf` });

console.log(`Wrote ${OUT}/character-sheet-numbered.pdf and ${OUT}/character-sheet.pdf`);
await browser.close();
