import type { SessionEvent } from "@/types";

// The schedule lives in the Firestore `sessions` collection (the DM/admin edits
// it in-app). These helpers operate on a loaded list.

function startOfToday(now: Date): number {
  return new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
}

/** Future (or today's) sessions, soonest first. */
export function sortUpcoming(
  sessions: SessionEvent[],
  now: Date = new Date(),
): SessionEvent[] {
  const floor = startOfToday(now);
  return [...sessions]
    .filter((s) => new Date(s.date).getTime() >= floor)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
}
