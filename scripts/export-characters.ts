/**
 * Read-only export of the `/characters` collection to a JSON file.
 *
 * This exists to satisfy the backup precondition of
 * `migrate:stored-characters --apply`, which refuses to write unless a JSON
 * export covering every affected document is on disk. It never writes to
 * Firestore.
 *
 * Usage:
 *   bun run export:characters -- --out=<file.json>
 */
import { writeFileSync } from "node:fs";

async function main(): Promise<void> {
  const outArg = process.argv.slice(2).find((arg) => arg.startsWith("--out="));
  const out = outArg ? outArg.slice("--out=".length) : `characters-backup-${new Date().toISOString().replace(/[:.]/g, "-")}.json`;

  const serviceAccount = process.env.AGENT_TEST_SA;
  if (!serviceAccount) throw new Error("Missing AGENT_TEST_SA. Run this through Doppler.");
  const credentials = JSON.parse(serviceAccount);

  const { cert, getApps, initializeApp } = await import("firebase-admin/app");
  const { getFirestore } = await import("firebase-admin/firestore");
  const app = getApps()[0] ?? initializeApp({ credential: cert(credentials), projectId: credentials.project_id });
  const db = getFirestore(app);

  const snapshot = await db.collection("characters").get();
  // Shape matters: `assertBackupCovers` reads either an array of `{ id, ... }`
  // rows or a top-level object keyed by document id. Anything wrapped in
  // metadata would make the coverage check read the wrapper's keys instead.
  const docs = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

  writeFileSync(out, JSON.stringify(docs, null, 2));
  console.log(`Exported ${snapshot.size} character document(s) to ${out}`);
}

if (import.meta.main) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
