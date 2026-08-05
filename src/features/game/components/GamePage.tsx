import { useEffect, useMemo, useState, type FormEvent } from "react";
import {
  addGameParticipant,
  createGameSession,
  discardGameSession,
  finishGameSession,
  pauseGameClock,
  removeGameParticipant,
  resetGameClock,
  resumeGameClock,
  startGame,
  subscribeActiveGameSeats,
  subscribeParticipants,
  subscribeUserGames,
  type ActiveGameSeat,
} from "@/api/games";
import { isPreviewActive, previewGame, previewParticipants } from "@/dev/preview";
import { useAllCharacters } from "@/features/game/hooks/useAllCharacters";
import { useAuthStore } from "@/features/auth/store/authStore";
import { PaperSheetModal } from "@/features/hunter/components/papersheet/PaperSheetModal";
import { useCombatSync } from "@/features/play/hooks/useCombatSync";
import { emptyEncounter } from "@/features/play/lib/turnTimer";
import { useCombatStore } from "@/features/play/store/combatStore";
import type { Game, GameParticipant, HunterCard } from "@/types";
import { EnemySection } from "./EnemySection";
import { SessionBattleView } from "./SessionBattleView";
import { SessionCombatControls, SessionCombatSection } from "./SessionCombatSection";
import "./game.css";

const DEFAULT_TITLE = () => `Session ${new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(new Date())}`;

function elapsedMs(game: Game, now: number): number {
  return game.clockElapsedMs + (game.clockRunning && game.clockStartedAt
    ? Math.max(0, now - game.clockStartedAt)
    : 0);
}

function clockText(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return [hours, minutes, seconds].map((part) => String(part).padStart(2, "0")).join(":");
}

function useClock(game: Game | null): string {
  const [now, setNow] = useState(0);
  useEffect(() => {
    if (!game?.clockRunning) return;
    const timer = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(timer);
  }, [game?.clockRunning]);
  return clockText(game ? elapsedMs(game, now) : 0);
}

function displayClass(participant: GameParticipant): string {
  return participant.className || participant.classId || "Hunter";
}

function hunterSearchText(card: HunterCard): string {
  const sheetClass = typeof card.sheet?.class === "string" ? card.sheet.class : "";
  return [card.name, card.ownerName, card.ownerEmail, card.classId, sheetClass, card.background, card.level]
    .join(" ")
    .toLocaleLowerCase();
}

function historyDate(game: Game): string {
  const value = game.endedAt || game.createdAt;
  return value ? new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(new Date(value)) : "Saved session";
}

