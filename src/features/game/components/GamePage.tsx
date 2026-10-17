import { useEffect, useMemo, useState, type FormEvent } from "react";
import {
  addGameParticipant,
  createGameSession,
  discardGameSession,
  finishGameSession,
  removeGameParticipant,
  respondToGameInvite,
  startGame,
  subscribeActiveGameSeats,
  subscribeParticipants,
  subscribeUserGames,
  type ActiveGameSeat,
} from "@/api/games";
import { getClass } from "@/data/classes";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { isPreviewActive, previewGame, previewParticipants } from "@/dev/preview";
import { useAllCharacters } from "@/features/game/hooks/useAllCharacters";
import { useEnemyLibrary } from "@/features/game/hooks/useEnemyLibrary";
import { templateStats } from "@/features/game/lib/enemies";
import { searchHunters } from "@/features/game/lib/hunterSearch";
import { encounterCombatants, participantInitiative } from "@/features/game/lib/combatPresentation";
import { useAuthStore } from "@/features/auth/store/authStore";
import { PaperSheetModal } from "@/features/hunter/components/papersheet/PaperSheetModal";
import { cardClassName } from "@/features/hunter/lib/papersheet";
import { useCombatSync } from "@/features/play/hooks/useCombatSync";
import { emptyEncounter } from "@/features/play/lib/turnTimer";
import { useCombatStore } from "@/features/play/store/combatStore";
import type { EnemyStats, EnemyTemplate, Game, GameParticipant, HunterCard } from "@/types";
import { AddHunterToBattleDialog } from "./AddHunterToBattleDialog";
import { EnemyEditorDialog } from "./EnemyEditorDialog";
import { EnemyLibraryDialog } from "./EnemyLibraryDialog";
import { GamesMenu } from "./GamesMenu";
import { GameSessionHeader } from "./GameSessionHeader";
import { GameWaitingRoom } from "./GameWaitingRoom";
import { CreateItemDialog, ManagePlayersDialog, SessionLootFeed, SessionSwitchRequests } from "./GameSessionPanels";
import { SessionBattleView } from "./SessionBattleView";
import { SessionCombatControls, SessionCombatSection } from "./SessionCombatSection";
import { PlayerShopPanel } from "./PlayerShopPanel";
import { SessionShopSection } from "./SessionShopSection";
import "./game.css";

const DEFAULT_TITLE = () => `Session ${new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(new Date())}`;
type GameConfirmation = "end-battle" | "finish-session" | "discard-session";

function displayClass(participant: GameParticipant): string {
  return participant.className || getClass(participant.classId)?.name || participant.classId || "Hunter";
}

function historyDate(game: Game): string {
  const value = game.endedAt || game.createdAt;
  return value ? new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(new Date(value)) : "Saved session";
}

