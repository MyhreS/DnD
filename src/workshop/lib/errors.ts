type CodedError = { code?: unknown; message?: unknown };

export function workshopErrorMessage(failure: unknown, fallback: string): string {
  const error = failure as CodedError;
  const code = String(error?.code ?? "");
  if (code.includes("resource-exhausted")) return "Too many updates at once. Wait a minute and try again.";
  if (code.includes("unavailable") || code.includes("network-request-failed") || code.includes("retry-limit-exceeded")) {
    return "The connection was interrupted. Your draft is saved—try again when you are online.";
  }
  if (code.includes("unauthenticated")) return "Your sign-in expired. Refresh the page and sign in again.";
  if (code.includes("permission-denied") || code.includes("unauthorized")) return "Your Workshop access needs refreshing. Reload the page and try again.";
  if (code.includes("invalid-argument")) return typeof error?.message === "string" ? error.message : fallback;
  if (code.includes("not-found")) return "This request no longer exists.";
  return fallback;
}
