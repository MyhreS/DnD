// ---------------------------------------------------------------------------
// "Get help from AI" backend.
//
//   mintCharacterAiToken  (onCall)   — the OWNER mints a 24h, single-active,
//                                       character-scoped opaque bearer token.
//   aiApi                 (onRequest) — the token-authed HTTP API the AI calls:
//                                       whoami / GET sheet / PATCH sheet /
//                                       GET reference.
//
// Security model:
//   • Tokens are random (crypto). Only the SHA-256 hash is persisted as the
//     /apiTokens doc id — the raw token is never stored or logged.
//   • Minting requires a signed-in, email-verified owner of the character.
//   • Regenerating revokes the previous token (single active token per char =
//     the answer to a leak).
//   • Every HTTP call re-derives the hash from the Bearer token, looks it up,
//     and rejects missing/expired/revoked tokens (401). Character endpoints
//     also require the token to be bound to the requested character (403).
//   • Per-field dotted `sheet.<key>` update() (never set) — a deleted hunter is
//     never resurrected. Keys are regex-gated; the path is server-built.
//
// This file defines functions OUTSIDE index.ts, so — per the setGlobalOptions
// ordering gotcha — every function pins { region: "europe-west1" } itself.
// ---------------------------------------------------------------------------
import { createHash, randomBytes } from "crypto";

import { getFirestore, FieldValue, Timestamp } from "firebase-admin/firestore";
import { logger } from "firebase-functions/v2";
import {
  onCall,
  onRequest,
  HttpsError,
  type CallableRequest,
  type Request,
} from "firebase-functions/v2/https";

import {
  ApiError,
  MIRROR_KEYS,
  applyPatch,
  assertSizeUnderLimit,
  sheetMirror,
  validateFields,
  type SheetData,
} from "./aiSheet";
import { referenceIndex, referenceSection } from "./aiReference";

const REGION = "europe-west1";
const TOKEN_TTL_MS = 24 * 60 * 60 * 1000; // 24h.

// Rate limit: a rolling per-token window plus a daily cap (transactional).
const RATE_WINDOW_MS = 60 * 1000;
const RATE_MAX_PER_WINDOW = 120;
const RATE_DAY_MS = 24 * 60 * 60 * 1000;
const RATE_MAX_PER_DAY = 5000;

interface TokenDoc {
  characterId: string;
  ownerUid: string;
  ownerName: string;
  characterName: string;
  expiresAt: Timestamp | number | null;
  revokedAt: Timestamp | number | null;
}

interface ApiResult {
  status: number;
  json: unknown;
  headers?: Record<string, string>;
}

// --- small utilities --------------------------------------------------------

function sha256(s: string): string {
  return createHash("sha256").update(s).digest("hex");
}

function tsToMillis(v: unknown): number | null {
  if (v == null) return null;
  if (typeof v === "number") return v;
  if (v instanceof Timestamp) return v.toMillis();
  if (typeof (v as { toMillis?: unknown }).toMillis === "function") {
    return (v as { toMillis: () => number }).toMillis();
  }
  return null;
}

function isoOf(v: unknown): string | null {
  const ms = tsToMillis(v);
  return ms == null ? null : new Date(ms).toISOString();
}

/** Base URL of the aiApi function (emulator-aware). */
function apiBaseUrl(): string {
  const project = process.env.GCLOUD_PROJECT || process.env.GCP_PROJECT || "dandd-ea955";
  if (process.env.FUNCTIONS_EMULATOR === "true") {
    return `http://127.0.0.1:5001/${project}/${REGION}/aiApi`;
  }
  return `https://${REGION}-${project}.cloudfunctions.net/aiApi`;
}

function endpointsFor(base: string, characterId: string) {
  return {
    whoami: `${base}/whoami`,
    sheet: `${base}/character/${characterId}`,
    reference: `${base}/reference`,
  };
}

