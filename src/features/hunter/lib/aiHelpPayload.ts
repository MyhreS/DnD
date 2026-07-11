import type { AiTokenGrant } from "@/api/aiHelp";

// Builds the paste-ready plain-text briefing the "Get help from AI" button puts
// on the clipboard: who's asking, which character, the API surface + token.
// Pure — no imports from stores; the caller supplies the user's display name.

/** Human-readable local expiry, e.g. "12 July 2026, 14:03". */
function localExpiry(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString(undefined, {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** The full clipboard payload for one freshly-minted grant. Plain text — no
 * markdown headers — so any AI chat can consume it as-is. The token appears
 * ONLY here (memory + clipboard); never log it. */
export function buildAiHelpPayload(grant: AiTokenGrant, userName: string): string {
  const who = userName.trim() || grant.ownerName || "the player";
  const character = grant.characterName.trim() || "an unnamed hunter";
  const e = grant.endpoints;
  return [
    `You are helping ${who} with their character "${character}" for Catacombs & Starspawns, a Bloodborne-flavoured dark-fantasy tabletop homebrew. You have API access scoped to ONLY this one character (id: ${grant.characterId}).`,
    ``,
    `API — send header "Authorization: Bearer <token>" with every request:`,
    `- GET ${e.whoami} — confirms who and which character the token is for.`,
    `- GET ${e.sheet} — reads the full character sheet.`,
    `- PATCH ${e.sheet} — updates sheet fields; JSON body: { "fields": { "<key>": <value> } }.`,
    `- GET ${e.reference} — the game-rules reference index; add ?section=<id> for one section's content.`,
    ``,
    `The sheet is a free-form map of box keys to values: text boxes are strings, checkboxes are booleans, and patching a key to null clears it. GET the sheet first to see which keys are in use, then PATCH only the keys you mean to change.`,
    ``,
    `Bearer token: ${grant.token}`,
    `Token expires: ${localExpiry(grant.expiresAt)} (24 hours after creation).`,
    ``,
    `Safety: this token can read and edit ONLY this one character — nothing else in the app. It expires automatically after 24 hours, and the player can revoke it at any time by generating a new AI link from the character sheet.`,
  ].join("\n");
}
