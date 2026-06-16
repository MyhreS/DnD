import { signInWithCustomToken } from "firebase/auth";
import { auth } from "@/lib/firebase";

// DEV-ONLY real sign-in for automated testing. Exchanges a Firebase custom token
// (minted by scripts/mint-test-token.mjs via the agent-test service account) for
// a real session, so the agent can test authenticated screens with real data and
// security rules — unlike `?preview=` which only renders the UI.
//
//   bun run dev  →  open  http://localhost:5173/?testToken=<token>   (?testToken=off clears)
//
// Guarded by import.meta.env.DEV, so this code is stripped from production builds.
const KEY = "cs-test-token";

function readToken(): string | null {
  if (!import.meta.env.DEV) return null;
  const param = new URLSearchParams(window.location.search).get("testToken");
  if (param === "off") {
    localStorage.removeItem(KEY);
    return null;
  }
  if (param) {
    localStorage.setItem(KEY, param);
    return param;
  }
  return localStorage.getItem(KEY);
}

export async function maybeTestLogin(): Promise<void> {
  const token = readToken();
  if (!token || auth.currentUser) return;
  try {
    await signInWithCustomToken(auth, token);
  } catch (err) {
    console.error("[test-login] failed — token may have expired; re-mint it", err);
    localStorage.removeItem(KEY);
  }
}