export function GamePage() {
  const user = useAuthStore((state) => state.user);
  const member = useAuthStore((state) => state.member);
  const preview = isPreviewActive();
  const emptyGamePreview = preview && new URLSearchParams(window.location.search).get("game") === "empty";
  const { characters, error: charactersError } = useAllCharacters();
  const otherCharacters = useMemo(
    () => (characters ?? []).filter((card) => card.ownerUid !== user?.uid),
    [characters, user?.uid],
  );
  const charactersById = useMemo(
    () => new Map((characters ?? []).map((card) => [card.id, card])),
    [characters],
  );
  const [games, setGames] = useState<Game[]>([]);
  const [activeSeats, setActiveSeats] = useState<Map<string, ActiveGameSeat>>(new Map());
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [participants, setParticipants] = useState<GameParticipant[]>([]);
  const [previewRosters, setPreviewRosters] = useState<Record<string, GameParticipant[]>>({
    "preview-game": previewParticipants(),
  });
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (!user) return;
    if (preview) {
      const timer = window.setTimeout(() => {
        const game = emptyGamePreview ? null : previewGame();
        setGames(game ? [game] : []);
        setSelectedId(game?.id ?? null);
        setLoading(false);
      }, 0);
      return () => window.clearTimeout(timer);
    }
    return subscribeUserGames(
      user.uid,
      (next) => {
        setGames(next);
        setSelectedId((current) => current && next.some((game) => game.id === current)
          ? current
          : next.find((game) => game.status !== "ended")?.id ?? next[0]?.id ?? null);
        setLoading(false);
        setError(null);
      },
      () => {
        setLoading(false);
        setError("Could not load your game sessions.");
      },
    );
  }, [emptyGamePreview, preview, user]);

  useEffect(() => {
    if (preview) return;
    return subscribeActiveGameSeats(
      setActiveSeats,
      () => setError("Could not load player availability."),
    );
  }, [preview]);

  const selected = games.find((game) => game.id === selectedId) ?? null;
  const activeGame = games.find((game) => game.status !== "ended") ?? null;
  const history = games.filter((game) => game.status === "ended");
  const effectiveSeats = useMemo(() => {
    if (!preview) return activeSeats;
    const seats = new Map<string, ActiveGameSeat>();
    for (const game of games.filter((item) => item.status !== "ended")) {
      seats.set(game.dmUid, { uid: game.dmUid, gameId: game.id, role: "dm" });
      game.participantUids.forEach((uid) => seats.set(uid, { uid, gameId: game.id, role: "player" }));
    }
    return seats;
  }, [activeSeats, games, preview]);
  const occupiedOwnerUids = useMemo(() => new Set(effectiveSeats.keys()), [effectiveSeats]);
  const unavailableForSelected = useMemo(() => new Set(
    [...effectiveSeats.values()]
      .filter((seat) => seat.gameId !== selected?.id)
      .map((seat) => seat.uid),
  ), [effectiveSeats, selected?.id]);
  const isSessionDm = Boolean(user && selected?.dmUid === user.uid);
  const battleMode = Boolean(selected?.status === "active" && selected.combat?.active);
  const displayedParticipants = selected && selected.campaignId === null
    ? selected.participantRoster
    : participants;

  useEffect(() => {
    if (!selectedId) {
      const timer = window.setTimeout(() => setParticipants([]), 0);
      return () => window.clearTimeout(timer);
    }
    if (preview) {
      const timer = window.setTimeout(() => setParticipants(previewRosters[selectedId] ?? []), 0);
      return () => window.clearTimeout(timer);
    }
    if (selected?.campaignId == null) return;
    return subscribeParticipants(
      selectedId,
      setParticipants,
      () => setError("Could not load the players in this session."),
    );
  }, [preview, previewRosters, selected?.campaignId, selectedId]);

  useCombatSync(selectedId);
  const combatBusy = useCombatStore((state) => state.busy);
  const combatError = useCombatStore((state) => state.error);
  const clock = useClock(selected);

  async function perform(work: () => Promise<void>, message: string): Promise<boolean> {
    setBusy(true);
    setError(null);
    try {
      await work();
      return true;
    } catch (reason) {
      console.error(message, reason);
      setError(reason instanceof Error && reason.message ? reason.message : message);
      return false;
    } finally {
      setBusy(false);
    }
  }

  function updatePreviewGame(id: string, patch: Partial<Game>) {
    setGames((current) => current.map((game) => game.id === id ? { ...game, ...patch } : game));
  }

  useEffect(() => {
    if (!preview) return;
    const updateCombat = (event: Event) => {
      const detail = (event as CustomEvent<{ gameId: string; combat: Game["combat"] }>).detail;
      if (detail?.gameId) updatePreviewGame(detail.gameId, { combat: detail.combat });
    };
    window.addEventListener("cs-preview-combat", updateCombat);
    return () => window.removeEventListener("cs-preview-combat", updateCombat);
  }, [preview]);

  async function createSession(title: string, hunters: HunterCard[]) {
    if (!user) return;
    if (activeGame) {
      setError("End or discard your current session before creating another one.");
      return;
    }
    const input = {
      campaignId: null,
      sessionId: null,
      title,
      dmUid: user.uid,
      dmName: member?.firstName || user.displayName || "DM",
    };
    if (preview) {
      const id = `preview-session-${Date.now()}`;
      const roster = hunters.map<GameParticipant>((hunter) => ({
        uid: hunter.ownerUid,
        characterId: hunter.id,
        playerName: hunter.ownerName,
        name: hunter.name,
        classId: hunter.classId,
        subclassId: hunter.subclassId ?? null,
        className: typeof hunter.sheet?.class === "string" ? hunter.sheet.class : null,
        level: hunter.level,
        role: "player",
        joinedAt: Date.now(),
        lastSeen: Date.now(),
      }));
      const game: Game = {
        ...previewGame(),
        id,
        campaignId: null,
        title,
        dmUid: user.uid,
        dmName: input.dmName,
        participantUids: hunters.map((hunter) => hunter.ownerUid),
        participantRoster: roster,
        status: "lobby",
        combat: emptyEncounter(),
        createdAt: Date.now(),
        clockRunning: false,
        clockStartedAt: null,
        clockElapsedMs: 0,
      };
      setPreviewRosters((current) => ({ ...current, [id]: roster }));
      setGames((current) => [game, ...current]);
      setSelectedId(id);
      setCreating(false);
      return;
    }
    await perform(async () => {
      const id = await createGameSession(input, hunters);
      setSelectedId(id);
      setCreating(false);
    }, "Could not create the session.");
  }

  async function addHunter(card: HunterCard) {
    if (!selected) return;
    const occupied = effectiveSeats.get(card.ownerUid);
    if (occupied && occupied.gameId !== selected.id) {
      setError(`${card.ownerName || card.name} is already in another active session.`);
      return;
    }
    if (preview) {
      const participant: GameParticipant = {
        uid: card.ownerUid,
        characterId: card.id,
        playerName: card.ownerName,
        name: card.name,
        classId: card.classId,
        subclassId: card.subclassId ?? null,
        className: typeof card.sheet?.class === "string" ? card.sheet.class : null,
        level: card.level,
        role: "player",
        joinedAt: Date.now(),
        lastSeen: Date.now(),
      };
      setPreviewRosters((current) => ({
        ...current,
        [selected.id]: [...(current[selected.id] ?? []).filter((item) => item.uid !== card.ownerUid), participant],
      }));
      updatePreviewGame(selected.id, {
        participantUids: [...new Set([...selected.participantUids, card.ownerUid])],
        participantRoster: [...selected.participantRoster.filter((item) => item.uid !== card.ownerUid), participant],
      });
      return;
    }
    await perform(() => addGameParticipant(selected, card), "Could not add that player.");
  }

  async function removeHunter(uid: string) {
    if (!selected) return;
    if (preview) {
      setPreviewRosters((current) => ({
        ...current,
        [selected.id]: (current[selected.id] ?? []).filter((item) => item.uid !== uid),
      }));
      updatePreviewGame(selected.id, {
        participantUids: selected.participantUids.filter((item) => item !== uid),
        participantRoster: selected.participantRoster.filter((item) => item.uid !== uid),
      });
      return;
    }
    await perform(() => removeGameParticipant(selected, uid), "Could not remove that player.");
  }

  async function beginSession() {
    if (!selected) return;
    if (preview) {
      const now = Date.now();
      updatePreviewGame(selected.id, { status: "active", startedAt: now, clockRunning: true, clockStartedAt: now });
      return;
    }
    await perform(() => startGame(selected.id), "Could not start the session.");
  }

  async function pauseClock() {
    if (!selected) return;
    if (preview) {
      updatePreviewGame(selected.id, {
        clockElapsedMs: elapsedMs(selected, Date.now()),
        clockRunning: false,
        clockStartedAt: null,
      });
      return;
    }
    await perform(() => pauseGameClock(selected), "Could not pause the clock.");
  }

  async function resumeClock() {
    if (!selected) return;
    if (preview) {
      updatePreviewGame(selected.id, { clockRunning: true, clockStartedAt: Date.now() });
      return;
    }
    await perform(() => resumeGameClock(selected.id), "Could not resume the clock.");
  }

  async function resetClock() {
    if (!selected) return;
    if (preview) {
      updatePreviewGame(selected.id, {
        clockElapsedMs: 0,
        clockStartedAt: selected.clockRunning ? Date.now() : null,
      });
      return;
    }
    await perform(() => resetGameClock(selected.id, selected.clockRunning), "Could not reset the clock.");
  }

  async function finishSession() {
    if (!selected || selected.status !== "active") return;
    if (!window.confirm("End this session? The party, enemies, damage, and duration will be saved in session history.")) return;
    if (preview) {
      updatePreviewGame(selected.id, {
        status: "ended",
        endedAt: Date.now(),
        clockElapsedMs: elapsedMs(selected, Date.now()),
        clockRunning: false,
        clockStartedAt: null,
        combat: selected.combat ? {
          ...selected.combat,
          active: false,
          timerPhase: "idle",
          timerEndsAt: null,
          pausedRemainingMs: null,
        } : selected.combat,
      });
      return;
    }
    await perform(() => finishGameSession(selected), "Could not end the session.");
  }

  async function discardSession() {
    if (!selected || selected.status !== "lobby") return;
    if (!window.confirm("Discard this unstarted session? It will not be added to history.")) return;
    if (preview) {
      setPreviewRosters((current) => {
        const next = { ...current };
        delete next[selected.id];
        return next;
      });
      setGames((current) => current.filter((game) => game.id !== selected.id));
      setSelectedId(history[0]?.id ?? null);
      return;
    }
    await perform(() => discardGameSession(selected.id), "Could not discard the session.");
  }

  if (!creating && selected && battleMode) {
    return (
      <div className="game-page game-page-battle">
        {(error || charactersError || combatError) && <div className="banner-error" role="alert">{error || charactersError || combatError}</div>}
        <SessionBattleView
          game={selected}
          characters={characters ?? []}
          isDm={isSessionDm}
          dmControls={isSessionDm ? (
            <SessionCombatControls
              game={selected}
              characters={characters ?? []}
              disabled={combatBusy || busy}
            />
          ) : null}
          enemySection={<EnemySection game={selected} isDm={isSessionDm} disabled={combatBusy || busy} />}
        />
      </div>
    );
  }

  return (
    <div className="game-page">
      <header className="game-heading">
        <div>
          <p className="eyebrow">Shared table</p>
          <h1 className="page-title">Game</h1>
        </div>
        {!creating && !activeGame && games.length > 0 && (
          <button className="btn btn-primary game-create-button" type="button" onClick={() => setCreating(true)}>
            Create session
          </button>
        )}
      </header>

      {(error || charactersError || combatError) && <div className="banner-error" role="alert">{error || charactersError || combatError}</div>}

      {creating && (
        <CreateSession
          characters={otherCharacters}
          unavailableOwnerUids={occupiedOwnerUids}
          busy={busy}
          onCancel={() => setCreating(false)}
          onCreate={createSession}
        />
      )}

      {!creating && loading && <p className="muted">Loading sessions…</p>}

      {!creating && !loading && games.length === 0 && (
        <div className="game-empty">
          <h2>No sessions yet</h2>
          <p>Create a session to run the game, or wait for another player to add one of your Hunters.</p>
          <button className="btn btn-primary" type="button" onClick={() => setCreating(true)}>Create session</button>
        </div>
      )}

      {!creating && games.length > 0 && (
        <div className="game-layout">
          <nav className="game-sessions" aria-label="Game sessions">
            {activeGame && (
              <div className="game-session-group">
                <span className="game-session-label">Current session</span>
                <SessionLink game={activeGame} selected={activeGame.id === selectedId} onSelect={() => setSelectedId(activeGame.id)} />
              </div>
            )}
            {history.length > 0 && (
              <div className="game-session-group">
                <span className="game-session-label">History</span>
                {history.map((game) => (
                  <SessionLink key={game.id} game={game} selected={game.id === selectedId} onSelect={() => setSelectedId(game.id)} />
                ))}
              </div>
            )}
          </nav>

          {selected && (
            <main className="game-table" aria-label={`${selected.title} session`}>
              <div className="game-session-heading">
                <div>
                  <p className="eyebrow">{selected.status === "active" ? "Live session" : selected.status === "ended" ? "Session history" : "Waiting room"}</p>
                  <h2>{selected.title}</h2>
                  {!isSessionDm && <p className="muted">{selected.status === "ended" ? `Run by ${selected.dmName}.` : `${selected.dmName} added your Hunter to this session.`}</p>}
                </div>
                <div className="game-clock" aria-label={`Session clock ${clock}`}>
                  <span>{selected.status === "ended" ? "Duration" : "Session clock"}</span>
                  <strong data-testid="session-clock">{clock}</strong>
                  <small>{selected.status === "ended" ? "Saved" : selected.clockRunning ? "Running" : "Paused"}</small>
                </div>
              </div>

              {isSessionDm && selected.status !== "ended" && (
                <div className="game-clock-actions" aria-label="Clock controls">
                  {selected.status === "lobby" ? (
                    <button className="btn btn-primary" type="button" disabled={busy} onClick={beginSession}>Start session</button>
                  ) : selected.clockRunning ? (
                    <button className="btn btn-ghost" type="button" disabled={busy} onClick={pauseClock}>Pause</button>
                  ) : (
                    <button className="btn btn-primary" type="button" disabled={busy} onClick={resumeClock}>Resume</button>
                  )}
                  {selected.status === "active" && <button className="btn btn-ghost" type="button" disabled={busy} onClick={resetClock}>Reset clock</button>}
                  {selected.status === "active" ? (
                    <button className="btn btn-danger" type="button" disabled={busy} onClick={finishSession}>End session</button>
                  ) : (
                    <button className="btn btn-danger" type="button" disabled={busy} onClick={discardSession}>Discard session</button>
                  )}
                </div>
              )}

              <section className="game-section" aria-labelledby="players-heading">
                <div className="game-section-heading">
                  <div>
                    <p className="eyebrow">Party</p>
                    <h3 id="players-heading">Players <span>{displayedParticipants.length}</span></h3>
                  </div>
                  {isSessionDm && selected.status === "lobby" && characters && (
                    <AddHunter
                      characters={otherCharacters}
                      participants={displayedParticipants}
                      unavailableOwnerUids={unavailableForSelected}
                      onAdd={addHunter}
                    />
                  )}
                </div>
                {displayedParticipants.length === 0 ? (
                  <p className="muted">No Hunters have been added yet.</p>
                ) : (
                  <div className="game-roster">
                    {displayedParticipants.map((participant) => (
                      <SessionHunterRow
                        key={participant.uid}
                        participant={participant}
                        card={participant.characterId ? charactersById.get(participant.characterId) : undefined}
                        canInspect={isSessionDm}
                        canRemove={isSessionDm && selected.status === "lobby"}
                        busy={busy}
                        onRemove={() => removeHunter(participant.uid)}
                      />
                    ))}
                  </div>
                )}
              </section>

              {selected.status === "active" && (
                <SessionCombatSection
                  game={selected}
                  participants={displayedParticipants}
                  characters={characters ?? []}
                  isDm={isSessionDm}
                  disabled={combatBusy || busy}
                />
              )}

              <EnemySection game={selected} isDm={isSessionDm} disabled={combatBusy || busy} />
            </main>
          )}
        </div>
      )}
    </div>
  );
}