// ---------------------------------------------------------------------------
// mintCharacterAiToken — owner-only, single active token per character.
// ---------------------------------------------------------------------------

function assertOwnerAuth(request: CallableRequest): string {
  const uid = request.auth?.uid;
  const verified = request.auth?.token.email_verified;
  if (!uid || !verified) {
    throw new HttpsError("unauthenticated", "Sign in with a verified account first.");
  }
  return uid;
}

export const mintCharacterAiToken = onCall(
  { region: REGION },
  async (request: CallableRequest<{ characterId?: string }>) => {
    const uid = assertOwnerAuth(request);
    const characterId = String(request.data?.characterId ?? "").trim();
    if (!characterId) {
      throw new HttpsError("invalid-argument", "characterId is required.");
    }

    const db = getFirestore();
    const charSnap = await db.doc(`characters/${characterId}`).get();
    if (!charSnap.exists) {
      throw new HttpsError("not-found", "Character not found.");
    }
    const c = charSnap.data() ?? {};
    // THE ownership gate — only the character's owner may mint.
    if (c.ownerUid !== uid) {
      throw new HttpsError("permission-denied", "You do not own this character.");
    }

    // Single active token: revoke (delete) any existing tokens for this char.
    const existing = await db
      .collection("apiTokens")
      .where("characterId", "==", characterId)
      .get();
    const batch = db.batch();
    existing.docs.forEach((d) => batch.delete(d.ref));

    // Mint: random token; persist only its SHA-256 hash (raw token never stored).
    const token = "cs_" + randomBytes(32).toString("base64url");
    const hash = sha256(token);
    const now = Date.now();
    const expiresAt = Timestamp.fromMillis(now + TOKEN_TTL_MS);
    const ownerName =
      (typeof c.ownerName === "string" && c.ownerName) ||
      (typeof request.auth?.token.name === "string" ? (request.auth.token.name as string) : "") ||
      "";
    const characterName = typeof c.name === "string" ? c.name : "";

    batch.set(db.doc(`apiTokens/${hash}`), {
      characterId,
      ownerUid: uid,
      ownerName,
      characterName,
      createdAt: FieldValue.serverTimestamp(),
      expiresAt,
      revokedAt: null,
      lastUsedAt: null,
      reqCount: 0,
      reqWindowStart: Timestamp.fromMillis(now),
      reqWindowCount: 0,
      reqDayStart: Timestamp.fromMillis(now),
      reqDayCount: 0,
    });
    await batch.commit();

    const base = apiBaseUrl();
    logger.info("Minted AI token", { characterId, ownerUid: uid, tokenHashPrefix: hash.slice(0, 8) });
    return {
      token,
      expiresAt: expiresAt.toDate().toISOString(),
      baseUrl: base,
      characterId,
      characterName,
      ownerName,
      endpoints: endpointsFor(base, characterId),
    };
  },
);

// ---------------------------------------------------------------------------
// aiApi — the token-authenticated HTTP API.
// ---------------------------------------------------------------------------

/** Parse + validate the Bearer token, enforce the rate limit, return the doc. */
async function authenticate(req: Request): Promise<TokenDoc> {
  const header = req.header("authorization") || "";
  const m = /^Bearer\s+(.+)$/i.exec(header.trim());
  if (!m) {
    throw new ApiError(401, "unauthorized", "Missing 'Authorization: Bearer <token>' header.");
  }
  const hash = sha256(m[1].trim());
  const db = getFirestore();
  const ref = db.doc(`apiTokens/${hash}`);
  const snap = await ref.get();
  if (!snap.exists) {
    throw new ApiError(401, "unauthorized", "Invalid token.");
  }
  const data = snap.data() as TokenDoc;
  if (data.revokedAt) {
    throw new ApiError(401, "unauthorized", "Token has been revoked.");
  }
  const expMs = tsToMillis(data.expiresAt);
  if (expMs != null && expMs <= Date.now()) {
    await ref.delete().catch(() => {}); // opportunistic cleanup of the expired token.
    throw new ApiError(401, "unauthorized", "Token has expired.");
  }
  await enforceRateLimit(ref);
  return data;
}

