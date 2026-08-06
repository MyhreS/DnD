import { useEffect, useMemo, useState, type FormEvent } from "react";
import {
  addGameParticipant,
  createGameSession,
  discardGameSession,
  finishGameSession,
  removeGameParticipant,
  startGame,
  subscribeActiveGameSeats,
  subscribeParticipants,
  subscribeUserGames,
  type ActiveGameSeat,
} from "@/api/games";
import { getClass } from "@/data/classes";
import { isPreviewActive, previewGame, previewParticipants } from "@/dev/preview";
import { useAllCharacters } from "@/features/game/hooks/useAllCharacters";
import { useEnemyLibrary } from "@/features/game/hooks/useEnemyLibrary";
import { templateStats } from "@/features/game/lib/enemies";
import { useAuthStore } from "@/features/auth/store/authStore";
import { PaperSheetModal } from "@/features/hunter/components/papersheet/PaperSheetModal";
import { cardClassName } from "@/features/hunter/lib/papersheet";
import { useCombatSync } from "@/features/play/hooks/useCombatSync";
import { emptyEncounter } from "@/features/play/lib/turnTimer";
import { useCombatStore } from "@/features/play/store/combatStore";
import type { EnemyStats, EnemyTemplate, Game, GameParticipant, HunterCard } from "@/types";
import { EnemyEditorDialog } from "./EnemyEditorDialog";
import { EnemyLibraryDialog } from "./EnemyLibraryDialog";
import { EnemySection } from "./EnemySection";
import { CreateItemDialog, ManagePlayersDialog, SessionLootFeed } from "./GameSessionPanels";
import { SessionBattleView } from "./SessionBattleView";
import { ManageBattleDialog, SessionCombatControls, SessionCombatSection } from "./SessionCombatSection";
import "./game.css";

const DEFAULT_TITLE = () => `Session ${new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(new Date())}`;

function displayClass(participant: GameParticipant): string {
  return participant.className || getClass(participant.classId)?.name || participant.classId || "Hunter";
}

