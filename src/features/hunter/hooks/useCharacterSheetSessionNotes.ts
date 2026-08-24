import { useEffect, useState } from "react";
import { addSessionNote, subscribeSessionNotes } from "@/api/sessionNotes";
import { isPreviewActive } from "@/dev/preview";
import type { SessionNote } from "@/types";

const PREVIEW_NOTES: Record<string, SessionNote[]> = {
  "preview-game": [
    { id: "preview-note-current", authorUid: "preview-p1", authorName: "Eileen", body: "The eastern door is sealed with a symbol of the moon.", createdAt: Date.now() - 18 * 60_000 },
  ],
  "preview-game-previous": [
    { id: "preview-note-old", authorUid: "preview-dm", authorName: "Christoffer", body: "We promised the chapel keeper we would return the silver key.", createdAt: Date.now() - 6 * 24 * 60 * 60 * 1000 },
  ],
};

export function useCharacterSheetSessionNotes(gameId: string | null) {
  const preview = isPreviewActive();
  const [notesByGame, setNotesByGame] = useState<Record<string, SessionNote[]>>(preview ? PREVIEW_NOTES : {});
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!gameId || preview) return;
    return subscribeSessionNotes(
      gameId,
      (notes) => setNotesByGame((current) => ({ ...current, [gameId]: notes })),
      () => setError("Could not load the notes for this session."),
    );
  }, [gameId, preview]);

  async function submit(authorUid: string, authorName: string) {
    const clean = body.trim();
    if (!gameId || !clean || !authorUid || sending) return;
    setSending(true);
    setError("");
    try {
      if (preview) {
        const note: SessionNote = { id: `preview-note-${Date.now()}`, authorUid, authorName, body: clean, createdAt: Date.now() };
        setNotesByGame((current) => ({ ...current, [gameId]: [note, ...(current[gameId] ?? [])] }));
      } else {
        await addSessionNote(gameId, authorUid, authorName, clean);
      }
      setBody("");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not save your note.");
    } finally {
      setSending(false);
    }
  }

  return { notes: gameId ? notesByGame[gameId] ?? [] : [], body, setBody, sending, error, submit };
}
