import { useCallback, useEffect, useRef, useState } from "react";
import { patchCharacterSheet, replaceCharacterSheet } from "@/api/players";
import { usePlayerStore } from "@/features/hunter/store/playerStore";
import { sheetMirror } from "../lib/papersheet";
import type { HunterCard, SheetData } from "@/types";

const SAVE_DEBOUNCE_MS = 700;

/** The sheet boxes denormalized onto the card for lists/rosters. Mirrors are
 * written ONLY when one of these was edited — so a DM level grant isn't
 * silently reverted by the player scribbling in an unrelated field. */
const MIRROR_KEYS = ["name", "level", "background"];

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
  const [local, setLocal] = useState<SheetData>(() => card.sheet ?? {});
  const [saveMsg, setSaveMsg] = useState("");
  const latest = useRef(local);
  /** Keys edited since the last successful persist. */
  const dirty = useRef<Set<string>>(new Set());
  /** A "Clear sheet" is pending — replace the whole map instead of patching. */
  const cleared = useRef(false);
  const created = useRef(!create);
  const timer = useRef<number | null>(null);
  const cardRef = useRef(card);
  cardRef.current = card;

  const persist = useCallback(async () => {
    const keys = Array.from(dirty.current);
    const wholesale = cleared.current;
    if (!wholesale && keys.length === 0) return;
    // Take ownership of the pending changes; restore them on failure so the
    // next edit retries.
    dirty.current = new Set();
    cleared.current = false;
    const snapshot = latest.current;
    try {
      const base = cardRef.current;
      if (!created.current) {
        const ok = await usePlayerStore
          .getState()
          .save({ ...base, ...sheetMirror(snapshot), sheet: snapshot });
        if (!ok) throw new Error("create failed");
        created.current = true;
      } else if (wholesale) {
        await replaceCharacterSheet(base.id, snapshot, sheetMirror(snapshot));
      } else {
        const mirror = keys.some((k) => MIRROR_KEYS.includes(k)) ? sheetMirror(snapshot) : {};
        await patchCharacterSheet(base.id, snapshot, keys, mirror);
      }
      setSaveMsg("Saved");
      window.setTimeout(() => setSaveMsg((m) => (m === "Saved" ? "" : m)), 1600);
    } catch (err) {
      for (const k of keys) dirty.current.add(k);
      if (wholesale) cleared.current = true;
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

  const clear = useCallback(() => {
    if (readOnly) return;
    if (!window.confirm("Clear every field on the sheet?")) return;
    latest.current = {};
    dirty.current = new Set();
    cleared.current = true;
    setLocal({});
    setSaveMsg("…");
    flush();
  }, [readOnly, flush]);

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
  const data = readOnly ? (card.sheet ?? {}) : local;
  return { data, setField, saveMsg, clear };
}