function SessionLink({ game, selected, onSelect }: { game: Game; selected: boolean; onSelect: () => void }) {
  return (
    <button type="button" className={selected ? "game-session is-current" : "game-session"} onClick={onSelect}>
      <strong>{game.title}</strong>
      <span>{game.status === "lobby" ? "Waiting" : game.status === "active" ? "Live" : historyDate(game)}</span>
    </button>
  );
}

function SessionHunterRow({
  participant,
  card,
  canInspect,
  canRemove,
  busy,
  onRemove,
}: {
  participant: GameParticipant;
  card?: HunterCard;
  canInspect: boolean;
  canRemove: boolean;
  busy: boolean;
  onRemove: () => void;
}) {
  const [open, setOpen] = useState(false);
  const details = (
    <>
      <div>
        <strong>{participant.name}</strong>
        <span>{participant.playerName || "Player"}</span>
      </div>
      <span>{displayClass(participant)} · Level {participant.level}</span>
    </>
  );

  return (
    <div className="game-player">
      {canInspect && card ? (
        <button
          type="button"
          className="game-player-open"
          aria-label={`Open ${participant.name} character sheet`}
          onClick={() => setOpen(true)}
        >
          {details}
        </button>
      ) : (
        <div className="game-player-open">{details}</div>
      )}
      {canRemove && (
        <button type="button" className="game-text-button" disabled={busy} onClick={onRemove}>
          Remove
        </button>
      )}
      {open && card && <PaperSheetModal card={card} readOnly onClose={() => setOpen(false)} />}
    </div>
  );
}