export function GamePage() {
  const user = useAuthStore((state) => state.user);
  const member = useAuthStore((state) => state.member);
  const preview = isPreviewActive();
  const previewGameMode = preview ? new URLSearchParams(window.location.search).get("game") : null;
  const emptyGamePreview = previewGameMode === "empty";
  const switchInvitePreview = previewGameMode === "invite";
  const historyPreview = previewGameMode === "history";
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
  const [dismissedBattleKey, setDismissedBattleKey] = useState<string | null>(null);
  const [lastCombatActive, setLastCombatActive] = useState(false);
  const [showingPrevious, setShowingPrevious] = useState(false);
  const [participants, setParticipants] = useState<GameParticipant[]>([]);
  const [previewRosters, setPreviewRosters] = useState<Record<string, GameParticipant[]>>({
    "preview-game": previewParticipants(),
  });
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [managingPlayers, setManagingPlayers] = useState(false);
  const [addingBattleHunter, setAddingBattleHunter] = useState(false);
  const [creatingItem, setCreatingItem] = useState(false);
  const [managingEnemies, setManagingEnemies] = useState(false);
  const [editingEnemy, setEditingEnemy] = useState<EnemyTemplate | "new" | null>(null);
  const [openSheet, setOpenSheet] = useState<HunterCard | null>(null);
  const [confirmation, setConfirmation] = useState<GameConfirmation | null>(null);

  useEffect(() => {
    if (!user) return;
    if (preview) {
      const timer = window.setTimeout(() => {
        const game = emptyGamePreview ? null : previewGame();
        const request = game && switchInvitePreview ? {
          ...previewGame(),
          id: "preview-switch-request",
          campaignId: null,
          title: "The Ashen Cathedral",
          dmUid: "preview-dm-2",
          dmName: "Second DM",
          participantUids: [],
          participantRoster: [],
          invitedUids: [user.uid],
          inviteRoster: [previewParticipants()[0]],
          combat: emptyEncounter(),
        } : null;
        const history = game && historyPreview ? [{
          ...game,
          id: "preview-history",
          title: "The Old Cathedral",
          status: "ended" as const,
          endedAt: Date.now() - 86_400_000,
        }] : [];
        setGames(game ? [game, ...history, ...(request ? [request] : [])] : []);
        setSelectedId(null);
        setLoading(false);
      }, 0);
      return () => window.clearTimeout(timer);
    }
    return subscribeUserGames(
      user.uid,
      (next) => {
        setGames(next);
        const joined = next.filter((game) => game.dmUid === user.uid || game.participantUids.includes(user.uid));
        setSelectedId((current) => current && joined.some((game) => game.id === current) ? current : null);
        setLoading(false);
        setError(null);
      },
      () => {
        setLoading(false);
        setError("Could not load your game sessions.");
      },
    );
  }, [emptyGamePreview, historyPreview, preview, switchInvitePreview, user]);

  useEffect(() => {
    if (preview) return;
    return subscribeActiveGameSeats(
      setActiveSeats,
      () => setError("Could not load player availability."),
    );
  }, [preview]);

  const selected = games.find((game) => game.id === selectedId) ?? null;
  const pendingInvitations = games.filter((game) => Boolean(user && game.invitedUids.includes(user.uid)));
  const joinedGames = games.filter((game) => Boolean(user && (game.dmUid === user.uid || game.participantUids.includes(user.uid))));
  const currentGames = joinedGames.filter((game) => game.status !== "ended");
  const activeGame = currentGames[0] ?? null;
  const history = joinedGames.filter((game) => game.status === "ended");
  const effectiveSeats = useMemo(() => {
    if (!preview) return activeSeats;
    const seats = new Map<string, ActiveGameSeat>();
    for (const game of games.filter((item) => item.status !== "ended")) {
      seats.set(game.dmUid, { uid: game.dmUid, gameId: game.id, role: "dm" });
      game.participantUids.forEach((uid) => seats.set(uid, { uid, gameId: game.id, role: "player" }));
    }
    return seats;
  }, [activeSeats, games, preview]);
  const switchableOwnerUids = useMemo(() => new Set(
    [...effectiveSeats.values()].filter((seat) => seat.role === "player").map((seat) => seat.uid),
  ), [effectiveSeats]);
  const unavailableOwnerUids = useMemo(() => new Set(
    [...effectiveSeats.values()].filter((seat) => seat.role === "dm").map((seat) => seat.uid),
  ), [effectiveSeats]);
  const unavailableForSelected = useMemo(() => new Set(
    [...effectiveSeats.values()]
      .filter((seat) => seat.gameId !== selected?.id && seat.role === "dm")
      .map((seat) => seat.uid),
  ), [effectiveSeats, selected?.id]);
  const switchableForSelected = useMemo(() => new Set(
    [...effectiveSeats.values()]
      .filter((seat) => seat.gameId !== selected?.id && seat.role === "player")
      .map((seat) => seat.uid),
  ), [effectiveSeats, selected?.id]);
  const isSessionDm = Boolean(user && selected?.dmUid === user.uid);
  const battleKey = selected?.combat ? `${selected.id}:${selected.combat.encounterId}` : null;
  const battleMode = Boolean(selected?.status === "active" && selected.combat?.active && dismissedBattleKey !== battleKey);
  const displayedParticipants = selected && selected.campaignId === null
    ? selected.participantRoster
    : participants;
  const ownParticipant = displayedParticipants.find((participant) => participant.uid === user?.uid);
  const ownCard = ownParticipant?.characterId ? charactersById.get(ownParticipant.characterId) : undefined;
  const focusedPlayerSession = Boolean(selected && !isSessionDm && selected.status !== "ended");

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

  const combatActive = Boolean(selected?.combat?.active);
  // A dismissal only holds for the battle that was running when it happened.
  // The DM can "continue" an encounter, which reuses its encounterId, so the key
  // alone cannot tell the two runs apart — the dismissal has to clear when combat
  // stops. Adjusting the state during render rather than in an effect is React's
  // documented pattern for this and avoids the extra render pass.
  if (lastCombatActive !== combatActive) {
    setLastCombatActive(combatActive);
    if (!combatActive) setDismissedBattleKey(null);
  }

  useCombatSync(selectedId, !isSessionDm);
  const combatBusy = useCombatStore((state) => state.busy);
  const combatError = useCombatStore((state) => state.error);
  const combatants = useCombatStore((state) => state.combatants);
  const addMonster = useCombatStore((state) => state.addMonster);

  async function perform(work: () => Promise<void>, message: string): Promise<boolean> {
    setBusy(true);
    setError(null);
    setNotice(null);
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
    const updateShop = (event: Event) => {
      const detail = (event as CustomEvent<{ gameId: string; shop: Game["shop"] }>).detail;
      if (detail?.gameId) updatePreviewGame(detail.gameId, { shop: detail.shop });
    };
    window.addEventListener("cs-preview-combat", updateCombat);
    window.addEventListener("cs-preview-shop", updateShop);
    return () => {
      window.removeEventListener("cs-preview-combat", updateCombat);
      window.removeEventListener("cs-preview-shop", updateShop);
    };
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
        invitedUids: [],
        inviteRoster: [],
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

  /** During a battle, roster changes also change who is in the fight: a removed
   * or switched-out Hunter leaves it, and a newly added Hunter rolls in. */
  async function syncBattleRoster(addCard: HunterCard | null, removeCharacterId: string | null) {
    const combat = selected?.combat;
    if (!selected || !combat?.active) return;
    const store = useCombatStore.getState();
    if (removeCharacterId) {
      const inEncounter = encounterCombatants(store.combatants, combat);
      const row = inEncounter.find((combatant) => combatant.kind === "pc" && combatant.characterId === removeCharacterId);
      if (row) await store.remove(selected.id, row.id, selected, inEncounter);
    }
    if (addCard) {
      await store.addHunters(selected.id, [{ characterId: addCard.id, name: addCard.name, dexMod: participantInitiative(addCard) }], combat.encounterId);
    }
  }

  async function addHunter(card: HunterCard) {
    if (!selected) return;
    const previous = displayedParticipants.find((participant) => participant.uid === card.ownerUid)?.characterId ?? null;
    const switchedOut = previous && previous !== card.id ? previous : null;
    const occupied = effectiveSeats.get(card.ownerUid);
    if (occupied?.role === "dm" && occupied.gameId !== selected.id) {
      setError(`${card.ownerName || card.name} is currently running another session.`);
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
      await syncBattleRoster(card, switchedOut);
      return;
    }
    let joined = false;
    await perform(async () => {
      const pending = await addGameParticipant(selected, card);
      if (pending) setNotice(`Switch request sent to ${card.ownerName || card.name}.`);
      joined = !pending;
    }, "Could not add that player.");
    if (joined) await syncBattleRoster(card, switchedOut);
  }

  async function respondToInvite(game: Game, action: "accept" | "decline") {
    if (preview && user) {
      setGames((current) => current.map((item) => {
        if (item.id === game.id) {
          const invitation = item.inviteRoster.find((participant) => participant.uid === user.uid);
          return {
            ...item,
            participantUids: action === "accept" ? [...new Set([...item.participantUids, user.uid])] : item.participantUids,
            participantRoster: action === "accept" && invitation
              ? [...item.participantRoster.filter((participant) => participant.uid !== user.uid), invitation]
              : item.participantRoster,
            invitedUids: item.invitedUids.filter((uid) => uid !== user.uid),
            inviteRoster: item.inviteRoster.filter((participant) => participant.uid !== user.uid),
          };
        }
        if (action === "accept") {
          return {
            ...item,
            participantUids: item.participantUids.filter((uid) => uid !== user.uid),
            participantRoster: item.participantRoster.filter((participant) => participant.uid !== user.uid),
          };
        }
        return item;
      }));
      if (action === "accept") setSelectedId(game.id);
      return;
    }
    const ok = await perform(
      () => respondToGameInvite(game.id, action),
      `Could not ${action} that session request.`,
    );
    if (ok && action === "accept") setSelectedId(game.id);
  }

  async function removeHunter(uid: string) {
    if (!selected) return;
    const removedCharacterId = displayedParticipants.find((participant) => participant.uid === uid)?.characterId ?? null;
    if (preview) {
      setPreviewRosters((current) => ({
        ...current,
        [selected.id]: (current[selected.id] ?? []).filter((item) => item.uid !== uid),
      }));
      updatePreviewGame(selected.id, {
        participantUids: selected.participantUids.filter((item) => item !== uid),
        participantRoster: selected.participantRoster.filter((item) => item.uid !== uid),
      });
      await syncBattleRoster(null, removedCharacterId);
      return;
    }
    const removed = await perform(() => removeGameParticipant(selected, uid), "Could not remove that player.");
    if (removed) await syncBattleRoster(null, removedCharacterId);
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
    if (preview) {
      setPreviewRosters((current) => {
        const next = { ...current };
        delete next[selected.id];
        return next;
      });
      setGames((current) => current.filter((game) => game.id !== selected.id));
      setSelectedId(null);
      return;
    }
    await perform(() => discardGameSession(selected.id), "Could not discard the session.");
  }

  async function addEnemyToBattle(template: EnemyTemplate, encounterId = selected?.combat?.encounterId ?? 0): Promise<boolean> {
    if (!selected) return false;
    return addMonster(selected.id, { ...templateStats(template), enemyTemplateId: template.id }, encounterId);
  }

  function openEnemyLibrary() {
    setManagingEnemies(true);
  }

  function closeEnemyLibrary() {
    setManagingEnemies(false);
  }

  async function endBattle() {
    if (!selected?.combat) return;
    await useCombatStore.getState().closeSessionEncounter(selected.id, selected.combat);
  }

  async function confirmGameAction() {
    const action = confirmation;
    setConfirmation(null);
    if (action === "end-battle") await endBattle();
    if (action === "finish-session") await finishSession();
    if (action === "discard-session") await discardSession();
  }

  function openEnemyEditor(template: EnemyTemplate | "new") {
    setManagingEnemies(false);
    setEditingEnemy(template);
  }

  function closeEnemyEditor() {
    setEditingEnemy(null);
    setManagingEnemies(true);
  }

  async function saveEnemy(stats: EnemyStats, addToCurrentBattle: boolean, saveToLibrary: boolean) {
    if (!saveToLibrary) {
      // A one-off foe: straight into the battle, never into the library.
      if (selected && await addMonster(selected.id, stats, selected.combat?.encounterId ?? 0)) closeEnemyEditor();
      return;
    }
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
  const confirmationCopy = confirmation === "end-battle" ? {
    title: "End battle?",
    description: "Everyone will return to the session view. Initiative, conditions, enemies, and damage stay saved.",
    confirmLabel: "End battle",
    cancelLabel: "Keep battling",
  } : confirmation === "finish-session" ? {
    title: "End session?",
    description: "The party, enemies, and damage will be saved in session history.",
    confirmLabel: "End session",
    cancelLabel: "Keep playing",
  } : confirmation === "discard-session" ? {
    title: "Discard session?",
    description: "This unstarted session will be removed and will not appear in session history.",
    confirmLabel: "Discard session",
    cancelLabel: "Keep session",
  } : null;
  const confirmationDialog = confirmationCopy ? (
    <ConfirmDialog
      {...confirmationCopy}
      onCancel={() => setConfirmation(null)}
      onConfirm={() => void confirmGameAction()}
    />
  ) : null;

  if (!creating && selected && battleMode) {
    return (
      <div className="game-page game-page-battle">
        {(error || charactersError || combatError || enemyLibrary.error) && <div className="banner-error" role="alert">{error || charactersError || combatError || enemyLibrary.error}</div>}
        {notice && <div className="game-notice" role="status">{notice}</div>}
        <SessionSwitchRequests
          invitations={pendingInvitations}
          hasCurrentSession={Boolean(activeGame)}
          busy={busy}
          onRespond={respondToInvite}
        />
        <SessionBattleView
          game={selected}
          characters={characters ?? []}
          isDm={isSessionDm}
          onBack={() => setDismissedBattleKey(battleKey)}
          dmControls={isSessionDm ? (
            <SessionCombatControls
              game={selected}
              disabled={combatBusy || busy}
              onAddHunter={() => setAddingBattleHunter(true)}
              onAddEnemy={openEnemyLibrary}
              onCreateItem={() => setCreatingItem(true)}
              canCreateItem={selected.campaignId === null}
              onEndBattle={() => setConfirmation("end-battle")}
            />
          ) : null}
          disabled={combatBusy || busy}
        />
        {enemyDialogs}
        {addingBattleHunter && <AddHunterToBattleDialog game={selected} participants={displayedParticipants} characters={characters ?? []} busy={combatBusy || busy} onClose={() => setAddingBattleHunter(false)} />}
        {creatingItem && <CreateItemDialog gameId={selected.id} onClose={() => setCreatingItem(false)} />}
        {confirmationDialog}
      </div>
    );
  }

  return (
    <div className="game-page">
      {(error || charactersError || combatError || enemyLibrary.error) && <div className="banner-error" role="alert">{error || charactersError || combatError || enemyLibrary.error}</div>}
      {notice && <div className="game-notice" role="status">{notice}</div>}

      <SessionSwitchRequests
        invitations={pendingInvitations}
        hasCurrentSession={Boolean(activeGame)}
        busy={busy}
        onRespond={respondToInvite}
      />

      {creating && (
        <CreateSession
          characters={otherCharacters}
          unavailableOwnerUids={unavailableOwnerUids}
          switchableOwnerUids={switchableOwnerUids}
          busy={busy}
          onCancel={() => setCreating(false)}
          onCreate={createSession}
        />
      )}

      {!creating && !selected && (
        <GamesMenu
          currentGames={currentGames}
          previousGames={history}
          showingPrevious={showingPrevious}
          loading={loading}
          onTogglePrevious={() => {
            setError(null);
            setShowingPrevious((current) => !current);
          }}
          onOpen={(id) => {
            setError(null);
            setSelectedId(id);
          }}
          onCreate={() => {
            if (activeGame) {
              setError("End your current game before creating another one.");
              return;
            }
            setError(null);
            setCreating(true);
          }}
        />
      )}

      {!creating && selected && (
        <div className={isSessionDm && selected.status === "lobby" ? "game-layout is-dm-waiting" : focusedPlayerSession ? "game-layout is-player-focus" : "game-layout"}>
          <main className="game-table" aria-label={`${selected.title} session`}>
              <button className="game-back-button" type="button" onClick={() => setSelectedId(null)}>← Games</button>
              {isSessionDm && selected.status === "lobby" ? (
                <GameWaitingRoom
                  game={selected}
                  participants={displayedParticipants}
                  invitations={selected.inviteRoster}
                  characters={characters ?? []}
                  busy={busy}
                  onManagePlayers={selected.campaignId === null ? () => setManagingPlayers(true) : undefined}
                  onOpenSheet={setOpenSheet}
                  onStart={() => void beginSession()}
                  onDiscard={() => setConfirmation("discard-session")}
                />
              ) : <>
                <GameSessionHeader
                  game={selected}
                  isDm={isSessionDm}
                  disabled={busy || combatBusy}
                  canManagePlayers={selected.campaignId === null}
                  canCreateItem={selected.campaignId === null}
                  onManagePlayers={() => setManagingPlayers(true)}
                  onCreateItem={() => setCreatingItem(true)}
                  onManageEnemies={openEnemyLibrary}
                  onEndSession={() => setConfirmation("finish-session")}
                />

              {selected.status === "ended" ? (
                <section className="game-focus-panel"><p className="eyebrow">Saved</p><h3>{(selected.attendeeRoster ?? displayedParticipants).length} {(selected.attendeeRoster ?? displayedParticipants).length === 1 ? "player" : "players"} attended</h3><p className="muted">Run by {selected.dmName} · {historyDate(selected)}</p>{combatants.some((combatant) => combatant.kind === "monster") && <p className="game-history-enemies"><strong>Enemies:</strong> {combatants.filter((combatant) => combatant.kind === "monster").map((combatant) => combatant.name).join(", ")}</p>}</section>
              ) : isSessionDm ? (
                <>
                  {selected.campaignId === null && selected.status === "active" && !preview && <SessionLootFeed game={selected} isDm />}
                </>
              ) : (
                <>
                  {ownCard && <section className="game-focus-panel game-own-hunter"><div><p className="eyebrow">Your Hunter</p><h3>{ownCard.name}</h3><span>{displayClass(ownParticipant!)} · Level {ownCard.level}</span></div><button className="btn btn-ghost" type="button" onClick={() => setOpenSheet(ownCard)}>Open sheet</button></section>}
                  {selected.status === "active" && <PlayerShopPanel game={selected} characterId={ownParticipant?.characterId} coins={ownCard?.coins ?? 0} live={!preview} />}
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
                  onReturnToBattle={() => setDismissedBattleKey(null)}
                />
              )}

              {isSessionDm && selected.status === "active" && (
                <SessionShopSection game={selected} disabled={busy} live={!preview} />
              )}
              </>}
          </main>
        </div>
      )}
      {selected && managingPlayers && <ManagePlayersDialog game={selected} characters={otherCharacters} participants={displayedParticipants} invitations={selected.inviteRoster} unavailableOwnerUids={unavailableForSelected} switchableOwnerUids={switchableForSelected} busy={busy || combatBusy} error={error} notice={notice} onAdd={addHunter} onRemove={removeHunter} onClose={() => setManagingPlayers(false)} />}
      {selected && creatingItem && <CreateItemDialog gameId={selected.id} onClose={() => setCreatingItem(false)} />}
      {enemyDialogs}
      {openSheet && <PaperSheetModal card={openSheet} readOnly={openSheet.ownerUid !== user?.uid} onClose={() => setOpenSheet(null)} />}
      {confirmationDialog}
    </div>
  );
}

function CreateSession({
  characters,
  unavailableOwnerUids,
  switchableOwnerUids,
  busy,
  onCancel,
  onCreate,
}: {
  characters: HunterCard[];
  unavailableOwnerUids: Set<string>;
  switchableOwnerUids: Set<string>;
  busy: boolean;
  onCancel: () => void;
  onCreate: (title: string, hunters: HunterCard[]) => Promise<void>;
}) {
  const [title, setTitle] = useState(DEFAULT_TITLE);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<HunterCard[]>([]);
  const results = useMemo(() => searchHunters(characters, query, query.trim() ? 20 : 10), [characters, query]);

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
          <h2>Create game</h2>
        </div>
        <button className="game-text-button" type="button" onClick={onCancel}>Cancel</button>
      </div>
      <label className="game-field">
        <span>Session name</span>
        <input className="input" value={title} maxLength={80} onChange={(event) => setTitle(event.target.value)} autoFocus />
      </label>
      <label className="game-field">
        <span>Search for a player or Hunter</span>
        <input className="input" type="search" value={query} placeholder="Player name, Hunter name, class…" onChange={(event) => setQuery(event.target.value)} />
      </label>
      <div className="game-hunter-results" aria-label="Hunter search results">
        {results.map((card) => {
          const picked = selected.some((hunter) => hunter.id === card.id);
          const unavailable = unavailableOwnerUids.has(card.ownerUid);
          const switchable = switchableOwnerUids.has(card.ownerUid);
          return (
            <button key={card.id} type="button" disabled={unavailable} className={picked ? "game-hunter-result is-picked" : "game-hunter-result"} onClick={() => choose(card)}>
              <span><strong>{card.name}</strong><small>{card.ownerName || card.ownerEmail} · {cardClassName(card) || "Hunter"} · Level {card.level}</small></span>
              <span>{unavailable ? "Running session" : picked ? "Added" : switchable ? "Ask to switch" : "Add"}</span>
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
      <button className="btn btn-primary" type="submit" disabled={busy || !title.trim()}>{busy ? "Creating…" : "Create game"}</button>
    </form>
  );
}
