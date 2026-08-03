import { spawnSync } from "node:child_process";
import { chmodSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { isDeepStrictEqual } from "node:util";
import { migrateLegacyCharacter } from "../src/features/hunter/lib/legacyMigration";
import type { HunterCard } from "../src/types";

/** Production character-sheet migration.
 *
 * Dry run (default): bun run migrate:character-sheets
 * Apply: bun run migrate:character-sheets -- --apply --backup /absolute/backup.json
 * Restore: bun run migrate:character-sheets -- --restore /absolute/backup.json --apply
 *
 * The project is deliberately pinned below. Authentication comes from an
 * existing gcloud login; no service-account key or access token is persisted. */
const PROJECT_ID = "dandd-ea955";
const DATABASE_ID = "(default)";
const ACCOUNT = process.env.FIRESTORE_MIGRATION_ACCOUNT ?? "simonmyhre1@gmail.com";
const API_ROOT = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/${encodeURIComponent(DATABASE_ID)}/documents`;
const args = new Set(process.argv.slice(2));
const apply = args.has("--apply");
const restoreIndex = process.argv.indexOf("--restore");
const backupIndex = process.argv.indexOf("--backup");
const restorePath = restoreIndex >= 0 ? process.argv[restoreIndex + 1] : undefined;
const backupPath = backupIndex >= 0 ? process.argv[backupIndex + 1] : undefined;

type FirestoreValue = Record<string, unknown>;
interface FirestoreDocument {
  name: string;
  fields?: Record<string, FirestoreValue>;
  createTime?: string;
  updateTime?: string;
}

function token(): string {
  const result = spawnSync("gcloud", ["auth", "print-access-token", `--account=${ACCOUNT}`], { encoding: "utf8" });
  if (result.status !== 0 || !result.stdout.trim()) throw new Error(`Could not obtain a Google access token for ${ACCOUNT}: ${result.stderr.trim()}`);
  return result.stdout.trim();
}

let accessToken = token();

async function request(url: string, init: RequestInit = {}, attempt = 0): Promise<Response> {
  const response = await fetch(url, {
    ...init,
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json", ...(init.headers ?? {}) },
  });
  if (response.status === 401 && attempt === 0) {
    accessToken = token();
    return request(url, init, 1);
  }
  if ([429, 500, 502, 503, 504].includes(response.status) && attempt < 3) {
    await new Promise((done) => setTimeout(done, 250 * 2 ** attempt));
    return request(url, init, attempt + 1);
  }
  if (!response.ok) throw new Error(`${init.method ?? "GET"} ${url} failed (${response.status}): ${await response.text()}`);
  return response;
}

function decode(value: FirestoreValue | undefined): unknown {
  if (!value) return undefined;
  if ("nullValue" in value) return null;
  if ("booleanValue" in value) return value.booleanValue;
  if ("integerValue" in value) return Number(value.integerValue);
  if ("doubleValue" in value) return Number(value.doubleValue);
  if ("timestampValue" in value) return value.timestampValue;
  if ("stringValue" in value) return value.stringValue;
  if ("bytesValue" in value) return value.bytesValue;
  if ("referenceValue" in value) return value.referenceValue;
  if ("geoPointValue" in value) return value.geoPointValue;
  if ("arrayValue" in value) return ((value.arrayValue as { values?: FirestoreValue[] }).values ?? []).map(decode);
  if ("mapValue" in value) return decodeFields((value.mapValue as { fields?: Record<string, FirestoreValue> }).fields ?? {});
  throw new Error(`Unsupported Firestore value: ${JSON.stringify(value)}`);
}

function decodeFields(fields: Record<string, FirestoreValue>): Record<string, unknown> {
  return Object.fromEntries(Object.entries(fields).map(([key, value]) => [key, decode(value)]));
}

function encode(value: unknown): FirestoreValue {
  if (value === null) return { nullValue: null };
  if (typeof value === "boolean") return { booleanValue: value };
  if (typeof value === "number") return Number.isInteger(value) ? { integerValue: String(value) } : { doubleValue: value };
  if (typeof value === "string") return { stringValue: value };
  if (Array.isArray(value)) return { arrayValue: { values: value.map(encode) } };
  if (typeof value === "object" && value) {
    const entries = Object.entries(value).filter(([, nested]) => nested !== undefined);
    return { mapValue: { fields: Object.fromEntries(entries.map(([key, nested]) => [key, encode(nested)])) } };
  }
  throw new Error(`Cannot encode ${typeof value} in a Firestore migration`);
}

async function listCharacters(): Promise<FirestoreDocument[]> {
  const documents: FirestoreDocument[] = [];
  let pageToken = "";
  do {
    const url = new URL(`${API_ROOT}/characters`);
    url.searchParams.set("pageSize", "300");
    if (pageToken) url.searchParams.set("pageToken", pageToken);
    const payload = await (await request(url.toString())).json() as { documents?: FirestoreDocument[]; nextPageToken?: string };
    documents.push(...(payload.documents ?? []));
    pageToken = payload.nextPageToken ?? "";
  } while (pageToken);
  return documents;
}

function documentId(document: FirestoreDocument): string {
  return document.name.slice(document.name.lastIndexOf("/") + 1);
}

function needsMigration(card: Partial<HunterCard>): boolean {
  if (card.sheetAutomation || !card.sheet) return false;
  return Object.values(card.sheet).some((value) => value === true || (typeof value === "string" && value.trim() !== ""));
}

async function patchDocument(document: FirestoreDocument, fields: Record<string, unknown>): Promise<FirestoreDocument> {
  if (!document.updateTime) throw new Error(`${documentId(document)} has no updateTime precondition`);
  const url = new URL(`${API_ROOT}/characters/${encodeURIComponent(documentId(document))}`);
  for (const key of Object.keys(fields)) url.searchParams.append("updateMask.fieldPaths", key);
  url.searchParams.set("currentDocument.updateTime", document.updateTime);
  return await (await request(url.toString(), {
    method: "PATCH",
    body: JSON.stringify({ fields: Object.fromEntries(Object.entries(fields).filter(([, value]) => value !== undefined).map(([key, value]) => [key, encode(value)])) }),
  })).json() as FirestoreDocument;
}

async function restore() {
  if (!restorePath || !apply) throw new Error("Restoring requires --restore PATH --apply");
  const backup = JSON.parse(readFileSync(resolve(restorePath), "utf8")) as { projectId: string; documents: FirestoreDocument[] };
  if (backup.projectId !== PROJECT_ID) throw new Error(`Backup belongs to ${backup.projectId}, not ${PROJECT_ID}`);
  const current = new Map((await listCharacters()).map((document) => [documentId(document), document]));
  for (const original of backup.documents) {
    const id = documentId(original);
    const live = current.get(id);
    if (!live?.updateTime) throw new Error(`Cannot safely restore missing document ${id}`);
    const originalFields = original.fields ?? {};
    const liveFields = live.fields ?? {};
    const url = new URL(`${API_ROOT}/characters/${encodeURIComponent(id)}`);
    for (const key of new Set([...Object.keys(originalFields), ...Object.keys(liveFields)])) url.searchParams.append("updateMask.fieldPaths", key);
    url.searchParams.set("currentDocument.updateTime", live.updateTime);
    await request(url.toString(), { method: "PATCH", body: JSON.stringify({ fields: originalFields }) });
  }
  console.log(`Restored ${backup.documents.length} character document(s) from ${resolve(restorePath)}.`);
}

if (restorePath) {
  await restore();
  process.exit(0);
}

const documents = await listCharacters();
const targets = documents.filter((document) => needsMigration(decodeFields(document.fields ?? {}) as Partial<HunterCard>));
const migratedAt = Date.now();
const migrations = targets.map((document) => {
  const card = { ...decodeFields(document.fields ?? {}), id: documentId(document) } as HunterCard;
  return { document, card, result: migrateLegacyCharacter(card, migratedAt) };
});

const report = {
  projectId: PROJECT_ID,
  mode: apply ? "apply" : "dry-run",
  totalCharacters: documents.length,
  targetCharacters: migrations.length,
  alreadyStructured: documents.filter((document) => !!(decodeFields(document.fields ?? {}) as Partial<HunterCard>).sheetAutomation).length,
  characters: migrations.map(({ document, card, result }) => ({
    id: documentId(document),
    name: result.patch.name || card.name || "Unnamed hunter",
    decisions: result.decisions,
    manualOverrides: result.manualOverrides,
  })),
};

if (!apply) {
  console.log(JSON.stringify(report, null, 2));
  process.exit(0);
}

if (!backupPath) throw new Error("Applying requires --backup ABSOLUTE_PATH so the original documents remain recoverable");
const absoluteBackup = resolve(backupPath);
mkdirSync(dirname(absoluteBackup), { recursive: true });
writeFileSync(absoluteBackup, JSON.stringify({ projectId: PROJECT_ID, createdAt: new Date().toISOString(), documents: targets, report }, null, 2), { mode: 0o600, flag: "wx" });
chmodSync(absoluteBackup, 0o600);

const expected = new Map<string, Record<string, unknown>>();
for (const { document, result } of migrations) {
  const patch = { ...result.patch, updatedAt: migratedAt } as Record<string, unknown>;
  expected.set(documentId(document), patch);
  await patchDocument(document, patch);
}

const verified = new Map((await listCharacters()).map((document) => [documentId(document), decodeFields(document.fields ?? {})]));
const failures: string[] = [];
for (const [id, patch] of expected) {
  const live = verified.get(id) ?? {};
  const actual = Object.fromEntries(Object.keys(patch).map((key) => [key, live[key]]));
  if (!isDeepStrictEqual(actual, patch)) failures.push(id);
}
if (failures.length) throw new Error(`Post-write verification failed for: ${failures.join(", ")}. Restore with --restore ${absoluteBackup} --apply`);

console.log(JSON.stringify({ ...report, backup: absoluteBackup, verifiedCharacters: expected.size }, null, 2));