function CreateSession({
  characters,
  unavailableOwnerUids,
  busy,
  onCancel,
  onCreate,
}: {
  characters: HunterCard[];
  unavailableOwnerUids: Set<string>;
  busy: boolean;
  onCancel: () => void;
  onCreate: (title: string, hunters: HunterCard[]) => Promise<void>;
}) {
  const [title, setTitle] = useState(DEFAULT_TITLE);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<HunterCard[]>([]);
  const results = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase();
    if (!needle) return characters.slice(0, 10);
    return characters.filter((card) => hunterSearchText(card).includes(needle)).slice(0, 10);
  }, [characters, query]);

  function choose(card: HunterCard) {
    setSelected((current) => [...current.filter((hunter) => hunter.ownerUid !== card.ownerUid), card]);
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    const cleanTitle = title.trim();
    if (!cleanTitle) return;
    void onCreate(cleanTitle.slice(0, 80), selected);
  }

  return (
    <form className="game-creator" onSubmit={submit}>
      <div className="game-creator-heading">
        <div>
          <p className="eyebrow">New game</p>
          <h2>Create session</h2>
        </div>
        <button className="game-text-button" type="button" onClick={onCancel}>Cancel</button>
      </div>
      <label className="game-field">
        <span>Session name</span>
        <input className="input" value={title} maxLength={80} onChange={(event) => setTitle(event.target.value)} autoFocus />
      </label>
      <label className="game-field">
        <span>Search for a player or Hunter</span>
        <input className="input" type="search" value={query} placeholder="Name, class, background…" onChange={(event) => setQuery(event.target.value)} />
      </label>
      <div className="game-hunter-results" aria-label="Hunter search results">
        {results.map((card) => {
          const picked = selected.some((hunter) => hunter.id === card.id);
          const unavailable = unavailableOwnerUids.has(card.ownerUid);
          return (
            <button key={card.id} type="button" disabled={unavailable} className={picked ? "game-hunter-result is-picked" : "game-hunter-result"} onClick={() => choose(card)}>
              <span><strong>{card.name}</strong><small>{card.ownerName || card.ownerEmail}</small></span>
              <span>{unavailable ? "In session" : picked ? "Added" : "Add"}</span>
            </button>
          );
        })}
        {results.length === 0 && <p className="muted">No matching Hunters.</p>}
      </div>
      {selected.length > 0 && (
        <div className="game-selected-hunters">
          <span>{selected.length} selected</span>
          {selected.map((hunter) => (
            <button key={hunter.id} type="button" onClick={() => setSelected((current) => current.filter((item) => item.id !== hunter.id))}>
              {hunter.name} ×
            </button>
          ))}
        </div>
      )}
      <button className="btn btn-primary" type="submit" disabled={busy || !title.trim()}>{busy ? "Creating…" : "Create session"}</button>
    </form>
  );
}

