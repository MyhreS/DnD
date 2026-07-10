import { useState, type ReactNode } from "react";
import { useAuthStore } from "@/features/auth/store/authStore";
import { usePlayerStore } from "@/features/hunter/store/playerStore";
import { useHunterCard } from "../hooks/useHunterCard";
import { useEditorIntent } from "../hooks/useEditorIntent";
import { CharacterEditor } from "./CharacterEditor";
import { CharacterView } from "./CharacterView";
import { CreateHunterChoice } from "./papersheet/CreateHunterChoice";
import { PaperSheetModal } from "./papersheet/PaperSheetModal";
import { emptyCard, emptySheetCard, isSheetCard } from "@/lib/character";
import { CardSkeleton } from "@/components/Skeleton";
import { Sigil } from "@/components/icons";
import type { HunterCard } from "@/types";

export function CharacterPage() {
  const user = useAuthStore((s) => s.user);
  const { card, characters, selectedId, select, status, saving, error, save, archive } = usePlayerStore();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<HunterCard | null>(null);
  // The "create character" fork, and a paper-sheet hunter being written.
  const [choosing, setChoosing] = useState(false);
  const [sheetDraft, setSheetDraft] = useState<HunterCard | null>(null);
  // The sheet popup auto-opens when a sheet hunter is viewed; remember the one
  // the user just closed so it doesn't immediately reopen.
  const [sheetDismissedId, setSheetDismissedId] = useState<string | null>(null);

  useHunterCard();

  const owner = () => ({
    ownerUid: user!.uid,
    email: user!.email ?? "",
    displayName: user!.displayName ?? user!.email ?? "Hunter",
  });
  function startNew() {
    setEditing(false);
    setChoosing(true);
  }
  function startAppWay() {
    setChoosing(false);
    setDraft(emptyCard(owner()));
  }
  function startSheetWay() {
    const d = emptySheetCard(owner());
    setChoosing(false);
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

  // Main-menu deep links: ?new=1 → the create fork, ?edit=1 → editor/sheet.
  useEditorIntent({ onNew: startNew, onEdit: () => setEditing(true) });

  const creating = !!draft;

  async function handleSave(next: HunterCard) {
    const ok = await save(next);
    if (ok) {
      setEditing(false);
      setDraft(null);
    }
  }

  async function handleDelete() {
    const ok = await archive(null);
    if (ok) setEditing(false);
    return ok;
  }

  // The page body branches, but the overlays below stay at ONE stable tree
  // position: the first autosave of a brand-new sheet flips the splash branch
  // into the view branch, and an overlay rendered inside each branch would be
  // remounted by that flip — resetting the sheet mid-writing.
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
  } else if (characters.length === 0 && !creating) {
    // No characters at all → the welcome splash.
    body = (
      <div className="splash" style={{ minHeight: "60vh" }}>
        <Sigil width={72} height={72} />
        <div className="center" style={{ maxWidth: 320 }}>
          <h1 style={{ marginBottom: 6 }}>No hunter yet</h1>
          <p className="muted">
            Create your character to join the hunt — on the classic paper sheet,
            or with the step-by-step builder.
          </p>
        </div>
        <button className="btn btn-primary" style={{ maxWidth: 280 }} onClick={startNew}>
          Create character
        </button>
      </div>
    );
  } else if (creating || (editing && card && !isSheetCard(card))) {
    // Creating a new hunter the app way, or editing an existing one → the
    // guided builder. (Sheet-made hunters never open the builder — their Edit
    // IS the sheet popup, handled by CharacterView below.)
    const initial = creating ? draft! : card!;
    body = (
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
          onDelete={creating ? undefined : async () => { await handleDelete(); }}
          lockClass={!creating && !!card?.classId}
        />
      </div>
    );
  } else {
    // Viewing a character → switcher + the play sheet (or the paper sheet).
    body = (
      <CharacterView
        card={card}
        characters={characters}
        selectedId={selectedId}
        sheetDismissedId={sheetDismissedId}
        onSelect={(id) => { setEditing(false); select(id); }}
        onEdit={() => setEditing(true)}
        onNew={startNew}
        onSheetDismiss={setSheetDismissedId}
        onDelete={handleDelete}
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
      {choosing && (
        <CreateHunterChoice onSheet={startSheetWay} onApp={startAppWay} onCancel={() => setChoosing(false)} />
      )}
      {draftCard && <PaperSheetModal card={draftCard} create={!storeDraft} onClose={closeSheetDraft} />}
    </>
  );
}
