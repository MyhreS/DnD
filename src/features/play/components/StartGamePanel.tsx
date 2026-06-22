import { useMemo } from "react";
import { useAuthStore } from "@/features/auth/store/authStore";
import { useCampaignStore } from "@/features/campaigns/store/campaignStore";
import { useSessionStore } from "@/features/sessions/store/sessionStore";
import { sortUpcoming } from "@/data/sessions";
import { useNow } from "@/hooks/common/useNow";
import { AsyncButton } from "@/components/AsyncButton";
import { useGameStore } from "../store/gameStore";
import { whenLabel } from "@/features/sessions/lib/format";
import type { SessionEvent } from "@/types";

/** DM-only: start a live game, tied to the next session or ad-hoc. */
export function StartGamePanel() {
  const user = useAuthStore((s) => s.user);
  const member = useAuthStore((s) => s.member);
  const sessions = useSessionStore((s) => s.sessions);
  const now = useNow(30_000);
  const next = useMemo(() => sortUpcoming(sessions, now)[0], [sessions, now]);

  const hostGame = useGameStore((s) => s.hostGame);
  const join = useGameStore((s) => s.join);
  const error = useGameStore((s) => s.error);
  const activeId = useCampaignStore((s) => s.activeId);

  const dmName = member?.firstName || user?.displayName || user?.email || "DM";

  async function start(session: SessionEvent | null) {
    if (!user) return;
    const title = session?.title || "Ad-hoc game";
    const id = await hostGame({
      campaignId: activeId,
      sessionId: session?.id ?? null,
      title,
      dmUid: user.uid,
      dmName,
    });
    if (id) {
      await join(id, { uid: user.uid, name: dmName, classId: "", level: 1, role: "dm" });
    }
  }

  return (
    <div className="card">
      <p className="eyebrow">Dungeon Master</p>
      <h3 style={{ marginTop: 4, marginBottom: 6 }}>Start a game</h3>
      <p className="faint" style={{ fontSize: "0.86rem", marginTop: 0 }}>
        Open a lobby for your hunters to join, then begin when everyone's ready.
      </p>

      {next && (
        <AsyncButton
          className="btn btn-primary"
          pendingText="Opening lobby…"
          showDone={false}
          onClick={() => start(next)}
        >
          Start “{next.title}” · {whenLabel(new Date(next.date))}
        </AsyncButton>
      )}

      <AsyncButton
        className={next ? "btn btn-ghost" : "btn btn-primary"}
        style={{ marginTop: next ? 8 : 0 }}
        pendingText="Opening lobby…"
        showDone={false}
        onClick={() => start(null)}
      >
        Start an ad-hoc game
      </AsyncButton>

      {error && <div className="banner banner-error" style={{ marginTop: 10 }}>{error}</div>}
    </div>
  );
}
