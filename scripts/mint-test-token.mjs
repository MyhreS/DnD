// Mint a Firebase custom token for an agent test user, so the agent can sign in
// to a REAL session (real Firestore + rules) and test authenticated screens.
//
//   doppler run -- bun run scripts/mint-test-token.mjs [player|player2|admin|dm]
//
// Reads the service-account JSON from the AGENT_TEST_SA env var (in Doppler).
// Ensures the test Auth user + allowlist entry exist, then prints a custom token.
// The app's DEV-only test login (`?testToken=<token>`) exchanges it for a session.
import { initializeApp, cert } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

const sa = process.env.AGENT_TEST_SA;
if (!sa) {
  console.error("Missing AGENT_TEST_SA. Run via: doppler run -- bun run scripts/mint-test-token.mjs");
  process.exit(1);
}

const ROLES = {
  player: { uid: "agent-player", email: "agent-player@dandd-ea955.web.app", firstName: "Agent", lastName: "Player", accessRole: "user", playerType: "player" },
  player2: { uid: "agent-player2", email: "agent-player2@dandd-ea955.web.app", firstName: "Agent", lastName: "Player Two", accessRole: "user", playerType: "player" },
  admin: { uid: "agent-admin", email: "agent-admin@dandd-ea955.web.app", firstName: "Agent", lastName: "Admin", accessRole: "admin", playerType: "player" },
  dm: { uid: "agent-dm", email: "agent-dm@dandd-ea955.web.app", firstName: "Agent", lastName: "Dungeon", accessRole: "moderator", playerType: "dm" },
};

const role = process.argv[2] ?? "player";
const t = ROLES[role];
if (!t) {
  console.error(`Unknown role "${role}". Use: player | player2 | admin | dm`);
  process.exit(1);
}

const app = initializeApp({ credential: cert(JSON.parse(sa)) });
const auth = getAuth(app);
const db = getFirestore(app);

// Ensure the Auth user (with a verified email, required by the rules).
try {
  await auth.getUser(t.uid);
} catch {
  await auth.createUser({
    uid: t.uid,
    email: t.email,
    emailVerified: true,
    displayName: `${t.firstName} ${t.lastName}`,
  });
}

// Ensure the allowlist entry (doc id = lowercase email, matching the app).
await db.doc(`allowlist/${t.email.toLowerCase()}`).set(
  {
    email: t.email.toLowerCase(),
    firstName: t.firstName,
    lastName: t.lastName,
    accessRole: t.accessRole,
    playerType: t.playerType,
    addedBy: "agent-test",
    addedAt: Date.now(),
  },
  { merge: true },
);

const token = await auth.createCustomToken(t.uid);
// Print ONLY the token on stdout so callers can capture it.
process.stdout.write(token + "\n");
process.exit(0);
