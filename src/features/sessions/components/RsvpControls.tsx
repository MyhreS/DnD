import { useAuthStore } from "@/features/auth/store/authStore";
import { useSessionRsvps } from "../hooks/useSessionRsvps";
import { setRsvp } from "@/api/rsvp";
import { AsyncButton } from "@/components/AsyncButton";
import type { RsvpStatus, SessionEvent } from "@/types";

const OPTIONS: { value: RsvpStatus; label: string; onClass: string }[] = [
  { value: "yes", label: "I'm in", onClass: "btn-yes-on" },
  { value: "no", label: "Can't", onClass: "btn-no-on" },
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
        {OPTIONS.map((o) => {
          const on = mine === o.value;
          return (
            <AsyncButton
              key={o.value}
              className={`btn-sm ${on ? o.onClass : "btn-ghost"}`}
              style={{ flex: 1 }}
              showDone={false}
              onClick={() => choose(o.value)}
            >
              {on ? `${o.value === "yes" ? "✓" : "✕"} ${o.label}` : o.label}
            </AsyncButton>
          );
        })}
      </div>
      {/* keyed on `mine` so it re-mounts and replays the flash each time the answer changes */}
      <p key={mine ?? "none"} className={`rsvp-status ${mine ? "rsvp-status-flash" : ""}`}>
        {mine === "yes" ? (
          <span className="rsvp-status-yes">You're in for this one.</span>
        ) : mine === "no" ? (
          <span className="rsvp-status-no">You're sitting this one out.</span>
        ) : (
          <span className="faint">Tap to let the party know.</span>
        )}
      </p>
      <p className="faint center" style={{ fontSize: "0.78rem", marginTop: 4, marginBottom: 0 }}>
        {counts.yes} in · {counts.no} out
      </p>
    </div>
  );
}