/** Transactional per-token rate limit: rolling minute window + daily cap. */
async function enforceRateLimit(ref: FirebaseFirestore.DocumentReference): Promise<void> {
  const db = getFirestore();
  await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists) {
      throw new ApiError(401, "unauthorized", "Invalid token.");
    }
    const d = snap.data() ?? {};
    const now = Date.now();

    let winStart = tsToMillis(d.reqWindowStart) ?? 0;
    let winCount = typeof d.reqWindowCount === "number" ? d.reqWindowCount : 0;
    let dayStart = tsToMillis(d.reqDayStart) ?? 0;
    let dayCount = typeof d.reqDayCount === "number" ? d.reqDayCount : 0;

    if (now - winStart >= RATE_WINDOW_MS) {
      winStart = now;
      winCount = 0;
    }
    if (now - dayStart >= RATE_DAY_MS) {
      dayStart = now;
      dayCount = 0;
    }
    winCount += 1;
    dayCount += 1;

    if (winCount > RATE_MAX_PER_WINDOW) {
      throw new ApiError(429, "rate_limited", `Rate limit exceeded (${RATE_MAX_PER_WINDOW}/min).`);
    }
    if (dayCount > RATE_MAX_PER_DAY) {
      throw new ApiError(429, "rate_limited", `Daily request cap reached (${RATE_MAX_PER_DAY}/day).`);
    }

    tx.update(ref, {
      lastUsedAt: FieldValue.serverTimestamp(),
      reqCount: FieldValue.increment(1),
      reqWindowStart: Timestamp.fromMillis(winStart),
      reqWindowCount: winCount,
      reqDayStart: Timestamp.fromMillis(dayStart),
      reqDayCount: dayCount,
    });
  });
}

function whoami(token: TokenDoc): ApiResult {
  return {
    status: 200,
    json: {
      ownerName: token.ownerName,
      characterId: token.characterId,
      characterName: token.characterName,
      expiresAt: isoOf(token.expiresAt),
    },
  };
}

function assertBoundTo(token: TokenDoc, id: string): void {
  if (token.characterId !== id) {
    throw new ApiError(403, "forbidden", "This token is not bound to that character.");
  }
}

async function getSheet(token: TokenDoc, id: string): Promise<ApiResult> {
  assertBoundTo(token, id);
  const db = getFirestore();
  const snap = await db.doc(`characters/${id}`).get();
  if (!snap.exists) {
    throw new ApiError(404, "not_found", "Character not found.");
  }
  const c = snap.data() ?? {};
  const sheet = c.sheet && typeof c.sheet === "object" ? (c.sheet as SheetData) : {};
  return {
    status: 200,
    json: {
      characterId: id,
      ownerName: (typeof c.ownerName === "string" && c.ownerName) || token.ownerName || null,
      name: typeof c.name === "string" ? c.name : "",
      level: typeof c.level === "number" ? c.level : null,
      background: typeof c.background === "string" ? c.background : "",
      campaignId: c.campaignId ?? null,
      sheet,
      updatedAt: tsToMillis(c.updatedAt),
    },
  };
}

