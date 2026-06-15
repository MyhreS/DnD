import type { SessionEvent } from "@/types";

// Seed sessions — used to populate Firestore the first time. After that, the
// schedule lives in the `sessions` collection and the DM/admin edits it in-app.
// Dates are local time, format: "YYYY-MM-DDTHH:mm:ss".
export const SEED_SESSIONS: Omit<SessionEvent, "id">[] = [
  {
    date: "2026-06-20T18:00:00",
    title: "Session 1 — The First Night of the Hunt",
    location: "Simon's place",
    notes:
      "Bring your hunter card! Snacks and dice provided. We'll do a quick rules primer before we begin.",
  },
  {
    date: "2026-07-04T18:00:00",
    title: "Session 2",
    location: "TBD",
  },
  {
    date: "2026-07-18T18:00:00",
    title: "Session 3",
    location: "TBD",
  },
];

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

/** All sessions, soonest first (includes past). */
export function sortAll(sessions: SessionEvent[]): SessionEvent[] {
  return [...sessions].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
  );
}
