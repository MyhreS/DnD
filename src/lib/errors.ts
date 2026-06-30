/** Turn a thrown error (usually a Firebase FirestoreError) into a short, honest
 * reason a user can act on — so a blocked action explains WHY, not just "failed".
 */
export function describeError(err: unknown): string {
  const code = (err as { code?: string } | null)?.code ?? "";
  const message = (err as { message?: string } | null)?.message ?? "";
  switch (code.replace(/^firestore\//, "")) {
    case "permission-denied":
      return "you don't have permission — only the campaign's DM can do this, and only for hunters in this campaign.";
    case "unauthenticated":
      return "you're signed out — sign in again.";
    case "unavailable":
      return "the network is unavailable — check your connection and try again.";
    case "not-found":
      return "it no longer exists (it may have been removed).";
    case "already-exists":
      return "it already exists.";
    case "failed-precondition":
      return message || "the operation isn't allowed in the current state.";
    default:
      return message ? message.replace(/^FirebaseError:\s*/i, "") : "an unexpected error occurred.";
  }
}

/** "<fallback> — <reason>." for surfacing in an error banner. */
export function explain(fallback: string, err: unknown): string {
  return `${fallback} — ${describeError(err)}`;
}
