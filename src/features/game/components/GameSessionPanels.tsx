import { useEffect, useMemo, useState, type FormEvent } from "react";
import { claimSessionLoot, createSessionLoot, subscribeSessionLoot, type SessionItemDraft } from "@/api/sessionLoot";
import { PaperSheetModal } from "@/features/hunter/components/papersheet/PaperSheetModal";
import type { Combatant, Game, GameParticipant, HunterCard, SessionLoot } from "@/types";

function searchText(card: HunterCard): string {
  return [card.name, card.ownerName, card.ownerEmail, card.classId, card.background].join(" ").toLocaleLowerCase();
}

export function ManagePlayersDialog({
  game,
  characters,
  participants,
  unavailableOwnerUids,
  busy,
  onAdd,
  onRemove,
  onClose,
}: {
  game: Game;
  characters: HunterCard[];
  participants: GameParticipant[];
  unavailableOwnerUids: Set<string>;
  busy: boolean;
  onAdd: (card: HunterCard) => Promise<void>;
  onRemove: (uid: string) => Promise<void>;
  onClose: () => void;
}) {
  const [query, setQuery] = useState("");
  const [openCard, setOpenCard] = useState<HunterCard | null>(null);
  const currentUids = useMemo(() => new Set(participants.map((participant) => participant.uid)), [participants]);
  const byId = new Map(characters.map((card) => [card.id, card]));
  const results = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase();
    return characters.filter((card) => !currentUids.has(card.ownerUid) && (!needle || searchText(card).includes(needle))).slice(0, 8);
  }, [characters, currentUids, query]);
  const locked = game.combat?.active === true;

  return (
    <div className="game-dialog-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="game-dialog game-manage-dialog" role="dialog" aria-modal="true" aria-labelledby="manage-players-title">
        <header><div><p className="eyebrow">Session roster</p><h2 id="manage-players-title">Manage players</h2></div><button className="game-dialog-close" type="button" onClick={onClose} aria-label="Close">×</button></header>
        {locked && <p className="game-dialog-note">Finish the current battle before changing the roster. Character sheets remain available below.</p>}
        <label className="game-field"><span>Add a player</span><input className="input" type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search player or Hunter…" /></label>
        {query.trim() && <div className="game-dialog-results">{results.map((card) => {
          const unavailable = unavailableOwnerUids.has(card.ownerUid);
          return <button key={card.id} type="button" disabled={busy || locked || unavailable} onClick={() => void onAdd(card)}><span><strong>{card.name}</strong><small>{card.ownerName || card.ownerEmail}</small></span><span>{unavailable ? "In session" : "Add"}</span></button>;
        })}{results.length === 0 && <p className="muted">No available Hunters match.</p>}</div>}
        <div className="game-dialog-roster">
          {participants.length === 0 ? <p className="muted">No players have been added.</p> : participants.map((participant) => {
            const card = participant.characterId ? byId.get(participant.characterId) : undefined;
            return <div className="game-dialog-player" key={participant.uid}><button type="button" disabled={!card} onClick={() => card && setOpenCard(card)}><strong>{participant.name}</strong><span>{participant.playerName || "Player"} · Level {participant.level}</span></button><button className="game-text-button" type="button" disabled={busy || locked} onClick={() => void onRemove(participant.uid)}>Remove</button></div>;
          })}
        </div>
        <footer><button className="btn btn-ghost" type="button" onClick={onClose}>Done</button></footer>
        {openCard && <PaperSheetModal card={openCard} readOnly onClose={() => setOpenCard(null)} />}
      </section>
    </div>
  );
}