function AddHunter({
  characters,
  participants,
  unavailableOwnerUids,
  onAdd,
}: {
  characters: HunterCard[];
  participants: GameParticipant[];
  unavailableOwnerUids: Set<string>;
  onAdd: (card: HunterCard) => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const currentByOwner = new Map(participants.map((participant) => [participant.uid, participant.characterId]));
  const results = characters
    .filter((card) => hunterSearchText(card).includes(query.trim().toLocaleLowerCase()))
    .slice(0, 8);
  return (
    <div className="game-add-hunter">
      <button type="button" className="game-text-button" onClick={() => setOpen((value) => !value)}>{open ? "Close" : "+ Add Hunter"}</button>
      {open && (
        <div className="game-add-popover">
          <input className="input" type="search" placeholder="Search players…" value={query} onChange={(event) => setQuery(event.target.value)} autoFocus />
          {results.map((card) => {
            const same = currentByOwner.get(card.ownerUid) === card.id;
            const unavailable = unavailableOwnerUids.has(card.ownerUid);
            return (
              <button key={card.id} type="button" disabled={same || unavailable} onClick={() => { void onAdd(card); setOpen(false); setQuery(""); }}>
                <span><strong>{card.name}</strong><small>{card.ownerName || card.ownerEmail}</small></span>
                <span>{unavailable ? "In session" : same ? "Added" : currentByOwner.has(card.ownerUid) ? "Switch" : "Add"}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
