import { useEffect } from "react";
import { useSearchParams } from "react-router-dom";

/**
 * Consumes the /character deep-link intents: `?new=1` jumps straight into
 * creating a hunter, `?edit=1` opens the editor on the selected one (both used
 * by the main-menu hunter cards). Fires the matching callback once, then
 * strips ONLY those params (leaving e.g. dev `?preview=` intact) so
 * back/refresh doesn't re-trigger the intent.
 */
export function useEditorIntent({ onNew, onEdit }: { onNew: () => void; onEdit: () => void }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const wantsNew = searchParams.get("new") === "1";
  const wantsEdit = searchParams.get("edit") === "1";

  useEffect(() => {
    if (!wantsNew && !wantsEdit) return;
    if (wantsNew) onNew();
    else onEdit();
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.delete("new");
        next.delete("edit");
        return next;
      },
      { replace: true },
    );
  }, [wantsNew, wantsEdit, onNew, onEdit, setSearchParams]);
}