function hunterSearchText(card: HunterCard): string {
  return [card.name, card.ownerName, card.ownerEmail, card.classId, cardClassName(card), card.background, card.level]
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
  const enemyLibrary = useEnemyLibrary(user?.uid, preview);
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
  const [managingPlayers, setManagingPlayers] = useState(false);
  const [managingBattle, setManagingBattle] = useState(false);
  const [creatingItem, setCreatingItem] = useState(false);
  const [managingEnemies, setManagingEnemies] = useState(false);
  const [editingEnemy, setEditingEnemy] = useState<EnemyTemplate | "new" | null>(null);
  const [returnToBattleManager, setReturnToBattleManager] = useState(false);
  const [ownSheetOpen, setOwnSheetOpen] = useState(false);

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
  const ownParticipant = displayedParticipants.find((participant) => participant.uid === user?.uid);
  const ownCard = ownParticipant?.characterId ? charactersById.get(ownParticipant.characterId) : undefined;
  const focusedPlayerSession = Boolean(selected && !isSessionDm && selected.status !== "ended" && history.length === 0);

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

  useCombatSync(selectedId, !isSessionDm);
  const combatBusy = useCombatStore((state) => state.busy);
  const combatError = useCombatStore((state) => state.error);
  const combatants = useCombatStore((state) => state.combatants);
  const addMonster = useCombatStore((state) => state.addMonster);

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
        attendeeRoster: roster,
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
        attendeeRoster: [...(selected.attendeeRoster ?? selected.participantRoster).filter((item) => item.uid !== card.ownerUid), participant],
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

  async function finishSession() {
    if (!selected || selected.status !== "active") return;
    if (!window.confirm("End this session? The party, enemies, and damage will be saved in session history.")) return;
    if (preview) {
      updatePreviewGame(selected.id, {
        status: "ended",
        endedAt: Date.now(),
        clockElapsedMs: selected.clockElapsedMs,
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

  async function addEnemyToBattle(template: EnemyTemplate): Promise<boolean> {
    if (!selected) return false;
    return addMonster(selected.id, { ...templateStats(template), enemyTemplateId: template.id });
  }

  function openEnemyLibrary(fromBattleManager = false) {
    setReturnToBattleManager(fromBattleManager);
    setManagingBattle(false);
    setManagingEnemies(true);
  }

  function closeEnemyLibrary() {
    setManagingEnemies(false);
    if (returnToBattleManager) setManagingBattle(true);
    setReturnToBattleManager(false);
  }

  function openEnemyEditor(template: EnemyTemplate | "new") {
    setManagingEnemies(false);
    setEditingEnemy(template);
  }

  function closeEnemyEditor() {
    setEditingEnemy(null);
    setManagingEnemies(true);
  }

  async function saveEnemy(stats: EnemyStats, addToCurrentBattle: boolean) {
    let saved: EnemyTemplate | null = null;
    if (editingEnemy === "new") {
      saved = await enemyLibrary.create(stats);
    } else if (editingEnemy) {
      const updated = await enemyLibrary.update(editingEnemy, stats);
      if (updated) saved = { ...editingEnemy, ...stats, updatedAt: Date.now() };
    }
    if (!saved) return;
    if (addToCurrentBattle && !await addEnemyToBattle(saved)) return;
    closeEnemyEditor();
  }

  const enemyDialogs = selected ? (
    <>
      {managingEnemies && (
        <EnemyLibraryDialog
          templates={enemyLibrary.templates}
          busy={enemyLibrary.busy || combatBusy || busy}
          canAddToBattle={selected.status === "active"}
          onAdd={async (template) => { await addEnemyToBattle(template); }}
          onEdit={openEnemyEditor}
          onArchive={async (template, archived) => { await enemyLibrary.update(template, { archived }); }}
          onNew={() => openEnemyEditor("new")}
          onClose={closeEnemyLibrary}
        />
      )}
      {editingEnemy && (
        <EnemyEditorDialog
          template={editingEnemy === "new" ? null : editingEnemy}
          busy={enemyLibrary.busy || combatBusy || busy}
          canAddToBattle={selected.status === "active"}
          onSave={saveEnemy}
          onClose={closeEnemyEditor}
        />
      )}
    </>
  ) : null;

  if (!creating && selected && battleMode) {
    return (
      <div className="game-page game-page-battle">
        {(error || charactersError || combatError || enemyLibrary.error) && <div className="banner-error" role="alert">{error || charactersError || combatError || enemyLibrary.error}</div>}
        <SessionBattleView
          game={selected}
          characters={characters ?? []}
          isDm={isSessionDm}
          dmControls={isSessionDm ? (
            <SessionCombatControls
              game={selected}
              disabled={combatBusy || busy}
              onManage={() => setManagingBattle(true)}
            />
          ) : null}
        />
        {isSessionDm && managingBattle && (
          <ManageBattleDialog
            game={selected}
            characters={characters ?? []}
            disabled={combatBusy || busy}
            canCreateItem={selected.campaignId === null}
            enemySection={<EnemySection game={selected} isDm disabled={combatBusy || busy} />}
            onAddEnemy={() => openEnemyLibrary(true)}
            onCreateItem={() => { setManagingBattle(false); setCreatingItem(true); }}
            onClose={() => setManagingBattle(false)}
          />
        )}
        {enemyDialogs}
        {creatingItem && <CreateItemDialog gameId={selected.id} onClose={() => { setCreatingItem(false); setManagingBattle(true); }} />}
      </div>
    );
  }

  return (
    <div className="game-page">
      {!focusedPlayerSession && <header className="game-heading">
        <div>
          <p className="eyebrow">Shared table</p>
          <h1 className="page-title">Game</h1>
        </div>
        {!creating && !activeGame && games.length > 0 && (
          <button className="btn btn-primary game-create-button" type="button" onClick={() => setCreating(true)}>
            Create session
          </button>
        )}
      </header>}

      {(error || charactersError || combatError || enemyLibrary.error) && <div className="banner-error" role="alert">{error || charactersError || combatError || enemyLibrary.error}</div>}

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
        <div className={focusedPlayerSession ? "game-layout is-player-focus" : "game-layout"}>
          {!focusedPlayerSession && <nav className="game-sessions" aria-label="Game sessions">
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
          </nav>}

          {selected && (
            <main className="game-table" aria-label={`${selected.title} session`}>
              <div className="game-session-heading game-session-heading-compact">
                <div>
                  <p className="eyebrow">{selected.status === "active" ? "Live session" : selected.status === "ended" ? "Session history" : "Waiting room"}</p>
                  <h2>{selected.title}</h2>
                </div>
                <div className="game-session-top-actions">
                  {isSessionDm && selected.campaignId === null && selected.status !== "ended" && <button className="game-text-button" type="button" onClick={() => setManagingPlayers(true)}>Manage players</button>}
                </div>
              </div>

              {isSessionDm && selected.status !== "ended" && (
                <div className="game-primary-actions" aria-label="Session controls">
                  {selected.status === "lobby" ? (
                    <button className="btn btn-primary" type="button" disabled={busy} onClick={beginSession}>Start session</button>
                  ) : null}
                  {selected.campaignId === null && selected.status === "active" && <button className="btn btn-ghost" type="button" onClick={() => setCreatingItem(true)}>Create item</button>}
                  {selected.status === "active" && <button className="btn btn-ghost" type="button" onClick={() => openEnemyLibrary()}>Manage enemies</button>}
                  {selected.status === "active" ? (
                    <button className="btn btn-danger" type="button" disabled={busy} onClick={finishSession}>End session</button>
                  ) : (
                    <button className="btn btn-danger" type="button" disabled={busy} onClick={discardSession}>Discard session</button>
                  )}
                </div>
              )}

              {selected.status === "ended" ? (
                <section className="game-focus-panel"><p className="eyebrow">Saved</p><h3>{(selected.attendeeRoster ?? displayedParticipants).length} {(selected.attendeeRoster ?? displayedParticipants).length === 1 ? "player" : "players"} attended</h3><p className="muted">Run by {selected.dmName} · {historyDate(selected)}</p>{combatants.some((combatant) => combatant.kind === "monster") && <p className="game-history-enemies"><strong>Enemies:</strong> {combatants.filter((combatant) => combatant.kind === "monster").map((combatant) => combatant.name).join(", ")}</p>}</section>
              ) : isSessionDm ? (
                <>
                  {selected.campaignId === null && selected.status === "active" && !preview && <SessionLootFeed game={selected} isDm />}
                </>
              ) : (
                <>
                  {ownCard && <section className="game-focus-panel game-own-hunter"><div><p className="eyebrow">Your Hunter</p><h3>{ownCard.name}</h3><span>{displayClass(ownParticipant!)} · Level {ownCard.level}</span></div><button className="btn btn-ghost" type="button" onClick={() => setOwnSheetOpen(true)}>Open sheet</button></section>}
                  {selected.campaignId === null && selected.status === "active" && !preview && <SessionLootFeed game={selected} characterId={ownParticipant?.characterId} isDm={false} threats={combatants} />}
                  {selected.status === "lobby" && <section className="game-focus-panel"><p className="eyebrow">Waiting</p><h3>{selected.dmName} is preparing the session</h3></section>}
                </>
              )}

              {isSessionDm && selected.status === "active" && (
                <SessionCombatSection
                  game={selected}
                  participants={displayedParticipants}
                  characters={characters ?? []}
                  isDm
                  disabled={combatBusy || busy}
                  enemyTemplates={enemyLibrary.templates}
                  onAddEnemy={addEnemyToBattle}
                />
              )}
            </main>
          )}
        </div>
      )}
      {selected && managingPlayers && <ManagePlayersDialog game={selected} characters={otherCharacters.concat((characters ?? []).filter((card) => displayedParticipants.some((participant) => participant.characterId === card.id)))} participants={displayedParticipants} unavailableOwnerUids={unavailableForSelected} busy={busy} onAdd={addHunter} onRemove={removeHunter} onClose={() => setManagingPlayers(false)} />}
      {selected && creatingItem && <CreateItemDialog gameId={selected.id} onClose={() => setCreatingItem(false)} />}
      {enemyDialogs}
      {ownSheetOpen && ownCard && <PaperSheetModal card={ownCard} onClose={() => setOwnSheetOpen(false)} />}
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
              <span><strong>{card.name}</strong><small>{card.ownerName || card.ownerEmail} · {cardClassName(card) || "Hunter"} · Level {card.level}</small></span>
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
