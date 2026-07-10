import { useCallback, useEffect, useRef, useState } from "react";
import { saveCharacterSheet } from "@/api/players";
import { usePlayerStore } from "@/features/hunter/store/playerStore";
import { sheetMirror } from "../lib/papersheet";
import type { HunterCard, SheetData } from "@/types";

const SAVE_DEBOUNCE_MS = 700;

/** Local state + debounced Firestore autosave for the paper sheet, mirroring
 * the original HTML's behaviour (type → "…" → "Saved"). The FIRST save of a
 * brand-new sheet hunter goes through the player store (a full-card create);
 * every save after that replaces just the sheet + its mirrored fields. */
export function usePaperSheetAutosave(card: HunterCard, readOnly = false) {
  const [data, setData] = useState<SheetData>(() => card.sheet ?? {});
  const [saveMsg, setSaveMsg] = useState("");
  const latest = useRef(data);
  const timer = useRef<number | null>(null);
  const cardRef = useRef(card);
  cardRef.current = card;

  const persist = useCallback(async (next: SheetData) => {
    try {
      const base = cardRef.current;
      const created = usePlayerStore.getState().characters.some((c) => c.id === base.id);
      if (created) {
        await saveCharacterSheet(base.id, next, sheetMirror(next));
      } else {
        const ok = await usePlayerStore.getState().save({ ...base, ...sheetMirror(next), sheet: next });
        if (!ok) throw new Error("create failed");
      }
      setSaveMsg("Saved");
      window.setTimeout(() => setSaveMsg((m) => (m === "Saved" ? "" : m)), 1600);
    } catch (err) {
      console.error("Failed to save the character sheet", err);
      setSaveMsg("Save failed");
    }
  }, []);

  const setField = useCallback(
    (f: string, v: string | boolean) => {
      if (readOnly) return;
      const next = { ...latest.current, [f]: v };
      latest.current = next;
      setData(next);
      setSaveMsg("…");
      if (timer.current) window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => {
        timer.current = null;
        void persist(latest.current);
      }, SAVE_DEBOUNCE_MS);
    },
    [readOnly, persist],
  );

  const clear = useCallback(() => {
    if (readOnly) return;
    if (!window.confirm("Clear every field on the sheet?")) return;
    latest.current = {};
    setData({});
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = null;
    setSaveMsg("…");
    void persist({});
  }, [readOnly, persist]);

  // Flush a pending debounce on unmount so a quick Close never loses typing.
  useEffect(
    () => () => {
      if (timer.current !== null) {
        window.clearTimeout(timer.current);
        timer.current = null;
        void persist(latest.current);
      }
    },
    [persist],
  );

  return { data, setField, saveMsg, clear };
}
