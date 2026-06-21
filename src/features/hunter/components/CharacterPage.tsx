import { useState } from "react";
import { useAuthStore } from "@/features/auth/store/authStore";
import { usePlayerStore } from "@/features/hunter/store/playerStore";
import { useHunterCard } from "../hooks/useHunterCard";
import { CharacterEditor } from "./CharacterEditor";
import { HunterCardView } from "./HunterCardView";
import { CharacterTrackers } from "./CharacterTrackers";
import { emptyCard } from "@/lib/character";
import { exportCharacterPdf } from "../lib/characterPdf";
import { CardSkeleton } from "@/components/Skeleton";
import { AsyncButton } from "@/components/AsyncButton";
import { Sigil } from "@/components/icons";
import type { HunterCard } from "@/types";

export function CharacterPage() {
  const user = useAuthStore((s) => s.user);
  const { card, status, saving, error, save, remove } = usePlayerStore();
  const [editing, setEditing] = useState(false);

  useHunterCard();

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

  async function handleSave(next: HunterCard) {
    const ok = await save(next);
    if (ok) setEditing(false);
  }

  async function handleDelete() {
    if (!card) return;
    const ok = await remove(card.uid);
    if (ok) setEditing(false);
  }

  // First-time / editing → the guided builder.
  if (editing || !hasCard) {
    const initial =
      card ??
      emptyCard({
        uid: user!.uid,
        email: user!.email ?? "",
        displayName: user!.displayName ?? user!.email ?? "Hunter",
      });

    if (!hasCard && !editing) {
      return (
        <div className="splash" style={{ minHeight: "60vh" }}>
          <Sigil width={72} height={72} />
          <div className="center" style={{ maxWidth: 320 }}>
            <h1 style={{ marginBottom: 6 }}>No hunter yet</h1>
            <p className="muted">
              Create your character to join the hunt. We'll walk you through it
              step by step — choosing a class, your abilities, skills and armor.
              The maths is done for you.
            </p>
          </div>
          <button className="btn btn-primary" style={{ maxWidth: 280 }} onClick={() => setEditing(true)}>
            Create character
          </button>
        </div>
      );
    }

    return (
      <div>
        <p className="eyebrow">Your Hunter</p>
        <h1 className="page-title">{hasCard ? "Edit character" : "Forge your hunter"}</h1>
        <p className="page-intro">
          {hasCard ? "Adjust your build below." : "Five steps from the handbook."}
        </p>
        <CharacterEditor
          initial={initial}
          saving={saving}
          error={error}
          onSave={handleSave}
          onCancel={hasCard ? () => setEditing(false) : undefined}
          onDelete={hasCard ? handleDelete : undefined}
          lockClass={hasCard}
        />
      </div>
    );
  }

  // Has a card → the play sheet.
  return (
    <div>
      <div className="row between no-print" style={{ marginBottom: 14 }}>
        <div>
          <p className="eyebrow" style={{ margin: 0 }}>Your Hunter</p>
          <h1 className="page-title" style={{ margin: 0 }}>Character</h1>
        </div>
        <div className="row" style={{ gap: 8 }}>
          <AsyncButton
            className="btn-ghost btn-sm"
            pendingText="Generating…"
            showDone={false}
            onClick={() => exportCharacterPdf(card!)}
          >
            Export PDF
          </AsyncButton>
          <button className="btn btn-ghost btn-sm" onClick={() => setEditing(true)}>Edit</button>
        </div>
      </div>

      <div className="no-print" style={{ marginBottom: 14 }}>
        <CharacterTrackers card={card!} />
      </div>

      <div className="print-sheet">
        <HunterCardView card={card!} />
      </div>
    </div>
  );
}
