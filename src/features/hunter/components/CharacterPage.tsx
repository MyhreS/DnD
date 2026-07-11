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

/** The main-menu Hunters page. It ALWAYS lands on the LIST of your hunters —
 * you click a hunter to open its paper sheet (the only view/creation flow; the
 * old step-by-step builder is gone). */
export function CharacterPage() {
  const user = useAuthStore((s) => s.user);
  const { characters, select, status, error, archive } = usePlayerStore();
  // A brand-new sheet being written (the only creation flow).
  const [sheetDraft, setSheetDraft] = useState<HunterCard | null>(null);
  // Which hunter's sheet is open (detail); null = the list. Nothing opens on
  // mount, so the page always lands on the list — never inside a hunter.
  const [openId, setOpenId] = useState<string | null>(null);

  useHunterCard();

  function startNew() {
    const d = emptySheetCard({
      ownerUid: user!.uid,
      email: user!.email ?? "",
      displayName: user!.displayName ?? user!.email ?? "Hunter",
    });
    setSheetDraft(d);
  }
  function closeSheetDraft() {
    const d = sheetDraft;
    setSheetDraft(null);
    // Land on the freshly-written hunter's card in the list (don't auto-open it).
    if (d && usePlayerStore.getState().characters.some((c) => c.id === d.id)) select(d.id);
  }
  function openHunter(id: string) {
    select(id);
    setOpenId(id);
  }
  async function deleteOpen() {
    const ok = await archive(null); // archives the selected (== opened) hunter
    if (ok) setOpenId(null);
    return ok;
  }

  // Main-menu deep links: ?new=1 → a fresh sheet, ?edit=1 → open the selected hunter.
  useEditorIntent({ onNew: startNew, onEdit: () => setOpenId(usePlayerStore.getState().selectedId) });

  let body: ReactNode;

  if (status === "idle" || status === "loading") {
    body = (
      <div>
        <p className="eyebrow">Your Hunter</p>
        <h1 className="page-title">Hunters</h1>
        <p className="page-intro">Unrolling your character sheets…</p>
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
        characters={characters}
        openId={openId}
        onOpen={openHunter}
        onBack={() => setOpenId(null)}
        onNew={startNew}
        onDelete={deleteOpen}
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
