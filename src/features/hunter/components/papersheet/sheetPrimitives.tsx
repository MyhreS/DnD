import {
  createContext,
  useCallback,
  useContext,
  useLayoutEffect,
  useState,
  useSyncExternalStore,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from "react";
import type { SheetData } from "@/types";

/** The paper sheet's field bus. Every field component reads/writes ONE key of
 * the free-form `SheetData` map (the original HTML's `data-f` names). Values
 * live in a small external store so a keystroke re-renders only the field that
 * changed (via `useSyncExternalStore`) instead of every one of the ~220 bound
 * fields — the context object itself never changes identity. */
type Listener = () => void;

class SheetStore {
  private values: SheetData;
  private listeners = new Map<string, Set<Listener>>();
  /** Keys whose value changed while adopting a new committed snapshot. */
  private pending = new Set<string>();
  /** Kept current without changing the store identity supplied to context. */
  private setFieldImpl: (f: string, v: string | boolean) => void = () => {};

  constructor(initial: SheetData) {
    this.values = initial;
  }

  get = (f: string): string | boolean | undefined => this.values[f];

  subscribe = (f: string, cb: Listener): (() => void) => {
    let set = this.listeners.get(f);
    if (!set) {
      set = new Set();
      this.listeners.set(f, set);
    }
    set.add(cb);
    return () => {
      set.delete(cb);
      if (set.size === 0) this.listeners.delete(f);
    };
  };

  setField = (f: string, v: string | boolean): void => this.setFieldImpl(f, v);

  setWriter(next: (f: string, v: string | boolean) => void): void {
    this.setFieldImpl = next;
  }

  /** Adopt the latest `data` snapshot, queuing changed keys for notification.
   * Idempotent so a repeated synchronization queues nothing. */
  sync(next: SheetData): void {
    if (next === this.values) return;
    const prev = this.values;
    for (const k of new Set([...Object.keys(prev), ...Object.keys(next)])) {
      if (prev[k] !== next[k]) this.pending.add(k);
    }
    this.values = next;
  }

  /** Notify subscribers of keys changed since the last flush. */
  flush(): void {
    if (this.pending.size === 0) return;
    const keys = Array.from(this.pending);
    this.pending.clear();
    for (const k of keys) {
      const set = this.listeners.get(k);
      if (set) for (const cb of set) cb();
    }
  }
}

const StoreContext = createContext<SheetStore | null>(null);
const ReadOnlyContext = createContext(false);
const AutomationContext = createContext<{ reasons: Record<string, string>; overrides: Set<string> }>({ reasons: {}, overrides: new Set() });

export function SheetProvider({
  data,
  setField,
  readOnly = false,
  automationReasons = {},
  manualOverrides = [],
  children,
}: {
  data: SheetData;
  setField: (f: string, v: string | boolean) => void;
  readOnly?: boolean;
  automationReasons?: Record<string, string>;
  manualOverrides?: string[];
  children: ReactNode;
}) {
  const [store] = useState(() => new SheetStore(data));
  // Synchronize the external field bus before paint. Descendants may read the
  // previous snapshot during the parent pass, then receive a targeted update
  // for only the keys that changed; no React-owned value is mutated in render.
  useLayoutEffect(() => {
    store.setWriter(setField);
    store.sync(data);
    store.flush();
  }, [data, setField, store]);
  return (
    <StoreContext.Provider value={store}>
      <ReadOnlyContext.Provider value={readOnly}>
        <AutomationContext.Provider value={{ reasons: automationReasons, overrides: new Set(manualOverrides) }}>
          {children}
        </AutomationContext.Provider>
      </ReadOnlyContext.Provider>
    </StoreContext.Provider>
  );
}

function useAutomation(f: string) {
  const { reasons, overrides } = useContext(AutomationContext);
  const reason = overrides.has(f) ? undefined : reasons[f];
  return reason ? { "data-automated": true, "data-auto-reason": reason, title: `Automatically set · ${reason}` } : {};
}

function useStore(): SheetStore {
  const store = useContext(StoreContext);
  if (!store) throw new Error("Sheet fields must be rendered inside <SheetProvider>");
  return store;
}

/** Subscribe to a single sheet key — re-renders only when THAT key changes. */
function useField(f: string): string | boolean | undefined {
  const store = useStore();
  const subscribe = useCallback((cb: Listener) => store.subscribe(f, cb), [store, f]);
  const get = useCallback(() => store.get(f), [store, f]);
  return useSyncExternalStore(subscribe, get);
}

/** The red numbered step badge from the DM's tutorial ("numbered") sheet. */
export function St({ n }: { n: number }) {
  return <b className="st">{n}</b>;
}

/** A bound handwriting text field. */
export function F({ f, ...rest }: { f: string } & InputHTMLAttributes<HTMLInputElement>) {
  const store = useStore();
  const readOnly = useContext(ReadOnlyContext);
  const v = useField(f);
  return (
    <input
      type="text"
      data-f={f}
      value={typeof v === "string" ? v : ""}
      readOnly={readOnly}
      onChange={(e) => store.setField(f, e.target.value)}
      {...useAutomation(f)}
      {...rest}
    />
  );
}

/** Renders one sheet value via a render prop — for consumers that aren't
 * fields themselves (e.g. the class figure under the eye). */
export function SheetValue({
  f,
  children,
}: {
  f: string;
  children: (v: string | boolean | undefined) => ReactNode;
}) {
  const v = useField(f);
  return <>{children(v)}</>;
}

/** A bound handwriting dropdown: fixed choices plus an empty "—". A saved
 * value that isn't one of the options (legacy free-typed text) is kept and
 * shown as an extra option rather than silently cleared. */
export function Sel({ f, options, ...rest }: { f: string; options: string[] } & SelectHTMLAttributes<HTMLSelectElement>) {
  const store = useStore();
  const readOnly = useContext(ReadOnlyContext);
  const raw = useField(f);
  const v = typeof raw === "string" ? raw : "";
  const opts = v !== "" && !options.includes(v) ? [...options, v] : options;
  return (
    // data-empty lets print blank the "—" placeholder (papersheet.css), so a
    // blank sheet still prints as an empty handwriting line.
    <select
      data-f={f}
      value={v}
      disabled={readOnly}
      data-empty={v === "" || undefined}
      onChange={(e) => store.setField(f, e.target.value)}
      {...useAutomation(f)}
      {...rest}
    >
      <option value="">—</option>
      {opts.map((o) => (
        <option key={o} value={o}>
          {o}
        </option>
      ))}
    </select>
  );
}

/** A bound multi-line handwriting field. */
export function Ta({ f, ...rest }: { f: string } & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const store = useStore();
  const readOnly = useContext(ReadOnlyContext);
  const v = useField(f);
  return (
    <textarea
      data-f={f}
      value={typeof v === "string" ? v : ""}
      readOnly={readOnly}
      onChange={(e) => store.setField(f, e.target.value)}
      {...useAutomation(f)}
      {...rest}
    />
  );
}

/** A bound multi-line field that also folds in a LEGACY second field — for
 * the old two-column Class Features box (creator's ruling: it's just notes,
 * one box). While BOTH fields hold text the textarea displays them joined by
 * a blank line (lazy render-time merge — nothing is written for lookers-on);
 * the first edit persists the combined text to `f` and empties `legacy`, so
 * no hunter loses a word and the sheet converges to the single-field shape. */
export function MergeTa({
  f,
  legacy,
  ...rest
}: { f: string; legacy: string } & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const store = useStore();
  const readOnly = useContext(ReadOnlyContext);
  const av = useField(f);
  const bv = useField(legacy);
  const a = typeof av === "string" ? av : "";
  const b = typeof bv === "string" ? bv : "";
  const v = a !== "" && b !== "" ? `${a}\n\n${b}` : a !== "" ? a : b;
  const automation = useAutomation(f);
  return (
    <textarea
      data-f={f}
      value={v}
      readOnly={readOnly}
      onChange={(e) => {
        store.setField(f, e.target.value);
        if (b !== "") store.setField(legacy, "");
      }}
      {...automation}
      {...rest}
    />
  );
}

/** A bound checkbox (proficiency dots, death-save pips, studs, …). With
 * `truthyText`, a legacy non-empty STRING value also reads as checked — for
 * fields that used to be free text (the storage slots); toggling writes a
 * real boolean. */
export function Chk({
  f,
  truthyText = false,
  ...rest
}: { f: string; truthyText?: boolean } & InputHTMLAttributes<HTMLInputElement>) {
  const store = useStore();
  const readOnly = useContext(ReadOnlyContext);
  const v = useField(f);
  const checked = v === true || (truthyText && typeof v === "string" && v.trim() !== "");
  return (
    <input
      type="checkbox"
      data-f={f}
      checked={checked}
      disabled={readOnly}
      onChange={(e) => store.setField(f, e.target.checked)}
      {...useAutomation(f)}
      {...rest}
    />
  );
}

/** One table cell: a textarea stacked on an invisible replica of its value
 * (`data-v`) so long entries WRAP and grow the row instead of clipping — see
 * papersheet.css `.cellgrow`. */
function CellF({ f }: { f: string }) {
  const store = useStore();
  const readOnly = useContext(ReadOnlyContext);
  const v = useField(f);
  const s = typeof v === "string" ? v : "";
  return (
    <div className="cellgrow" data-v={s}>
      <textarea rows={1} data-f={f} value={s} readOnly={readOnly} onChange={(e) => store.setField(f, e.target.value)} {...useAutomation(f)} />
    </div>
  );
}

/** A ruled fill-in table (equipment, weapons, whispers). Cell fields are named
 * `{prefix}_{row}_{col}`, exactly like the original HTML sheet. */
export function SheetTable({
  prefix,
  head,
  widths,
  rows,
}: {
  prefix: string;
  head: string[];
  widths: string[];
  rows: number;
}) {
  return (
    // The wrapper is invisible at full width; on small screens it lets a
    // table that genuinely can't fit scroll sideways WITHIN its own frame
    // (the page itself never scrolls horizontally).
    <div className="sheetwrap">
      <table className="sheet">
        <colgroup>
          {widths.map((w, i) => (
            <col key={i} style={{ width: w }} />
          ))}
        </colgroup>
        <thead>
          <tr>
            {head.map((h) => (
              <th key={h}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: rows }, (_, r) => (
            <tr key={r}>
              {head.map((_, c) => (
                <td key={c}>
                  <CellF f={`${prefix}_${r}_${c}`} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
