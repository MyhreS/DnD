import { httpsCallable } from "firebase/functions";
import { functions } from "@/lib/firebase";

// Client wrapper for the "Get help from AI" backend (functions/src/aiHelp.ts).
// Mints a fresh, character-scoped, 24h opaque bearer token that an AI assistant
// uses against the aiApi HTTP endpoints. Minting is owner-only and revokes any
// previous token for the character (single active token). No UI wires this yet.

/** Full HTTP URLs the AI should call (returned by the mint callable). */
export interface AiTokenEndpoints {
  whoami: string;
  sheet: string;
  reference: string;
}

/** The result of minting a token — hand `token` + `endpoints` to the assistant. */
export interface AiTokenGrant {
  token: string;
  expiresAt: string; // ISO-8601
  baseUrl: string;
  characterId: string;
  characterName: string;
  ownerName: string;
  endpoints: AiTokenEndpoints;
}

const mintFn = httpsCallable<{ characterId: string }, AiTokenGrant>(
  functions,
  "mintCharacterAiToken",
);

/** Owner-only — mint a fresh 24h AI-help token for one of your characters
 * (revokes any prior token for it). Throws if you don't own the character. */
export async function mintCharacterAiToken(characterId: string): Promise<AiTokenGrant> {
  const res = await mintFn({ characterId });
  return res.data;
}
