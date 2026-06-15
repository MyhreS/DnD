import { useMemo } from "react";
import { useAuthStore } from "@/features/auth/store/authStore";
import { useSessionStore } from "@/features/sessions/store/sessionStore";
import { useSessionsLive } from "@/features/sessions/hooks/useSessionsLive";
import { sortUpcoming } from "@/data/sessions";
import { usePartyData } from "../hooks/usePartyData";
import { HunterRow } from "./HunterRow";
import { RosterPanel } from "./RosterPanel";
import { HunterCardView } from "@/features/hunter/components/HunterCardView";
import { CardSkeleton } from "@/components/Skeleton";
import { usePrint } from "@/hooks/common/usePrint";

export function PartyPage() {
  // "Staff" can export everyone's sheets; matches admin + DM (and moderators).
  const canExport = useAuthStore((s) => s.caps.oversight);
  const oversight = canExport;
  const canEmail = useAuthStore((s) => s.caps.email);

  useSessionsLive();
  const sessions = useSessionStore((s) => s.sessions);
  const nextSession = useMemo(() => sortUpcoming(sessions)[0], [sessions]);

  const { players, members, rsvps, error } = usePartyData({
    oversight,
    sessionId: nextSession?.id,
  });

  const hunters = (players ?? []).filter((c) => c.classId && c.name);
  const { printing, print } = usePrint();

  return (
    <>
      <div className="no-print">
        <div className="row between">
          <div>
            <p className="eyebrow">The Hunting Party</p>
            <h1 className="page-title">Party</h1>
          </div>
          {canExport && hunters.length > 0 && (
            <button className="btn btn-ghost btn-sm" onClick={print} disabled={printing}>
              {printing ? "Preparing…" : "Export all PDF"}
            </button>
          )}
        </div>
        <p className="page-intro">
          {oversight ? "Who's ready, and who needs a nudge." : "Meet your fellow hunters."}
        </p>

        {error && <div className="banner banner-error">{error}</div>}

        {oversight && (
          <RosterPanel
            members={members}
            players={players}
            rsvps={rsvps}
            sessionId={nextSession?.id}
            sessionTitle={nextSession?.title}
            canEmail={canEmail}
          />
        )}

        <p className="eyebrow" style={{ margin: "18px 0 10px" }}>The hunters</p>
        {players === null ? (
          <div className="stack" style={{ gap: 10 }}>
            <CardSkeleton lines={2} />
            <CardSkeleton lines={2} />
          </div>
        ) : hunters.length === 0 ? (
          <div className="card center"><p className="muted" style={{ margin: 0 }}>No hunters forged yet.</p></div>
        ) : (
          <div className="stack" style={{ gap: 10 }}>
            {hunters.map((c) => (
              <HunterRow key={c.uid} card={c} />
            ))}
          </div>
        )}
      </div>

      {/* Print-only bundle: every hunter's sheet, one per page. */}
      <div className="print-only print-sheet">
        {hunters.map((c) => (
          <div key={c.uid} className="print-character" style={{ marginBottom: 16 }}>
            <HunterCardView card={c} />
          </div>
        ))}
      </div>

      {printing && (
        <div className="modal-backdrop no-print" style={{ alignItems: "center" }}>
          <div className="card center" style={{ maxWidth: 300, margin: 16 }}>
            <div className="spinner" style={{ margin: "0 auto 14px" }} aria-hidden />
            <p style={{ marginBottom: 4 }}>Preparing {hunters.length} sheets…</p>
            <p className="faint" style={{ fontSize: "0.82rem", marginBottom: 0 }}>
              In the dialog, choose <strong>Save as PDF</strong> to print them all.
            </p>
          </div>
        </div>
      )}
    </>
  );
}
