import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "@/features/auth/store/authStore";
import { usePlayerStore } from "@/features/hunter/store/playerStore";
import { CharacterTrackers } from "@/features/hunter/components/CharacterTrackers";
import { InventoryPanel } from "@/features/hunter/components/InventoryPanel";
import { AsyncButton } from "@/components/AsyncButton";
import { useGameStore } from "../store/gameStore";
import { PhaseControl } from "./PhaseControl";
import { ParticipantList } from "./ParticipantList";
import { TradePanel } from "./TradePanel";
import { TradeLog } from "./TradeLog";
import { useTradesSync } from "../hooks/useTradesSync";
import { PHASE_LABEL, PHASES } from "../lib/phase";
import type { Game, GameParticipant } from "@/types";

export function InGame({ game, participants }: { game: Game; participants: GameParticipant[] }) {
  const user = useAuthStore((s) => s.user);
  const card = usePlayerStore((s) => s.card);
  const leave = useGameStore((s) => s.leave);
  const error = useGameStore((s) => s.error);
  const navigate = useNavigate();

  const uid = user?.uid ?? "";
  const isDM = uid === game.dmUid;
  const joined = participants.some((p) => p.uid === uid);
  const hint = PHASES.find((p) => p.id === game.phase)?.hint;
  const combat = game.phase === "combat";

  useTradesSync(game.id);

  return (
    <div className="stack" style={{ gap: 14 }}>
      <div
        className="card"
        style={{ borderColor: combat ? "var(--blood-bright)" : undefined, background: combat ? "rgba(179,18,26,0.10)" : undefined }}
      >
        <p className="eyebrow" style={{ marginBottom: 4 }}>{game.title} · in play</p>
        <h1 style={{ margin: 0 }}>{PHASE_LABEL[game.phase]}</h1>
        {hint && <p className="muted" style={{ marginBottom: 0, fontSize: "0.9rem" }}>{hint}</p>}
      </div>

      {isDM && <PhaseControl game={game} />}

      {!isDM && card && card.classId && card.name && (
        <>
          <CharacterTrackers card={card} />
          <InventoryPanel card={card} editable />
          <TradePanel game={game} participants={participants} card={card} />
        </>
      )}

      {isDM && <TradeLog />}

      <ParticipantList participants={participants} />

      {error && <div className="banner banner-error">{error}</div>}

      {isDM && <StopGame game={game} />}

      <div className="btn-row">
        <button type="button" className="btn btn-ghost" onClick={() => navigate("/")}>
          Exit to menu
        </button>
        {!isDM && joined && (
          <AsyncButton
            className="btn btn-ghost"
            style={{ color: "var(--blood-bright)" }}
            pendingText="Leaving…"
            showDone={false}
            onClick={() => leave(game.id, uid)}
          >
            Leave game
          </AsyncButton>
        )}
      </div>
    </div>
  );
}

/** DM stop — confirms, showing the phase it's stopping in. */
function StopGame({ game }: { game: Game }) {
  const stop = useGameStore((s) => s.stop);
  const [confirming, setConfirming] = useState(false);

  if (!confirming) {
    return (
      <button
        type="button"
        className="btn btn-ghost"
        style={{ color: "var(--blood-bright)" }}
        onClick={() => setConfirming(true)}
      >
        Stop game
      </button>
    );
  }

  return (
    <div className="card" style={{ borderColor: "var(--blood-bright)" }}>
      <p style={{ marginTop: 0, marginBottom: 10 }}>
        Stop the game during <strong>{PHASE_LABEL[game.phase]}</strong>? Everyone leaves play; you can
        start again later. The phase is saved so you know where you left off.
      </p>
      <div className="btn-row">
        <button type="button" className="btn btn-ghost" onClick={() => setConfirming(false)}>Keep playing</button>
        <AsyncButton
          className="btn btn-primary"
          pendingText="Stopping…"
          showDone={false}
          onClick={() => stop(game.id, game.phase)}
        >
          Stop game
        </AsyncButton>
      </div>
    </div>
  );
}
