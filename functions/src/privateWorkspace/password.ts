import { randomBytes } from "node:crypto";
import { getAuth } from "firebase-admin/auth";
import { db } from "./auth";
import { hashPassword, passwordMatches, SESSION_MS, tokenHash, validPassword, type Password } from "./policy";
import type { DecodedIdToken } from "firebase-admin/auth";
import type { Grant } from "./policy";
export async function unlock(idToken: string, token: DecodedIdToken, grant: Grant, password: unknown, create: boolean): Promise<string> {
  const rate = db().doc(`privateWorkspaceAttempts/${token.uid}`);
  await db().runTransaction(async transaction => {
    const previous = (await transaction.get(rate)).data();
    const reset = !previous || previous.until < Date.now();
    const count = reset ? 0 : Number(previous.count);
    if (!Number.isFinite(count) || count >= 10) throw new Error("Unavailable");
    transaction.set(rate, { count: count + 1, until: reset ? Date.now() + 15 * 60 * 1000 : previous!.until });
  });
  const ref = db().doc(`privateWorkspacePasswords/${token.uid}`);
  const stored = (await ref.get()).data() as Password | undefined;
  let secret = stored;
  if (create && !stored && validPassword(password) && Date.now() - token.auth_time * 1000 < 5 * 60 * 1000) {
    secret = await hashPassword(password);
    await ref.create(secret);
  } else if (create || !stored || !(await passwordMatches(password, stored))) throw new Error("Unavailable");
  if (!secret) throw new Error("Unavailable");
  const firebase = await getAuth().createSessionCookie(idToken, { expiresIn: SESSION_MS });
  const proof = randomBytes(32).toString("hex");
  await db().doc(`privateWorkspaceSessions/${tokenHash(proof)}`).create({ uid: token.uid, passwordVersion: secret.version, sessionVersion: grant.sessionVersion, expiresAt: Date.now() + SESSION_MS });
  await rate.delete();
  return Buffer.from(JSON.stringify({ firebase, proof })).toString("base64url");
}
