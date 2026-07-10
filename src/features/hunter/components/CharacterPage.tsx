import { useState, type ReactNode } from "react";
import { useAuthStore } from "@/features/auth/store/authStore";
import { usePlayerStore } from "@/features/hunter/store/playerStore";
import { useHunterCard } from "../hooks/useHunterCard";
import { useEditorIntent } from "../hooks/useEditorIntent";
import { CharacterView } from "./CharacterView";
import { PaperSheetModal } from "./papersheet/PaperSheetModal";
import { emptySheetCard } from "@/lib/character";
import { CardSkeleton } from "@/components/Skeleton";
import { Sigil } from "@/components/icons";
import type { HunterCard } from "@/types";

/** The main-menu Hunters page. Characters are created and viewed ONE way: the
 * paper character sheet (the old step-by-step builder is gone — no legacy). */
export function CharacterPage() {
  const user = useAuthStore((s) => s.user);
  const { card, characters, selectedId, select, status, error, archive } = usePlayerStore();
  // A brand-new sheet being written (the only creation flow).
  const [sheetDraft, setSheetDraft] = useState<HunterCard | null>(null);
  // The sheet popup auto-opens when a hunter is viewed; remember the one the
  // user just closed so it doesn't immediately reopen.
  const [sheetDismissedId, setSheetDismissedId] = useState<string | null>(null);

  useHunterCard();

  function startNew() {
    const d = emptySheetCard({
      ownerUid: user!.uid,
      email: user!.email ?? "",
      displayName: user!.displayName ?? user!.email ?? "Hunter",
    });
    // Pre-dismiss: the draft modal IS the sheet — the view underneath must not
    // pop a second copy once autosave lands the hunter in the store.
    setSheetDismissedId(d.id);
    setSheetDraft(d);
  }
  function closeSheetDraft() {
    const d = sheetDraft;
    setSheetDraft(null);
    if (d && usePlayerStore.getState().characters.some((c) => c.id === d.id)) select(d.id);
  }

  // Main-menu deep links: ?new=1 → a fresh sheet, ?edit=1 → pop the sheet open.
  useEditorIntent({ onNew: startNew, onEdit: () => setSheetDismissedId(null) });

  let body: ReactNode;

  if (status === "idle" || status === "loading") {
    body = (
      <div>
        <p className="eyebrow">Your Hunter</p>
        <h1 className="page-title">Character</h1>
        <p className="page-intro">Unrolling your character sheet…</p>
        <CardSkeleton lines={4} />
      </div>
    );
  } else if (status === "error") {
    body = (
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
  } else if (characters.length === 0) {
    // No characters at all → the welcome splash.
    body = (
      <div className="splash" style={{ minHeight: "60vh" }}>
        <Sigil width={72} height={72} />
        <div className="center" style={{ maxWidth: 320 }}>
          <h1 style={{ marginBottom: 6 }}>No hunter yet</h1>
          <p className="muted">
            Create your character on the classic paper sheet — every field is
            saved as you write, and the little ⓘ dots explain each step.
          </p>
        </div>
        <button className="btn btn-primary" style={{ maxWidth: 280 }} onClick={startNew}>
          Create character
        </button>
      </div>
    );
  } else {
    body = (
      <CharacterView
        card={card}
        characters={characters}
        selectedId={selectedId}
        sheetDismissedId={sheetDismissedId}
        onSelect={select}
        onNew={startNew}
        onSheetDismiss={setSheetDismissedId}
        onDelete={() => archive(null)}
      />
    );
  }

  // Once autosave lands the draft in the store, follow the store's copy — a
  // (dev-mode) remount of the modal must reload what was already written, and
  // only a draft NOT yet in the store may create the doc.
  const storeDraft = sheetDraft ? characters.find((c) => c.id === sheetDraft.id) : undefined;
  const draftCard = storeDraft ?? sheetDraft;

  return (
    <>
      {body}
      {draftCard && <PaperSheetModal card={draftCard} create={!storeDraft} onClose={closeSheetDraft} />}
    </>
  );
}
