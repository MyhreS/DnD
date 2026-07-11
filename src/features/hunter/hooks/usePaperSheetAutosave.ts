import { useCallback, useEffect, useRef, useState } from "react";
import { patchCharacterSheet } from "@/api/players";
import { usePlayerStore } from "@/features/hunter/store/playerStore";
import { sheetMirror } from "../lib/papersheet";
import { deriveSheetFromCard } from "../lib/deriveSheetFromCard";
import type { HunterCard, SheetData } from "@/types";

const SAVE_DEBOUNCE_MS = 700;

/** The sheet boxes denormalized onto the card for lists/rosters. Mirrors are
 * written ONLY when one of these was edited — so a DM level grant isn't
 * silently reverted by the player scribbling in an unrelated field. */
const MIRROR_KEYS = ["name", "level", "background"];

/** The sheet key bound to the currently focused element — every sheet field
 * primitive carries `data-f` (the original HTML's field names). Null when
 * focus is elsewhere (toolbar, body, …). */
function focusedSheetField(): string | null {
  const el = document.activeElement;
  return el instanceof HTMLElement ? el.getAttribute("data-f") : null;
}

/** Local state + debounced Firestore autosave for the paper sheet, mirroring
 * the original HTML's behaviour (type → "…" → "Saved").
 *
 * - `create` marks the ONE surface that may create the doc (a brand-new draft
 *   on the owner's /character page, via the player store). Everywhere else —
 *   reopening, party view, the DM stepping into a player's hunter — saves are
 *   per-field updateDoc patches: they never create, never resurrect a deleted
 *   hunter, and never touch the viewer's own character store.
 * - `readOnly` viewers follow the LIVE doc (no local copy, no writes).
 */
export function usePaperSheetAutosave(
  card: HunterCard,
  { readOnly = false, create = false }: { readOnly?: boolean; create?: boolean } = {},
) {
  // Sheet-less cards (legacy builder hunters, test-run bots) start from a
  // sheet DERIVED from their structured fields — never a blank page.
  const [local, setLocal] = useState<SheetData>(() => card.sheet ?? deriveSheetFromCard(card));
  const [saveMsg, setSaveMsg] = useState("");
  const latest = useRef(local);
  /** Keys edited since the last successful persist. */
  const dirty = useRef<Set<string>>(new Set());
  const created = useRef(!create);
  /** True until a sheet-less card's FIRST persist: that write carries the
   * whole derived sheet (not just the edited key), converting the card, so
   * the name/level/background mirror always computes from a complete
   * snapshot — a DM "playing as" a legacy hunter can never blank its card. */
  const seeding = useRef(!card.sheet);
  const timer = useRef<number | null>(null);
  const cardRef = useRef(card);
  cardRef.current = card;

  const persist = useCallback(async () => {
    if (dirty.current.size === 0) return;
    const dirtyKeys = Array.from(dirty.current);
    const seedingNow = seeding.current;
    const snapshot = latest.current;
    // The first save of a sheet-less card persists every derived key too.
    const keys = seedingNow
      ? Array.from(new Set([...Object.keys(snapshot), ...dirtyKeys]))
      : dirtyKeys;
    // Take ownership of the pending changes; restore them on failure so the
    // next edit retries.
    dirty.current = new Set();
    try {
      const base = cardRef.current;
      if (!created.current) {
        const ok = await usePlayerStore
          .getState()
          .save({ ...base, ...sheetMirror(snapshot), sheet: snapshot });
        if (!ok) throw new Error("create failed");
        created.current = true;
      } else {
        // Mirrors compute from the FULL local snapshot (derived + edits) —
        // when seeding they're written regardless, since the derived values
        // restate the card's own fields (idempotent, never blanking).
        const mirror =
          seedingNow || keys.some((k) => MIRROR_KEYS.includes(k)) ? sheetMirror(snapshot) : {};
        await patchCharacterSheet(base.id, snapshot, keys, mirror);
      }
      seeding.current = false;
      setSaveMsg("Saved");
      window.setTimeout(() => setSaveMsg((m) => (m === "Saved" ? "" : m)), 1600);
    } catch (err) {
      for (const k of dirtyKeys) dirty.current.add(k);
      console.error("Failed to save the character sheet", err);
      setSaveMsg("Save failed");
    }
  }, []);

  const flush = useCallback(() => {
    if (timer.current !== null) {
      window.clearTimeout(timer.current);
      timer.current = null;
    }
    void persist();
  }, [persist]);

  const setField = useCallback(
    (f: string, v: string | boolean) => {
      if (readOnly) return;
      const next = { ...latest.current, [f]: v };
      latest.current = next;
      dirty.current.add(f);
      setLocal(next);
      setSaveMsg("…");
      if (timer.current) window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => {
        timer.current = null;
        void persist();
      }, SAVE_DEBOUNCE_MS);
    },
    [readOnly, persist],
  );

  // LIVE SYNC — fold remote sheet edits (the AI helper, the DM, another open
  // tab) into the OPEN editor, per key, last-write-wins:
  //  - keys with in-flight local typing (dirty, unsaved) keep the local value —
  //    it wins by persisting over the remote one on the next save;
  //  - the FOCUSED field is skipped so the caret is never hijacked mid-edit,
  //    and catches up on blur (the focusout re-fold below);
  //  - a remote DELETION of a non-dirty key clears it locally;
  //  - seeding cards (no sheet yet) are untouched: their derived local sheet
  //    stays authoritative until the first persist converts them.
  // Because `latest` absorbs the remote values too, a later local edit
  // computes its name/level/background mirror from a fresh snapshot.
  const foldRemote = useCallback((remote: SheetData | undefined) => {
    if (!remote || seeding.current) return;
    const focused = focusedSheetField();
    const prev = latest.current;
    let next: SheetData | null = null;
    for (const k of new Set([...Object.keys(remote), ...Object.keys(prev)])) {
      if (dirty.current.has(k) || k === focused) continue;
      const rv = k in remote ? remote[k] : undefined;
      if (rv === prev[k]) continue;
      next ??= { ...prev };
      if (rv === undefined) delete next[k];
      else next[k] = rv;
    }
    if (next) {
      latest.current = next;
      setLocal(next);
    }
  }, []);

  useEffect(() => {
    if (!readOnly) foldRemote(card.sheet);
  }, [readOnly, foldRemote, card.sheet]);

  // A field skipped because it was focused catches up when focus leaves it
  // (deferred a tick so document.activeElement reflects the NEW focus).
  useEffect(() => {
    if (readOnly) return;
    const onFocusOut = () => window.setTimeout(() => foldRemote(cardRef.current.sheet), 0);
    document.addEventListener("focusout", onFocusOut);
    return () => document.removeEventListener("focusout", onFocusOut);
  }, [readOnly, foldRemote]);

  // Never lose typing: flush pending edits when the modal unmounts, the tab
  // hides (iOS PWA backgrounding/kill), or the page unloads.
  useEffect(() => {
    if (readOnly) return;
    const onVisibility = () => {
      if (document.visibilityState === "hidden") flush();
    };
    window.addEventListener("pagehide", flush);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("pagehide", flush);
      document.removeEventListener("visibilitychange", onVisibility);
      flush();
    };
  }, [readOnly, flush]);

  // Read-only viewers follow the live doc; editors keep their working copy.
  // Sheet-less cards read through the derived fallback here too.
  const data = readOnly ? (card.sheet ?? deriveSheetFromCard(card)) : local;
  return { data, setField, saveMsg };
}
