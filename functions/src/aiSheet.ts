// Pure helpers for the AI-help HTTP API: paper-sheet field validation, the
// size guard, and the denormalized name/level/background mirror.
//
// The mirror duplicates src/features/hunter/lib/papersheet.ts (sheetMirror) —
// functions/ is a standalone package and cannot import from src/, so the small
// clamping helper is copied here and MUST stay in sync with the frontend.

export type SheetValue = string | boolean;
export type SheetData = Record<string, SheetValue>;

/** A PATCH body's field map: string/boolean set a key, null deletes it. */
export type FieldPatch = Record<string, string | boolean | null>;

// --- Guardrail limits (mirrored in the PR description) ----------------------
export const KEY_RE = /^[a-zA-Z][a-zA-Z0-9_]{0,39}$/;
export const MAX_VALUE_LEN = 2000;
export const MAX_KEYS = 50;
export const MAX_DOC_BYTES = 800 * 1024; // ~800KB — keep well under Firestore's 1MiB.

/** Sheet boxes mirrored to top-level card fields (see sheetMirror). */
export const MIRROR_KEYS: readonly string[] = ["name", "level", "background"];

/** A typed API error carrying the HTTP status + machine code to return. */
export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

/** Card fields mirrored from the free-form sheet (name/level/background), with
 * the SAME clamping as the frontend's sheetMirror (level 1..20, trimmed text).
 * Keep in sync with src/features/hunter/lib/papersheet.ts. */
export function sheetMirror(sheet: SheetData): { name: string; level: number; background: string } {
  const name = typeof sheet.name === "string" ? sheet.name.trim() : "";
  const parsed = typeof sheet.level === "string" ? parseInt(sheet.level, 10) : NaN;
  const level = Number.isFinite(parsed) ? Math.max(1, Math.min(20, parsed)) : 1;
  const background = typeof sheet.background === "string" ? sheet.background.trim() : "";
  return { name, level, background };
}

/** Validate a PATCH body `{ fields: { key: string|boolean|null } }`. Throws an
 * ApiError (400/422) on any violation; returns the clean field map otherwise.
 * Keys are validated against KEY_RE so the server can safely build the Firestore
 * path as `sheet.<key>` (never from raw input — no dots, slashes or __proto__). */
export function validateFields(body: unknown): FieldPatch {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    throw new ApiError(400, "bad_request", "Request body must be a JSON object.");
  }
  const fields = (body as { fields?: unknown }).fields;
  if (!fields || typeof fields !== "object" || Array.isArray(fields)) {
    throw new ApiError(422, "invalid_fields", "Body must include a 'fields' object.");
  }
  const entries = Object.entries(fields as Record<string, unknown>);
  if (entries.length < 1) {
    throw new ApiError(422, "no_fields", "Provide at least one field to update.");
  }
  if (entries.length > MAX_KEYS) {
    throw new ApiError(422, "too_many_fields", `At most ${MAX_KEYS} fields per request.`);
  }
  const out: FieldPatch = {};
  for (const [key, value] of entries) {
    if (!KEY_RE.test(key)) {
      throw new ApiError(
        422,
        "invalid_key",
        `Invalid field key '${key}': must match ^[a-zA-Z][a-zA-Z0-9_]{0,39}$.`,
      );
    }
    if (value === null || typeof value === "boolean") {
      out[key] = value;
    } else if (typeof value === "string") {
      if (value.length > MAX_VALUE_LEN) {
        throw new ApiError(422, "value_too_long", `Field '${key}' exceeds ${MAX_VALUE_LEN} characters.`);
      }
      out[key] = value;
    } else {
      throw new ApiError(422, "invalid_value", `Field '${key}' must be a string, boolean, or null.`);
    }
  }
  return out;
}

/** Apply a validated patch to a copy of the sheet (null deletes the key). */
export function applyPatch(sheet: SheetData, patch: FieldPatch): SheetData {
  const merged: SheetData = { ...sheet };
  for (const [k, v] of Object.entries(patch)) {
    if (v === null) delete merged[k];
    else merged[k] = v;
  }
  return merged;
}

/** Reject a patch whose resulting sheet would push the doc past MAX_DOC_BYTES. */
export function assertSizeUnderLimit(mergedSheet: SheetData): void {
  const bytes = Buffer.byteLength(JSON.stringify(mergedSheet), "utf8");
  if (bytes > MAX_DOC_BYTES) {
    throw new ApiError(413, "payload_too_large", `Sheet would exceed ${Math.floor(MAX_DOC_BYTES / 1024)}KB.`);
  }
}