export function CreateItemDialog({ gameId, onClose }: { gameId: string; onClose: () => void }) {
  const [category, setCategory] = useState<SessionItemDraft["category"]>("Weapon");
  const [name, setName] = useState("");
  const [carry, setCarry] = useState<SessionItemDraft["carry"]>("Significant");
  const [weight, setWeight] = useState("0");
  const [armorCategory, setArmorCategory] = useState<"Main Armor" | "Add-on Armor">("Main Armor");
  const [acValue, setAcValue] = useState("10");
  const [attackBonus, setAttackBonus] = useState("");
  const [damage, setDamage] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!name.trim() || busy) return;
    setBusy(true); setError("");
    try {
      await createSessionLoot(gameId, {
        name: name.trim(), category, carry, weightLb: Math.max(0, Number(weight) || 0), note: note.trim() || undefined,
        armorCategory: category === "Armor" ? armorCategory : undefined,
        acValue: category === "Armor" ? Math.max(0, Number(acValue) || 0) : undefined,
        attackBonus: category === "Weapon" ? attackBonus.trim() || undefined : undefined,
        damage: category === "Weapon" ? damage.trim() || undefined : undefined,
        weaponNotes: category === "Weapon" ? note.trim() || undefined : undefined,
      });
      onClose();
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Could not create the item."); }
    finally { setBusy(false); }
  }

  return <div className="game-dialog-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}><form className="game-dialog" role="dialog" aria-modal="true" aria-labelledby="create-item-title" onSubmit={submit}>
    <header><div><p className="eyebrow">Session item</p><h2 id="create-item-title">Create an item</h2></div><button className="game-dialog-close" type="button" onClick={onClose} aria-label="Close">×</button></header>
    <p className="muted">Players will see this immediately and one Hunter can take it.</p>
    {error && <div className="banner-error" role="alert">{error}</div>}
    <div className="game-dialog-grid">
      <label className="game-field game-dialog-wide"><span>Name</span><input className="input" value={name} maxLength={100} onChange={(event) => setName(event.target.value)} autoFocus /></label>
      <label className="game-field"><span>Type</span><select className="input" value={category} onChange={(event) => setCategory(event.target.value as SessionItemDraft["category"])}><option>Weapon</option><option>Armor</option><option>Gear</option></select></label>
      <label className="game-field"><span>Carrying</span><select className="input" value={carry} onChange={(event) => setCarry(event.target.value as SessionItemDraft["carry"])}><option>Insignificant</option><option>Significant</option><option>Oversized</option></select></label>
      <label className="game-field"><span>Weight (lb)</span><input className="input" type="number" min="0" max="999" step="0.1" value={weight} onChange={(event) => setWeight(event.target.value)} /></label>
      {category === "Armor" && <><label className="game-field"><span>Armor type</span><select className="input" value={armorCategory} onChange={(event) => setArmorCategory(event.target.value as typeof armorCategory)}><option>Main Armor</option><option>Add-on Armor</option></select></label><label className="game-field"><span>{armorCategory === "Main Armor" ? "Base AC" : "AC bonus"}</span><input className="input" type="number" min="0" max="30" value={acValue} onChange={(event) => setAcValue(event.target.value)} /></label></>}
      {category === "Weapon" && <><label className="game-field"><span>Attack bonus</span><input className="input" value={attackBonus} maxLength={80} onChange={(event) => setAttackBonus(event.target.value)} placeholder="e.g. +1" /></label><label className="game-field"><span>Damage</span><input className="input" value={damage} maxLength={120} onChange={(event) => setDamage(event.target.value)} placeholder="e.g. 1d8 piercing" /></label></>}
      <label className="game-field game-dialog-wide"><span>Notes</span><textarea className="input" value={note} maxLength={1000} onChange={(event) => setNote(event.target.value)} /></label>
    </div>
    <footer><button className="btn btn-ghost" type="button" onClick={onClose}>Cancel</button><button className="btn btn-primary" type="submit" disabled={busy || !name.trim()}>{busy ? "Creating…" : "Create item"}</button></footer>
  </form></div>;
}

export function SessionLootFeed({ game, characterId, isDm, threats = [] }: { game: Game; characterId?: string | null; isDm: boolean; threats?: Combatant[] }) {
  const [loot, setLoot] = useState<SessionLoot[]>([]);
  const [claiming, setClaiming] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  useEffect(() => subscribeSessionLoot(game.id, setLoot), [game.id]);
  const available = loot.filter((entry) => entry.status === "available");
  const latestThreat = threats.filter((combatant) => combatant.kind === "monster").sort((a, b) => b.createdAt - a.createdAt)[0];
  if (!isDm && available.length === 0 && !message && !latestThreat) return null;
  const shown = isDm ? loot.slice(0, 5) : available.slice(0, 2);
  const showThreat = Boolean(latestThreat && shown.length === 0 && !message);
  return <section className="game-focus-panel" aria-labelledby="session-items-title"><header><div><p className="eyebrow">{showThreat ? "Encounter" : "Found during play"}</p><h3 id="session-items-title">{isDm ? "Session items" : shown.length > 0 ? "Something was found" : message ? "Item secured" : "A threat appears"}</h3></div>{isDm && <span>{available.length} available</span>}</header>
    {message && <p className="game-success" role="status">{message}</p>}
    {shown.length === 0 ? !message && (latestThreat ? <div className="game-threat"><strong>{latestThreat.name}</strong><span>The DM has added this enemy. Details remain hidden until revealed.</span></div> : <p className="muted">No items created yet.</p>) : <div className="game-loot-list">{shown.map((entry) => <article key={entry.id}><div><strong>{entry.item.name}</strong><span>{entry.item.category} · {entry.item.carry}{entry.item.damage ? ` · ${entry.item.damage}` : ""}</span>{entry.item.note && <small>{entry.item.note}</small>}</div>{isDm ? <span>{entry.status === "claimed" ? `Taken by ${entry.claimedByName || "Hunter"}` : "Available"}</span> : <button className="btn btn-primary" type="button" disabled={!characterId || claiming === entry.id} onClick={async () => { if (!characterId) return; setClaiming(entry.id); setMessage(""); try { await claimSessionLoot(game.id, entry.id, characterId); setMessage(`${entry.item.name} was added to your Hunter.`); } catch (reason) { setMessage(reason instanceof Error ? reason.message : "The item could not be taken."); } finally { setClaiming(null); } }}>{claiming === entry.id ? "Taking…" : "Take"}</button>}</article>)}</div>}
  </section>;
}
