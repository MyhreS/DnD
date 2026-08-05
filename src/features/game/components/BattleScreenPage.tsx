import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { subscribeUserGames } from "@/api/games";
import { CONDITION_NAME } from "@/data/conditions";
import { isPreviewActive, previewGame } from "@/dev/preview";
import { useAuthStore } from "@/features/auth/store/authStore";
import { useAllCharacters } from "@/features/game/hooks/useAllCharacters";
import { useCombatSync } from "@/features/play/hooks/useCombatSync";
import { useTurnClock } from "@/features/play/hooks/useTurnClock";
import { emptyEncounter, formatTurnTime } from "@/features/play/lib/turnTimer";
import { initiativeOrder, useCombatStore } from "@/features/play/store/combatStore";
import { useFullscreen } from "@/hooks/common/useFullscreen";
import { useWakeLock } from "@/hooks/common/useWakeLock";
import type { Combatant, Game, HunterCard, TurnTimerPhase } from "@/types";
import { combatVitals } from "../lib/combatPresentation";
import "./battle-screen.css";

function previewBattle(): Game {
  const sample = previewGame();
  return {
    ...sample,
    status: "active",
    startedAt: Date.now() - 35 * 60_000,
    combat: {
      ...sample.combat!,
      active: true,
      round: 2,
      turnId: "prev-pc-1",
      timerPhase: "running",
      timerEndsAt: Date.now() + 74_000,
      pausedRemainingMs: null,
    },
  };
}

export function BattleScreenPage() {
  const { gameId = "" } = useParams();
  const user = useAuthStore((state) => state.user);
  const preview = isPreviewActive();
  const [game, setGame] = useState<Game | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { characters, error: charactersError } = useAllCharacters();
  const { isFullscreen, toggle, supported } = useFullscreen();
  useWakeLock();

  useEffect(() => {
    if (preview) {
      const timer = window.setTimeout(() => {
        setGame(previewBattle());
        setLoading(false);
      }, 0);
      return () => window.clearTimeout(timer);
    }
    if (!user) return;
    return subscribeUserGames(
      user.uid,
      (games) => {
        setGame(games.find((candidate) => candidate.id === gameId) ?? null);
        setLoading(false);
        setError(null);
      },
      () => {
        setLoading(false);
        setError("Could not load this session.");
      },
    );
  }, [gameId, preview, user]);

  useCombatSync(game?.id ?? null);
  const combatants = useCombatStore((state) => state.combatants);
  const order = useMemo(() => initiativeOrder(combatants), [combatants]);
  const encounter = game?.combat ?? emptyEncounter();
  const current = order.find((combatant) => combatant.id === encounter.turnId) ?? order[0];

  if (loading) return <div className="battle-screen battle-message">Loading battle…</div>;
  if (error || charactersError) return <div className="battle-screen battle-message">{error || charactersError}</div>;
  if (!game) {
    return (
      <div className="battle-screen battle-message">
        <p>This session is unavailable.</p>
        <Link to="/game">Back to Game</Link>
      </div>
    );
  }
  const battleActive = game.status === "active" && encounter.active;

  return (
    <main className="battle-screen" aria-label={`${game.title} battle screen`}>
      <header className="battle-header">
        <div className="battle-title">
          <h1>{game.title}</h1>
          <p>{battleActive ? `Round ${Math.max(1, encounter.round)}` : game.status === "ended" ? "Session ended" : "Waiting for initiative"}</p>
        </div>
        <div className="battle-header-actions">
          {supported && <button type="button" onClick={toggle}>{isFullscreen ? "Exit fullscreen" : "Fullscreen"}</button>}
          <Link to="/game">Game controls</Link>
        </div>
      </header>

      {!battleActive || order.length === 0 ? (
        <section className="battle-waiting" aria-live="polite">
          <strong>{game.status === "ended" ? "Battle complete" : "Roll for initiative"}</strong>
          <p>{game.status === "ended" ? "The encounter remains saved in session history." : "This screen will update automatically when the DM starts battle."}</p>
        </section>
      ) : (
        <div className="battle-layout">
          <section className="battle-order" aria-label="Battle initiative order">
            <div className="battle-column-headings" aria-hidden="true">
              <span>Order</span><span>Combatant</span><span>Initiative</span><span>Damage</span><span>AC</span><span>Conditions</span>
            </div>
            {order.map((combatant, index) => (
              <BattleRow
                key={combatant.id}
                combatant={combatant}
                position={index + 1}
                round={Math.max(1, encounter.round)}
                active={combatant.id === encounter.turnId}
                characters={characters ?? []}
              />
            ))}
          </section>
          <BattleTimer phaseSource={encounter} combatant={current} />
        </div>
      )}
    </main>
  );
}

function phaseLabel(phase: TurnTimerPhase): string {
  if (phase === "briefing") return "Tactical briefing";
  if (phase === "untimed") return "DM turn";
  if (phase === "paused") return "Paused";
  if (phase === "expired") return "Time expired";
  if (phase === "running") return "Turn timer";
  return "Waiting";
}

function BattleTimer({ phaseSource, combatant }: { phaseSource: NonNullable<Game["combat"]>; combatant?: Combatant }) {
  const { phase, remainingMs } = useTurnClock(phaseSource);
  const display = phase === "running" || phase === "paused" || phase === "expired"
    ? formatTurnTime(remainingMs)
    : phase === "briefing"
      ? "Briefing"
      : "No timer";
  return (
    <aside className={`battle-timer battle-timer-${phase}`} aria-live="polite" data-testid="battle-turn-timer">
      <span>{phaseLabel(phase)}</span>
      <strong>{display}</strong>
      <p>{combatant?.name ?? "No active combatant"}</p>
      {phase === "briefing" && <small>Planning only. The Warden starts 90 seconds when they act.</small>}
      {phase === "expired" && <small>Finish the action already begun. No new action may start.</small>}
    </aside>
  );
}

function BattleRow({
  combatant,
  position,
  round,
  active,
  characters,
}: {
  combatant: Combatant;
  position: number;
  round: number;
  active: boolean;
  characters: HunterCard[];
}) {
  const vitals = combatVitals(combatant, characters);
  const damagePercent = vitals.maxHp && vitals.damageTaken !== null
    ? Math.min(100, (vitals.damageTaken / vitals.maxHp) * 100)
    : 0;
  return (
    <article className={active ? "battle-row is-current" : "battle-row"} data-testid={`battle-combatant-${combatant.id}`}>
      <span className="battle-position">{position}</span>
      <div className="battle-name">
        <strong>{combatant.name}</strong>
        <span>{combatant.kind === "monster" ? "Enemy" : "Hunter"}</span>
      </div>
      <strong className="battle-initiative">{combatant.initiative}</strong>
      <div className="battle-damage">
        <strong>{vitals.damageTaken ?? "—"}</strong>
        <span>taken</span>
        {vitals.maxHp !== null && <div className="battle-damage-track" aria-hidden="true"><span style={{ width: `${damagePercent}%` }} /></div>}
      </div>
      <strong className="battle-ac">{vitals.ac ?? "—"}</strong>
      <div className="battle-conditions">
        {combatant.conditions.length === 0 ? <span>None</span> : combatant.conditions.map((conditionId) => {
          const since = combatant.conditionSince?.[conditionId];
          const rounds = since ? Math.max(1, round - since + 1) : null;
          return <span key={conditionId}>{CONDITION_NAME[conditionId] ?? conditionId}{rounds ? ` · ${rounds}r` : ""}</span>;
        })}
      </div>
    </article>
  );
}
