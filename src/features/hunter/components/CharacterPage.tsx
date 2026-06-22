import { useState } from "react";
import { useAuthStore } from "@/features/auth/store/authStore";
import { usePlayerStore } from "@/features/hunter/store/playerStore";
import { useHunterCard } from "../hooks/useHunterCard";
import { CharacterEditor } from "./CharacterEditor";
import { HunterCardView } from "./HunterCardView";
import { CharacterTrackers } from "./CharacterTrackers";
import { InventoryPanel } from "./InventoryPanel";
import { useGameStore, currentGame } from "@/features/play/store/gameStore";
import { useCampaignStore } from "@/features/campaigns/store/campaignStore";
import { emptyCard } from "@/lib/character";
import { exportCharacterPdf } from "../lib/characterPdf";
import { CardSkeleton } from "@/components/Skeleton";
import { AsyncButton } from "@/components/AsyncButton";
import { Sigil } from "@/components/icons";
import type { HunterCard } from "@/types";

export function CharacterPage() {
  const user = useAuthStore((s) => s.user);
  const { card, characters, selectedId, select, status, saving, error, save, archive } = usePlayerStore();
  const activeCampaignId = useCampaignStore((s) => s.activeId);
  const gameId = currentGame(useGameStore((s) => s.games), activeCampaignId)?.id ?? null;
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<HunterCard | null>(null);

  useHunterCard();

  function newDraft(): HunterCard {
    return emptyCard({
      ownerUid: user!.uid,
      email: user!.email ?? "",
      displayName: user!.displayName ?? user!.email ?? "Hunter",
    });
  }
  function startNew() {
    setDraft(newDraft());
    setEditing(false);
  }

  if (status === "idle" || status === "loading") {
    return (
      <div>
        <p className="eyebrow">Your Hunter</p>
        <h1 className="page-title">Character</h1>
        <p className="page-intro">Unrolling your character sheet…</p>
        <CardSkeleton lines={4} />
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="card center">
        <p className="muted">{error ?? "Something went wrong."}</p>
        <button
          className="btn btn-ghost"
          style={{ maxWidth: 200, margin: "12px auto 0" }}
          onClick={() => user && usePlayerStore.getState().subscribe(user.uid)}
        >
          Try again
        </button>
      </div>
    );
  }

  const hasCard = !!card && !!card.classId && !!card.name;
  const creating = !!draft;

  async function handleSave(next: HunterCard) {
    const ok = await save(next);
    if (ok) {
      setEditing(false);
      setDraft(null);
    }
  }

  async function handleDelete() {
    const ok = await archive(gameId);
    if (ok) setEditing(false);
  }

  // No characters at all → the welcome splash.
  if (characters.length === 0 && !creating) {
    return (
      <div className="splash" style={{ minHeight: "60vh" }}>
        <Sigil width={72} height={72} />
        <div className="center" style={{ maxWidth: 320 }}>
          <h1 style={{ marginBottom: 6 }}>No hunter yet</h1>
          <p className="muted">
            Create your character to join the hunt. We'll walk you through it step by step —
            class, abilities, skills and armor. The maths is done for you.
          </p>
        </div>
        <button className="btn btn-primary" style={{ maxWidth: 280 }} onClick={startNew}>
          Create character
        </button>
      </div>
    );
  }

  // Creating a new hunter, or editing an existing one → the guided builder.
  if (creating || editing) {
    const initial = creating ? draft! : card!;
    return (
      <div className="reading">
        <p className="eyebrow">Your Hunter</p>
        <h1 className="page-title">{creating ? "Forge your hunter" : "Edit character"}</h1>
        <p className="page-intro">
          {creating ? "Five steps from the handbook." : "Adjust your build below."}
        </p>
        <CharacterEditor
          initial={initial}
          saving={saving}
          error={error}
          onSave={handleSave}
          onCancel={() => { setEditing(false); setDraft(null); }}
          onDelete={creating ? undefined : handleDelete}
          lockClass={!creating}
        />
      </div>
    );
  }

  // Viewing a character → switcher + the play sheet.
  return (
    <div>
      <div className="row between no-print" style={{ marginBottom: 12 }}>
        <div>
          <p className="eyebrow" style={{ margin: 0 }}>Your Hunter</p>
          <h1 className="page-title" style={{ margin: 0 }}>Character</h1>
        </div>
        <div className="row" style={{ gap: 8 }}>
          <AsyncButton className="btn-ghost btn-sm" pendingText="Generating…" showDone={false} onClick={() => exportCharacterPdf(card!)}>
            Export PDF
          </AsyncButton>
          <button className="btn btn-ghost btn-sm" onClick={() => setEditing(true)}>Edit</button>
        </div>
      </div>

      <div className="chip-row no-print" style={{ marginBottom: 14 }}>
        {characters.map((c) => (
          <button
            key={c.id}
            className={`chip selectable${c.id === selectedId ? " selected" : ""}`}
            onClick={() => select(c.id)}
          >
            {c.name || "Unnamed"}
          </button>
        ))}
        <button className="chip selectable" onClick={startNew}>+ New hunter</button>
      </div>

      {hasCard ? (
        <div className="desk-2col">
          <aside className="desk-aside no-print">
            <CharacterTrackers card={card!} />
          </aside>
          <div className="desk-main">
            <div className="print-sheet">
              <HunterCardView card={card!} />
            </div>
            <div className="no-print" style={{ marginTop: 14 }}>
              <InventoryPanel card={card!} editable />
            </div>
          </div>
        </div>
      ) : (
        <div className="card center">
          <p className="muted" style={{ margin: 0 }}>This hunter is a draft — tap Edit to finish it.</p>
        </div>
      )}
    </div>
  );
}
