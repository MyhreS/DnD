import { cardClassName } from "@/features/hunter/lib/papersheet";
import type { Game, GameParticipant, HunterCard } from "@/types";

function TrashIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 7h16M9 7V4h6v3M7 7l1 13h8l1-13M10 11v5M14 11v5" />
    </svg>
  );
}

function participantClass(participant: GameParticipant, card?: HunterCard): string {
  const legacy = participant.classId.split(/[-_\s]+/).filter(Boolean).map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(" ");
  return (card ? cardClassName(card) : "")
    || participant.className
    || legacy
    || "Hunter";
}

function HunterRow({
  participant,
  card,
  invited,
  onOpen,
}: {
  participant: GameParticipant;
  card?: HunterCard;
  invited: boolean;
  onOpen: (card: HunterCard) => void;
}) {
  const content = (
    <>
      <span className="game-waiting-avatar" aria-hidden="true">{participant.name.trim().charAt(0).toLocaleUpperCase() || "?"}</span>
      <span className="game-waiting-player-name">
        <strong>{participant.name}</strong>
        <small>{participant.playerName || "Player"} · {participantClass(participant, card)} · Level {participant.level}</small>
      </span>
      <span className={invited ? "game-waiting-state is-invited" : "game-waiting-state"}>{invited ? "Invited" : "Joined"}</span>
      {card && <span className="game-waiting-arrow" aria-hidden="true">→</span>}
    </>
  );

  return card ? (
    <button className="game-waiting-player" type="button" aria-label={`Open ${participant.name} character sheet`} onClick={() => onOpen(card)}>
      {content}
    </button>
  ) : <div className="game-waiting-player">{content}</div>;
}

export function GameWaitingRoom({
  game,
  participants,
  invitations,
  characters,
  busy,
  onManagePlayers,
  onOpenSheet,
  onStart,
  onDiscard,
}: {
  game: Game;
  participants: GameParticipant[];
  invitations: GameParticipant[];
  characters: HunterCard[];
  busy: boolean;
  onManagePlayers?: () => void;
  onOpenSheet: (card: HunterCard) => void;
  onStart: () => void;
  onDiscard: () => void;
}) {
  const cardsById = new Map(characters.map((card) => [card.id, card]));
  const hunterCount = participants.length;
  const joinedLabel = `${hunterCount} ${hunterCount === 1 ? "Hunter" : "Hunters"} joined`;

  return (
    <section className="game-waiting-room" aria-label="Waiting room">
      <header className="game-waiting-heading">
        <div>
          <p className="eyebrow">Waiting room</p>
          <h2>{game.title}</h2>
          <p>Hosted by {game.dmName}</p>
        </div>
        <button className="game-icon-button game-discard-session" type="button" disabled={busy} aria-label="Discard session" title="Discard session" onClick={onDiscard}>
          <TrashIcon />
        </button>
      </header>

      <section className="game-waiting-roster" aria-labelledby="waiting-hunters-title">
        <header>
          <div>
            <p className="eyebrow">At the table</p>
            <h3 id="waiting-hunters-title">Hunters</h3>
            <span>{joinedLabel}{invitations.length ? ` · ${invitations.length} invited` : ""}</span>
          </div>
          {onManagePlayers && <button className="game-text-button" type="button" aria-label="Manage players" onClick={onManagePlayers}>Manage</button>}
        </header>

        <div className="game-waiting-list">
          {participants.map((participant) => (
            <HunterRow key={participant.uid} participant={participant} card={participant.characterId ? cardsById.get(participant.characterId) : undefined} invited={false} onOpen={onOpenSheet} />
          ))}
          {invitations.map((participant) => (
            <HunterRow key={`invite-${participant.uid}`} participant={participant} card={participant.characterId ? cardsById.get(participant.characterId) : undefined} invited onOpen={onOpenSheet} />
          ))}
          {participants.length === 0 && invitations.length === 0 && <p className="game-waiting-empty">No Hunters have joined yet.</p>}
        </div>
      </section>

      <footer className="game-waiting-start">
        <p>Start when the table is gathered.</p>
        <button className="btn btn-primary" type="button" disabled={busy} onClick={onStart}>Start session</button>
      </footer>
    </section>
  );
}
