import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getFirestore, type DocumentData, type Firestore } from "firebase-admin/firestore";

const serviceAccount = process.env.AGENT_TEST_SA;
if (!serviceAccount) throw new Error("Missing AGENT_TEST_SA. Run this migration through Doppler.");
const credentials = JSON.parse(serviceAccount);
const app = getApps()[0] ?? initializeApp({ credential: cert(credentials), projectId: credentials.project_id });
const db = getFirestore(app);

function playerProjection(data: DocumentData): DocumentData {
  const monster = data.kind === "monster";
  const revealHp = !monster || data.revealHp === true;
  const revealStats = !monster || data.revealStats === true;
  return {
    kind: data.kind ?? "monster",
    name: data.name ?? "Combatant",
    characterId: data.characterId ?? null,
    initiative: Number(data.initiative) || 0,
    ac: revealStats ? data.ac ?? null : null,
    maxHp: revealHp ? data.maxHp ?? null : null,
    currentHp: revealHp ? data.currentHp ?? null : null,
    conditions: Array.isArray(data.conditions) ? data.conditions : [],
    conditionSince: data.conditionSince && typeof data.conditionSince === "object" ? data.conditionSince : {},
    note: revealStats ? data.note ?? null : null,
    revealHp: data.revealHp === true,
    revealStats: data.revealStats === true,
    createdAt: data.createdAt ?? Date.now(),
  };
}

async function commitRows(firestore: Firestore, rows: Array<{ path: string; data: DocumentData }>) {
  for (let index = 0; index < rows.length; index += 400) {
    const batch = firestore.batch();
    rows.slice(index, index + 400).forEach((row) => batch.set(firestore.doc(row.path), row.data));
    await batch.commit();
  }
}

const games = await db.collection("games").get();
const rows: Array<{ path: string; data: DocumentData }> = [];
for (const game of games.docs) {
  const combatants = await game.ref.collection("combatants").get();
  combatants.docs.forEach((combatant) => rows.push({
    path: `games/${game.id}/battleView/${combatant.id}`,
    data: playerProjection(combatant.data()),
  }));
}
await commitRows(db, rows);
console.log(`Battle view migration complete: ${rows.length} combatants across ${games.size} games.`);
