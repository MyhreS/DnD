import { randomBytes } from "node:crypto";
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { AccessDenied, authorize, db, settings } from "./auth";
import type { DecodedIdToken } from "firebase-admin/auth";
export const getPrivateWorkspaceAccess = onCall({ region: "europe-west1" }, async request => {
  if (!request.auth) return { available: false as const };
  try {
    await authorize(request.auth.token as DecodedIdToken);
    const config = await settings();
    return { available: true as const, label: config.label, url: config.origin };
  } catch { return { available: false as const }; }
});
export const revokePrivateWorkspaceSessions = onCall({ region: "europe-west1" }, async request => {
  if (!request.auth) throw new HttpsError("unauthenticated", "Sign in required.");
  try {
    const { token } = await authorize(request.auth.token as DecodedIdToken);
    await db().doc(`privateWorkspaceGrants/${token.uid}`).update({ sessionVersion: randomBytes(24).toString("hex") });
  } catch(error) {
    if (!(error instanceof AccessDenied)) throw new HttpsError("unavailable", "Could not lock the workspace. Try again.");
  }
  return { ok: true };
});
