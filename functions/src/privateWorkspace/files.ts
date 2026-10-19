import { createHash } from "node:crypto";
import { db, type Settings } from "./auth";
import { tokenHash, privatePath } from "./policy";
export type Manifest = Record<string, { sha256: string; type: string; bytes: number; chunks: number; sourceRelease?: string }>;
const MIME = new Set(["text/html", "text/css", "text/javascript", "application/javascript", "application/json", "application/pdf", "image/png", "image/jpeg", "image/webp", "image/svg+xml", "image/x-icon", "font/woff2"]);
export async function resource(config: Settings, rawPath: string) {
  const path = privatePath(rawPath);
  if (!path) throw new Error("Unavailable");
  const root = db().doc(`privateWorkspaceReleases/${config.release}`);
  const record = (await root.get()).data();
  if (typeof record?.manifest !== "string" || record.manifest.length > 512 * 1024 || tokenHash(record.manifest) !== config.release) throw new Error("Unavailable");
  const manifest = JSON.parse(record.manifest) as Manifest;
  const entry = Object.hasOwn(manifest, path) ? manifest[path] : null;
  if (!entry || !MIME.has(entry.type) || !Number.isInteger(entry.bytes) || entry.bytes <= 0 || entry.bytes > 24 * 1024 * 1024 || !/^[a-f0-9]{64}$/.test(entry.sha256)
    || !Number.isInteger(entry.chunks) || entry.chunks < 1 || entry.chunks > 40
    || (entry.sourceRelease !== undefined && (typeof entry.sourceRelease !== "string" || !/^[a-f0-9]{64}$/.test(entry.sourceRelease)))) throw new Error("Unavailable");
  // The selected, hash-verified manifest pins the exact previous payload and its checksum.
  // This never follows another manifest or accepts a release/path from the client.
  const source = entry.sourceRelease ? db().doc(`privateWorkspaceReleases/${entry.sourceRelease}`) : root;
  const refs = Array.from({length:entry.chunks},(_,i)=>source.collection("files").doc(tokenHash(path)).collection("chunks").doc(String(i).padStart(3,"0")));
  const snapshots = await db().getAll(...refs);
  const blocks = snapshots.map(s=>s.get("bytes"));
  if (!blocks.every(Buffer.isBuffer)) throw new Error("Unavailable");
  const body = Buffer.concat(blocks);
  const digest = createHash("sha256").update(body).digest("hex");
  if (body.length !== entry.bytes || digest !== entry.sha256) throw new Error("Unavailable");
  return { type: entry.type, body: entry.type === "text/html" ? Buffer.from(body.toString().replace("</head>", '<script src="/runtime.js"></script></head>')) : body };
}
