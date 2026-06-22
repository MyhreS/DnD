import { useState, useEffect } from "react";
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
import { DMCharacters } from "./DMCharacters";
import { LootPanel } from "./LootPanel";
import { RestPanel } from "./RestPanel";
import { useTradesSync } from "../hooks/useTradesSync";
import { useCharactersSync } from "../hooks/useCharactersSync";
import { useLootSync } from "../hooks/useLootSync";
import { PHASE_LABEL, PHASES } from "../lib/phase";
import type { Game, GameParticipant } from "@/types";

export function InGame({ game, participants }: { game: Game; participants: GameParticipant[] }) {
  const user = useAuthStore((s) => s.user);
  const card = usePlayerStore((s) => s.card);
  const leave = useGameStore((s) => s.leave);
  const join = useGameStore((s) => s.join);
  const error = useGameStore((s) => s.error);
  const navigate = useNavigate();

  const uid = user?.uid ?? "";
  const isDM = uid === game.dmUid;
  const joined = participants.some((p) => p.uid === uid);
  const hint = PHASES.find((p) => p.id === game.phase)?.hint;
  const combat = game.phase === "combat";

  useTradesSync(game.campaignId);
  useLootSync(game.id);

  // A player who arrives after the game has begun is auto-registered so the DM
  // and party see them (the lobby's explicit join only exists before "begin").
  const hasHunter = !!card && !!card.classId && !!card.name;
  useEffect(() => {
    if (!isDM && hasHunter && !joined && user && card) {
      void join(game.id, {
        uid: user.uid,
        name: card.name,
        classId: card.classId,
        subclassId: card.subclassId ?? null,
        level: card.level,
        role: "player",
      });
    }
  }, [isDM, hasHunter, joined, game.id, user, card, join]);

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
          <RestPanel card={card} phase={game.phase} />
          <InventoryPanel card={card} editable />
          <TradePanel game={game} participants={participants} card={card} />
        </>
      )}

      {isDM && <DMSection gameId={game.id} />}

      <LootPanel gameId={game.id} card={isDM ? undefined : card ?? undefined} />

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

/** DM-only section: the characters board + the trade log (subscribes both). */
function DMSection({ gameId }: { gameId: string }) {
  useCharactersSync();
  return (
    <>
      <DMCharacters gameId={gameId} />
      <TradeLog />
    </>
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
