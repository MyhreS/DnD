import { createHmac } from "node:crypto";
import { db, type Settings } from "./auth";

// Use the platform's client address, never an untrusted header or a raw address in storage.
export async function networkAttempt(config: Settings, address: string | undefined) {
  if (!address || address.length > 100) throw new Error("Unavailable");
  const key = createHmac("sha256", config.networkSalt).update(address).digest("hex");
  const ref = db().doc(`privateWorkspaceNetworkAttempts/${key}`);
  await db().runTransaction(async transaction => {
    const previous = (await transaction.get(ref)).data();
    const reset = !previous || previous.until < Date.now();
    const count = reset ? 0 : Number(previous.count);
    if (!Number.isFinite(count) || count >= 60) throw new Error("Unavailable");
    transaction.set(ref, { count: count + 1, until: reset ? Date.now() + 15 * 60 * 1000 : previous!.until });
  });
}
