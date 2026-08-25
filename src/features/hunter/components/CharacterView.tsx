import { useState, type FormEvent } from "react";
import { HunterListCard } from "./HunterListCard";
import { SheetCharacterView } from "./SheetCharacterView";
import { CharacterDeleteDialog } from "./papersheet/CharacterDeleteDialog";
import type { HunterCard } from "@/types";

/** The /character "Hunters" screen. It ALWAYS lands on the LIST of your hunters
 * (it never auto-opens one); click a card to view or edit that hunter. */
export function CharacterView({
  characters,
  openId,
  onOpen,
  onBack,
  onNew,
  onDelete,
}: {
  characters: HunterCard[];
  /** The hunter currently opened (detail view), or null while showing the list. */
  openId: string | null;
  onOpen: (id: string) => void;
  onBack: () => void;
  onNew: () => void;
  onDelete: (card: HunterCard) => Promise<boolean>;
}) {
  const openCard = openId ? characters.find((c) => c.id === openId) ?? null : null;
  const [deleteCard, setDeleteCard] = useState<HunterCard | null>(null);
  const [confirmation, setConfirmation] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const deletePhrase = deleteCard?.name.trim() || "DELETE";

  function openDelete(card: HunterCard) {
    setDeleteCard(card);
    setConfirmation("");
    setDeleteError("");
  }
  function closeDelete() {
    if (deleting) return;
    setDeleteCard(null);
    setConfirmation("");
    setDeleteError("");
  }
  async function confirmDelete(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!deleteCard || deleting || confirmation.trim() !== deletePhrase) return;
    setDeleting(true);
    setDeleteError("");
    const ok = await onDelete(deleteCard);
    if (ok) {
      setDeleteCard(null);
      return;
    }
    setDeleting(false);
    setDeleteError("The character could not be deleted. Nothing was removed; try again.");
  }

  // Detail: selecting one Hunter opens the canonical character sheet.
  if (openCard) {
    return (
      <div>
        <button
          className="btn btn-ghost btn-sm no-print"
          style={{ width: "auto", marginBottom: 12 }}
          onClick={onBack}
        >
          ← All hunters
        </button>
        <SheetCharacterView
          key={openCard.id}
          card={openCard}
          autoOpen
          onDismiss={onBack}
        />
      </div>
    );
  }

  // List: every hunter as a tap-to-open card, plus a way to forge a new one.
  return (
    <div>
      <div className="no-print" style={{ marginBottom: 12 }}>
        <p className="eyebrow" style={{ margin: 0 }}>Your hunters</p>
        <h1 className="page-title" style={{ margin: 0 }}>Hunters</h1>
      </div>

      <div className="stack" style={{ gap: 10 }}>
        {characters.map((c) => (
          <HunterListCard key={c.id} card={c} onOpen={() => onOpen(c.id)} onDelete={() => openDelete(c)} />
        ))}
      </div>

      <button className="btn btn-primary" style={{ marginTop: 12 }} onClick={onNew}>
        Create hunter
      </button>
      {deleteCard && (
        <CharacterDeleteDialog
          characterName={deleteCard.name.trim()}
          deletePhrase={deletePhrase}
          confirmation={confirmation}
          deleting={deleting}
          error={deleteError}
          onConfirmationChange={setConfirmation}
          onCancel={closeDelete}
          onConfirm={(event) => void confirmDelete(event)}
        />
      )}
    </div>
  );
}
