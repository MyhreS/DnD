import { useAuthStore } from "@/features/auth/store/authStore";
import { useSessionRsvps } from "../hooks/useSessionRsvps";
import { setRsvp } from "@/api/rsvp";
import type { RsvpStatus, SessionEvent } from "@/types";

const OPTIONS: { value: RsvpStatus; label: string }[] = [
  { value: "yes", label: "I'm in" },
  { value: "no", label: "Can't" },
];

export function RsvpControls({ session }: { session: SessionEvent }) {
  const user = useAuthStore((s) => s.user);
  const rsvps = useSessionRsvps(session.id);

  const mine = rsvps.find((r) => r.uid === user?.uid)?.status ?? null;
  const counts = {
    yes: rsvps.filter((r) => r.status === "yes").length,
    no: rsvps.filter((r) => r.status === "no").length,
  };

  async function choose(status: RsvpStatus) {
    if (!user) return;
    await setRsvp(session.id, {
      uid: user.uid,
      name: user.displayName ?? user.email ?? "Hunter",
      email: user.email ?? "",
      status,
    });
  }

  return (
    <div>
      <p className="eyebrow" style={{ marginBottom: 8 }}>Will you answer the call?</p>
      <div className="btn-row">
        {OPTIONS.map((o) => (
          <button
            key={o.value}
            className={`btn btn-sm ${mine === o.value ? "btn-primary" : "btn-ghost"}`}
            style={{ flex: 1 }}
            onClick={() => void choose(o.value)}
          >
            {o.label}
          </button>
        ))}
      </div>
      <p className="faint center" style={{ fontSize: "0.78rem", marginTop: 8, marginBottom: 0 }}>
        {counts.yes} in · {counts.no} out
      </p>
    </div>
  );
}
