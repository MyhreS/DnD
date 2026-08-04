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
  const [workingCard, setWorkingCard] = useState<HunterCard>(card);
  const [saveMsg, setSaveMsg] = useState("");
  const latest = useRef(local);
  /** Keys edited since the last successful persist. */
  const dirty = useRef<Set<string>>(new Set());
  /** Structured choices changed alongside the visible sheet fields. */
  const pendingCard = useRef<Partial<HunterCard>>({});
  /** Structured values currently inside an updateDoc request. Remote snapshots
   * must not temporarily roll these back while that request is in flight. */
  const inFlightCard = useRef<Partial<HunterCard>>({});
  const latestCard = useRef(card);
  const created = useRef(!create);
  /** True until a sheet-less card's FIRST persist: that write carries the
   * whole derived sheet (not just the edited key), converting the card, so
   * the name/level/background mirror always computes from a complete
   * snapshot — a DM "playing as" a legacy hunter can never blank its card. */
  const seeding = useRef(!card.sheet);
  const timer = useRef<number | null>(null);
  /** The "Saved" → "" reset timeout; cleared on unmount so it can't fire into
   * a dead component (the unmount flush may resolve after we're gone). */
  const savedTimer = useRef<number | null>(null);
  /** False after unmount so an in-flight persist (from the unmount flush) skips
   * its setState calls instead of warning about updating an unmounted hook. */
  const mounted = useRef(true);
  const cardRef = useRef(card);

  useEffect(() => {
    cardRef.current = card;
    latestCard.current = workingCard;
  }, [card, workingCard]);

  const persist = useCallback(async (): Promise<boolean> => {
    if (dirty.current.size === 0 && Object.keys(pendingCard.current).length === 0) return true;
    const dirtyKeys = Array.from(dirty.current);
    const seedingNow = seeding.current;
    const snapshot = latest.current;
    const structured = pendingCard.current;
    // The first save of a sheet-less card persists every derived key too.
    const keys = seedingNow
      ? Array.from(new Set([...Object.keys(snapshot), ...dirtyKeys]))
      : dirtyKeys;
    // Take ownership of the pending changes; restore them on failure so the
    // next edit retries.
    dirty.current = new Set();
    pendingCard.current = {};
    inFlightCard.current = { ...inFlightCard.current, ...structured };
    try {
      const base = latestCard.current;
      if (!created.current) {
        const ok = await usePlayerStore
          .getState()
          .save({ ...base, ...structured, ...sheetMirror(snapshot), sheet: snapshot });
        if (!ok) throw new Error("create failed");
        created.current = true;
      } else {
        // Mirrors compute from the FULL local snapshot (derived + edits) —
        // when seeding they're written regardless, since the derived values
        // restate the card's own fields (idempotent, never blanking).
        const mirror =
          seedingNow || keys.some((k) => MIRROR_KEYS.includes(k)) ? sheetMirror(snapshot) : {};
        await patchCharacterSheet(base.id, snapshot, keys, mirror, structured);
      }
      seeding.current = false;
      for (const [key, value] of Object.entries(structured)) {
        if (inFlightCard.current[key as keyof HunterCard] === value) delete inFlightCard.current[key as keyof HunterCard];
      }
      if (!mounted.current) return true;
      setSaveMsg("Saved");
      if (savedTimer.current) window.clearTimeout(savedTimer.current);
      savedTimer.current = window.setTimeout(() => {
        savedTimer.current = null;
        if (mounted.current) setSaveMsg((m) => (m === "Saved" ? "" : m));
      }, 1600);
      return true;
    } catch (err) {
      for (const k of dirtyKeys) dirty.current.add(k);
      pendingCard.current = { ...structured, ...pendingCard.current };
      for (const [key, value] of Object.entries(structured)) {
        if (inFlightCard.current[key as keyof HunterCard] === value) delete inFlightCard.current[key as keyof HunterCard];
      }
      console.error("Failed to save the character sheet", err);
      if (mounted.current) setSaveMsg("Save failed");
      return false;
    }
  }, []);

  const flush = useCallback(async (): Promise<boolean> => {
    if (timer.current !== null) {
      window.clearTimeout(timer.current);
      timer.current = null;
    }
    return persist();
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

  /** Apply a rules decision and all fields derived from it as one local change
   * and one Firestore update. This prevents other devices seeing a selected
   * class before its HP, proficiencies, features, and explanations arrive. */
  const setFields = useCallback(
    (changes: SheetData, cardPatch: Partial<HunterCard> = {}) => {
      if (readOnly) return;
      const next = { ...latest.current, ...changes };
      latest.current = next;
      for (const key of Object.keys(changes)) dirty.current.add(key);
      pendingCard.current = { ...pendingCard.current, ...cardPatch };
      setWorkingCard((current) => ({ ...current, ...cardPatch, sheet: next }));
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

  useEffect(() => {
    if (readOnly) return;
    setWorkingCard((current) => ({ ...current, ...card, ...inFlightCard.current, ...pendingCard.current, sheet: latest.current }));
  }, [card, readOnly]);

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
    const onPageHide = () => void flush();
    window.addEventListener("pagehide", onPageHide);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("pagehide", onPageHide);
      document.removeEventListener("visibilitychange", onVisibility);
      void flush();
    };
  }, [readOnly, flush]);

  // On unmount, stop any deferred setState: the flush below may kick off a
  // persist that resolves after we're gone, and the "Saved" reset timeout
  // would otherwise fire into a dead component.
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      if (savedTimer.current) {
        window.clearTimeout(savedTimer.current);
        savedTimer.current = null;
      }
      if (timer.current) {
        window.clearTimeout(timer.current);
        timer.current = null;
      }
    };
  }, []);

  // Read-only viewers follow the live doc; editors keep their working copy.
  // Sheet-less cards read through the derived fallback here too.
  const data = readOnly ? (card.sheet ?? deriveSheetFromCard(card)) : local;
  return { data, setField, setFields, workingCard, saveMsg, flushChanges: flush };
}