async function patchSheet(token: TokenDoc, id: string, req: Request): Promise<ApiResult> {
  assertBoundTo(token, id);
  const patch = validateFields(req.body);

  const db = getFirestore();
  const ref = db.doc(`characters/${id}`);
  const snap = await ref.get();
  if (!snap.exists) {
    throw new ApiError(404, "not_found", "Character not found.");
  }
  const c = snap.data() ?? {};
  const existingSheet = c.sheet && typeof c.sheet === "object" ? (c.sheet as SheetData) : {};
  const merged = applyPatch(existingSheet, patch);
  assertSizeUnderLimit(merged);

  // Per-field dotted paths — the server ALWAYS builds `sheet.<key>` from a
  // regex-validated key, never from raw input.
  const update: Record<string, unknown> = { updatedAt: Date.now() };
  const updated: string[] = [];
  for (const [k, v] of Object.entries(patch)) {
    update[`sheet.${k}`] = v === null ? FieldValue.delete() : v;
    updated.push(k);
  }
  // When a mirrored box (name/level/background) changed, re-derive the clamped
  // top-level trio from the resulting sheet — matches patchCharacterSheet.
  if (Object.keys(patch).some((k) => MIRROR_KEYS.includes(k))) {
    const mirror = sheetMirror(merged);
    update.name = mirror.name;
    update.level = mirror.level;
    update.background = mirror.background;
  }

  try {
    await ref.update(update); // update() (never set) — won't resurrect a deleted hunter.
  } catch (err) {
    // NOT_FOUND (code 5): the doc was deleted between the read and the update.
    if ((err as { code?: number }).code === 5) {
      throw new ApiError(404, "not_found", "Character not found.");
    }
    throw err;
  }
  return { status: 200, json: { ok: true, updated } };
}

function referenceHandler(req: Request): ApiResult {
  const headers = { "Cache-Control": "public, max-age=3600" };
  const section = typeof req.query.section === "string" ? req.query.section : "";
  if (!section) {
    return { status: 200, json: referenceIndex(), headers };
  }
  const data = referenceSection(section);
  if (data === undefined) {
    throw new ApiError(404, "not_found", `Unknown reference section '${section}'.`);
  }
  return { status: 200, json: { section, data }, headers };
}

async function handleRequest(req: Request): Promise<ApiResult> {
  const segments = req.path.split("/").filter(Boolean);
  if (segments[0] === "aiApi") segments.shift(); // tolerate an un-stripped prefix.
  const resource = segments[0] ?? "";
  const method = req.method;

  if (resource === "reference") {
    if (method !== "GET") throw new ApiError(405, "method_not_allowed", "Use GET.");
    await authenticate(req); // a valid token is enough — no character binding.
    return referenceHandler(req);
  }
  if (resource === "whoami") {
    if (method !== "GET") throw new ApiError(405, "method_not_allowed", "Use GET.");
    const token = await authenticate(req);
    return whoami(token);
  }
  if (resource === "character") {
    const id = segments[1];
    if (!id) throw new ApiError(404, "not_found", "A character id is required.");
    if (method !== "GET" && method !== "PATCH") {
      throw new ApiError(405, "method_not_allowed", "Use GET or PATCH.");
    }
    const token = await authenticate(req);
    return method === "GET" ? getSheet(token, id) : patchSheet(token, id, req);
  }
  throw new ApiError(404, "not_found", "Unknown endpoint.");
}

export const aiApi = onRequest({ region: REGION, maxInstances: 3 }, async (req, res) => {
  // CORS — the opaque token is the real gate, so any origin may call.
  res.set("Access-Control-Allow-Origin", "*");
  res.set("Access-Control-Allow-Methods", "GET, PATCH, OPTIONS");
  res.set("Access-Control-Allow-Headers", "Authorization, Content-Type");
  res.set("Vary", "Origin");
  if (req.method === "OPTIONS") {
    res.status(204).send("");
    return;
  }
  try {
    const result = await handleRequest(req);
    if (result.headers) {
      for (const [k, v] of Object.entries(result.headers)) res.set(k, v);
    }
    res.status(result.status).json(result.json);
  } catch (err) {
    if (err instanceof ApiError) {
      res.status(err.status).json({ error: { code: err.code, message: err.message } });
      return;
    }
    logger.error("aiApi internal error", { err: String(err) });
    res.status(500).json({ error: { code: "internal", message: "Internal error." } });
  }
});
