import { createHash, randomBytes, scrypt as derive, timingSafeEqual } from "node:crypto";
const scrypt = (password: string, salt: string) => new Promise<Buffer>((resolve, reject) => {
  derive(password, salt, 64, { N: 131072, r: 8, p: 1, maxmem: 192 * 1024 * 1024 }, (error, bytes) => error ? reject(error) : resolve(bytes));
});
export type Grant = { uid: string; email: string; role: "gm" | "admin"; enabled: boolean; sessionVersion: string };
export type Identity = { uid: string; email?: string; email_verified?: boolean; firebase?: { sign_in_provider?: string }; auth_time?: number };
export type Account = { uid: string; email?: string; emailVerified: boolean; disabled: boolean; providerData: Array<{providerId: string; email?: string}>; tokensValidAfterTime?: string };
export type Password = { salt: string; hash: string; version: string };
export const SESSION_MS = 8 * 60 * 60 * 1000;
const email = (value: string | undefined) => value?.trim().toLowerCase();
export function permits(token: Identity, user: Account, grant: Partial<Grant> | undefined): grant is Grant {
  const address = email(token.email);
  const revokedAt = user.tokensValidAfterTime ? Date.parse(user.tokensValidAfterTime) : 0;
  return !!(grant?.enabled === true && ["gm", "admin"].includes(grant.role ?? "")
    && grant.sessionVersion && grant.uid === token.uid && user.uid === token.uid
    && address && email(grant.email) === address && email(user.email) === address
    && token.email_verified === true && user.emailVerified && !user.disabled
    && token.firebase?.sign_in_provider === "google.com"
    && user.providerData.some(p => p.providerId === "google.com" && email(p.email) === address)
    && Number.isFinite(token.auth_time) && token.auth_time! * 1000 >= revokedAt);
}
export function validPassword(value: unknown): value is string {
  return typeof value === "string" && value.length >= 12 && Buffer.byteLength(value, "utf8") <= 256;
}
export async function hashPassword(password: string): Promise<Password> {
  if (!validPassword(password)) throw new Error("Invalid password");
  const salt = randomBytes(32).toString("hex");
  const hash = await scrypt(password, salt);
  return { salt, hash: hash.toString("hex"), version: randomBytes(24).toString("hex") };
}
export async function passwordMatches(password: unknown, stored: Password): Promise<boolean> {
  if (!validPassword(password) || !/^[a-f0-9]{64}$/.test(stored.salt) || !/^[a-f0-9]{128}$/.test(stored.hash)) return false;
  const actual = await scrypt(password, stored.salt);
  return timingSafeEqual(actual, Buffer.from(stored.hash, "hex"));
}
export const tokenHash = (value: string) => createHash("sha256").update(value).digest("hex");
export function readCookie(raw: string | undefined): { firebase: string; proof: string } | null {
  try {
    const cookie = raw?.split(";").map(c => c.trim()).find(c => c.startsWith("__session="))?.slice(10);
    if (!cookie || cookie.length > 6000 || !/^[\w-]+$/.test(cookie)) return null;
    const data: unknown = JSON.parse(Buffer.from(cookie, "base64url").toString());
    if (!data || typeof data !== "object") return null;
    const { firebase, proof } = data as Record<string, unknown>;
    return typeof firebase === "string" && firebase.length < 4000 && typeof proof === "string" && /^[a-f0-9]{64}$/.test(proof) ? { firebase, proof } : null;
  } catch { return null; }
}
export function privatePath(raw: string): string | null {
  try {
    if (!raw.startsWith("/app/") || /[?%\\]/.test(raw)) return null;
    let path = raw.slice(5);
    if (!path || path.endsWith("/")) path += "index.html";
    if (!/^[a-zA-Z0-9_./-]+$/.test(path) || path.split("/").some(p => !p || p.startsWith("."))) return null;
    return path;
  } catch { return null; }
}
