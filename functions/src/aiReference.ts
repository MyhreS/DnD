// Serve the DM's bundled reference content (resources/master.json) to the AI.
//
// master.json is copied next to the compiled bundle at build time by
// scripts/copy-master.cjs (see functions/package.json build). We read it from
// disk once and cache it — it is NEVER stored in Firestore. A valid, unexpired
// token is enough to read it (no character binding).
import * as fs from "fs";
import * as path from "path";

import { logger } from "firebase-functions/v2";

type Master = Record<string, unknown>;

let cache: Master | null = null;

function load(): Master {
  if (cache) return cache;
  // __dirname at runtime is functions/lib; the bundle sits at functions/master.json.
  const file = path.join(__dirname, "..", "master.json");
  try {
    cache = JSON.parse(fs.readFileSync(file, "utf8")) as Master;
  } catch (err) {
    logger.error("Failed to read bundled master.json", { file, err: String(err) });
    throw err;
  }
  return cache;
}

/** Top-level content sections (everything except meta + the index catalog). */
export function referenceSections(): string[] {
  return Object.keys(load()).filter((k) => k !== "meta" && k !== "index");
}

/** The catalog: meta, the list of available section keys, and the rich index. */
export function referenceIndex(): { meta: unknown; sections: string[]; index: unknown } {
  const m = load();
  return { meta: m.meta ?? null, sections: referenceSections(), index: m.index ?? [] };
}

/** One content section by key, or undefined if it isn't a real section. */
export function referenceSection(section: string): unknown {
  const m = load();
  if (section === "meta" || section === "index" || !(section in m)) return undefined;
  return m[section];
}
