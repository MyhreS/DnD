import { useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

type Next = string | null | ((current: string | null) => string | null);

/** A piece of screen state kept in the address (?key=value), so a reload —
 * including applying an app update — returns to the same place. Replaces the
 * history entry, so the back button behaves exactly as before. The setter
 * reads the live address, so several updates in one tap never overwrite each
 * other, and it stays stable while only the query string changes. */
export function useUrlState(key: string): [string | null, (next: Next) => void] {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const set = useCallback((next: Next) => {
    const current = new URLSearchParams(window.location.search);
    const resolved = typeof next === "function" ? next(current.get(key)) : next;
    if ((current.get(key) ?? null) === (resolved ?? null)) return;
    if (resolved) current.set(key, resolved);
    else current.delete(key);
    const search = current.toString();
    navigate({ pathname: window.location.pathname, search: search ? `?${search}` : "", hash: window.location.hash }, { replace: true });
  }, [key, navigate]);
  return [params.get(key), set];
}
