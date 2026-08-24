import { useRef } from "react";
import type { Game } from "@/types";

function PlayersIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="9" cy="8" r="3" /><circle cx="17" cy="10" r="2.5" /><path d="M3.5 19c.4-4 2.3-6 5.5-6s5.1 2 5.5 6M14 14c3.5-.7 5.7.9 6.2 4" /></svg>;
}

function ItemIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m12 3 7 7-7 11-7-11 7-7Z" /><path d="m5 10 7 2 7-2M12 12v9" /></svg>;
}

function EnemyIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 4v7c0 5 2.3 8.2 7 10 4.7-1.8 7-5 7-10V4l-7 3-7-3Z" /><path d="m9 11 2 2 4-4" /></svg>;
}

function EndIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 4h9v16H6zM15 12h5M18 9l3 3-3 3" /></svg>;
}

export function GameSessionHeader({
  game,
  isDm,
  disabled,
  canManagePlayers,
  canCreateItem,
  onManagePlayers,
  onCreateItem,
  onManageEnemies,
  onEndSession,
}: {
  game: Game;
  isDm: boolean;
  disabled: boolean;
  canManagePlayers: boolean;
  canCreateItem: boolean;
  onManagePlayers: () => void;
  onCreateItem: () => void;
  onManageEnemies: () => void;
  onEndSession: () => void;
}) {
  const menuRef = useRef<HTMLDetailsElement>(null);
  const isActive = game.status === "active";
  const hasOptions = isDm && isActive;

  function runAction(action: () => void) {
    if (menuRef.current) menuRef.current.open = false;
    action();
  }

  return (
    <header className={`game-session-hero is-${game.status}`}>
      <div className="game-session-title">
        <p className="game-session-status">
          {isActive && <span className="game-session-live-dot" aria-hidden="true" />}
          {isActive ? "Live session" : game.status === "ended" ? "Session history" : "Waiting room"}
        </p>
        <h1>{game.title}</h1>
      </div>

      {hasOptions && (
        <details ref={menuRef} className="game-session-options">
          <summary aria-label="Session options"><span aria-hidden="true">•••</span><span>Session options</span></summary>
          <div className="game-session-options-menu">
            {canManagePlayers && <button type="button" aria-label="Manage players" disabled={disabled} onClick={() => runAction(onManagePlayers)}><PlayersIcon /><span><strong>Manage players</strong><small>View and change the Hunters</small></span></button>}
            {canCreateItem && <button type="button" aria-label="Create item" disabled={disabled} onClick={() => runAction(onCreateItem)}><ItemIcon /><span><strong>Create item</strong><small>Put new loot into play</small></span></button>}
            <button type="button" aria-label="Manage enemies" disabled={disabled} onClick={() => runAction(onManageEnemies)}><EnemyIcon /><span><strong>Manage enemies</strong><small>Prepare foes for battle</small></span></button>
            <button className="game-session-end" type="button" aria-label="End session" disabled={disabled} onClick={() => runAction(onEndSession)}><EndIcon /><span><strong>End session</strong><small>Save the session and leave</small></span></button>
          </div>
        </details>
      )}
    </header>
  );
}
