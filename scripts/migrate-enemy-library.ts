import { createHash } from "node:crypto";
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getFirestore, type DocumentData, type Firestore, type WriteBatch } from "firebase-admin/firestore";

const serviceAccount = process.env.AGENT_TEST_SA;
if (!serviceAccount) throw new Error("Missing AGENT_TEST_SA. Run this migration through Doppler.");
const credentials = JSON.parse(serviceAccount);
const app = getApps()[0] ?? initializeApp({ credential: cert(credentials), projectId: credentials.project_id });
const db = getFirestore(app);

function baseStats(data: DocumentData) {
  if (data.baseStats && typeof data.baseStats === "object") return data.baseStats;
  return {
    name: String(data.name ?? "Enemy"),
    initiative: Number(data.initiative ?? 0),
    ac: typeof data.ac === "number" ? data.ac : null,
    maxHp: Math.max(1, Number(data.maxHp ?? 1)),
    note: typeof data.note === "string" ? data.note : null,
    revealHp: data.revealHp === true,
    revealStats: data.revealStats === true,
  };
}

function templateId(stats: ReturnType<typeof baseStats>): string {
  const signature = JSON.stringify(stats);
  return `legacy-${createHash("sha256").update(signature).digest("hex").slice(0, 24)}`;
}

async function commitRows(firestore: Firestore, rows: Array<(batch: WriteBatch) => void>) {
  for (let index = 0; index < rows.length; index += 400) {
    const batch = firestore.batch();
    rows.slice(index, index + 400).forEach((write) => write(batch));
    await batch.commit();
  }
}

const games = await db.collection("games").get();
const writes: Array<(batch: WriteBatch) => void> = [];
const templatePaths = new Set<string>();
let monsters = 0;

for (const game of games.docs) {
  const dmUid = String(game.data().dmUid ?? "");
  if (!dmUid) continue;
  const combatants = await game.ref.collection("combatants").get();
  combatants.docs.filter((combatant) => combatant.data().kind === "monster").forEach((combatant) => {
    monsters += 1;
    const data = combatant.data();
    // New combatants already point at a user-managed template. Never overwrite
    // that template with this battle's older immutable reset snapshot.
    if (data.enemyTemplateId) return;
    const stats = baseStats(data);
    const id = templateId(stats);
    const path = `users/${dmUid}/enemies/${id}`;
    if (!templatePaths.has(path)) {
      templatePaths.add(path);
      writes.push((batch) => {
        batch.set(db.doc(path), {
          ...stats,
          createdAt: data.createdAt ?? Date.now(),
          updatedAt: Date.now(),
        }, { merge: true });
      });
    }
    writes.push((batch) => {
      batch.update(combatant.ref, { enemyTemplateId: id, baseStats: stats });
    });
  });
}

await commitRows(db, writes);
console.log(`Enemy library migration complete: ${templatePaths.size} reusable enemies from ${monsters} saved combatants.`);
