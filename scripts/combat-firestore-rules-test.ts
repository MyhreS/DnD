import fs from "node:fs";
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
} from "@firebase/rules-unit-testing";
import { deleteDoc, doc, getDoc, onSnapshot, setDoc } from "firebase/firestore";
import type { CombatSession } from "../src/features/combat/types";

const projectId = "demo-dnd-combat";
const testEnv = await initializeTestEnvironment({
  projectId,
  firestore: { rules: fs.readFileSync("firestore.rules", "utf8") },
});

const session = (updatedAt = 1): CombatSession => ({
  title: "The Moon Hunt",
  combatants: [],
  round: 0,
  activeCombatantId: null,
  designatedWardenId: null,
  turnDurationSeconds: 90,
  timerPhase: "idle",
  timerEndsAt: null,
  pausedRemainingMs: null,
  started: false,
  updatedAt,
});

const auth = (email: string) => ({ email, email_verified: true });
const member = (email: string, accessRole: string, playerType: string) => ({
  email,
  firstName: email.split("@")[0],
  lastName: "Test",
  accessRole,
  playerType,
  addedBy: "rules-test",
  addedAt: 1,
});

try {
  await testEnv.withSecurityRulesDisabled(async (context) => {
    const database = context.firestore();
    await Promise.all([
      setDoc(doc(database, "allowlist", "player@example.com"), member("player@example.com", "user", "player")),
      setDoc(doc(database, "allowlist", "moderator@example.com"), member("moderator@example.com", "moderator", "player")),
      setDoc(doc(database, "allowlist", "dm@example.com"), member("dm@example.com", "user", "dm")),
    ]);
  });

  const playerDb = testEnv.authenticatedContext("player", auth("player@example.com")).firestore();
  const moderatorDb = testEnv.authenticatedContext("moderator", auth("moderator@example.com")).firestore();
  const dmDb = testEnv.authenticatedContext("dm", auth("dm@example.com")).firestore();
  const outsiderDb = testEnv.authenticatedContext("outsider", auth("outsider@example.com")).firestore();
  const anonymousDb = testEnv.unauthenticatedContext().firestore();
  const playerActive = doc(playerDb, "combat", "active");
  const moderatorActive = doc(moderatorDb, "combat", "active");
  const dmActive = doc(dmDb, "combat", "active");
  const outsiderActive = doc(outsiderDb, "combat", "active");
  const anonymousActive = doc(anonymousDb, "combat", "active");

  await assertSucceeds(setDoc(moderatorActive, session()));
  await assertSucceeds(getDoc(playerActive));
  await assertFails(getDoc(outsiderActive));
  await assertFails(getDoc(anonymousActive));
  await assertFails(setDoc(playerActive, session(2)));
  await assertSucceeds(setDoc(dmActive, session(3)));

  await assertFails(setDoc(moderatorActive, { ...session(4), turnDurationSeconds: 60 }));
  await assertFails(setDoc(moderatorActive, { ...session(5), unexpected: true }));
  await assertFails(setDoc(doc(moderatorDb, "combat", "other"), session(5)));

  const receivedTitle = new Promise<string>((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error("Realtime combat snapshot timed out")), 5_000);
    let unsubscribe = () => {};
    unsubscribe = onSnapshot(playerActive, (snapshot) => {
      if (snapshot.data()?.title !== "Live on another device") return;
      clearTimeout(timeout);
      unsubscribe();
      resolve(snapshot.data()?.title as string);
    }, reject);
  });
  await assertSucceeds(setDoc(moderatorActive, { ...session(6), title: "Live on another device" }));
  if (await receivedTitle !== "Live on another device") throw new Error("Realtime sync returned wrong data");

  await assertSucceeds(deleteDoc(dmActive));
  console.log("Firestore combat rules and cross-client realtime tests passed");
} finally {
  await testEnv.cleanup();
}
