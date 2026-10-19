import { getApps, initializeApp } from "firebase-admin/app";
import { getAuth, type DecodedIdToken } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { permits, readCookie, tokenHash, type Grant, type Password } from "./policy";
if (!getApps().length) initializeApp();
export class AccessDenied extends Error {}
export const db = () => getFirestore();
export type Settings = { enabled: boolean; origin: string; label: string; release: string; networkSalt: string };
export async function settings(): Promise<Settings> {
  const value = (await db().doc("privateWorkspaceSettings/current").get()).data();
  if (value?.enabled !== true || typeof value.origin !== "string" || !/^https:\/\/[a-z0-9.-]+\.(web|run)\.app$/.test(value.origin)
    || typeof value.label !== "string" || value.label.length > 80 || typeof value.release !== "string" || !/^[a-f0-9]{64}$/.test(value.release)
    || typeof value.networkSalt !== "string" || !/^[a-f0-9]{64}$/.test(value.networkSalt)) throw new Error("Unavailable");
  return value as Settings;
}
export async function authorize(token: DecodedIdToken) {
  const [account, snapshot] = await Promise.all([getAuth().getUser(token.uid), db().doc(`privateWorkspaceGrants/${token.uid}`).get()]);
  const grant = snapshot.data() as Grant | undefined;
  if (!permits(token, account, grant)) throw new AccessDenied("Unavailable");
  return { token, grant };
}
export async function bearer(header: string | undefined) {
  if (!header?.startsWith("Bearer ") || header.length > 6000) throw new Error("Unavailable");
  return authorize(await getAuth().verifyIdToken(header.slice(7), true));
}
export async function session(cookie: string | undefined) {
  const value = readCookie(cookie);
  if (!value) throw new Error("Unavailable");
  const identity = await authorize(await getAuth().verifySessionCookie(value.firebase, true));
  const [proof, password] = await Promise.all([
    db().doc(`privateWorkspaceSessions/${tokenHash(value.proof)}`).get(),
    db().doc(`privateWorkspacePasswords/${identity.token.uid}`).get(),
  ]);
  const p = proof.data(); const secret = password.data() as Password | undefined;
  if (!p || !secret || p.uid !== identity.token.uid || p.expiresAt <= Date.now()
    || p.passwordVersion !== secret.version || p.sessionVersion !== identity.grant.sessionVersion) throw new Error("Unavailable");
  return identity;
}
export async function forget(cookie: string | undefined) {
  const value = readCookie(cookie);
  if (value) await db().doc(`privateWorkspaceSessions/${tokenHash(value.proof)}`).delete();
}
