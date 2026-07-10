import {
  createContext,
  useContext,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from "react";
import type { SheetData } from "@/types";

/** The paper sheet's field bus: every field component reads/writes one key of
 * the free-form `SheetData` map (the original HTML's `data-f` names). */
interface SheetContextValue {
  data: SheetData;
  setField: (f: string, v: string | boolean) => void;
  readOnly: boolean;
}

const SheetContext = createContext<SheetContextValue | null>(null);

export function SheetProvider({
  data,
  setField,
  readOnly = false,
  children,
}: {
  data: SheetData;
  setField: (f: string, v: string | boolean) => void;
  readOnly?: boolean;
  children: ReactNode;
}) {
  return <SheetContext.Provider value={{ data, setField, readOnly }}>{children}</SheetContext.Provider>;
}

function useSheet(): SheetContextValue {
  const ctx = useContext(SheetContext);
  if (!ctx) throw new Error("Sheet fields must be rendered inside <SheetProvider>");
  return ctx;
}

/** The red numbered step badge from the DM's tutorial ("numbered") sheet. */
export function St({ n }: { n: number }) {
  return <b className="st">{n}</b>;
}

/** A bound handwriting text field. */
export function F({ f, ...rest }: { f: string } & InputHTMLAttributes<HTMLInputElement>) {
  const { data, setField, readOnly } = useSheet();
  const v = data[f];
  return (
    <input
      type="text"
      value={typeof v === "string" ? v : ""}
      readOnly={readOnly}
      onChange={(e) => setField(f, e.target.value)}
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
  const { data } = useSheet();
  return <>{children(data[f])}</>;
}

/** A bound handwriting dropdown: fixed choices plus an empty "—". A saved
 * value that isn't one of the options (legacy free-typed text) is kept and
 * shown as an extra option rather than silently cleared. */
export function Sel({ f, options, ...rest }: { f: string; options: string[] } & SelectHTMLAttributes<HTMLSelectElement>) {
  const { data, setField, readOnly } = useSheet();
  const raw = data[f];
  const v = typeof raw === "string" ? raw : "";
  const opts = v !== "" && !options.includes(v) ? [...options, v] : options;
  return (
    // data-empty lets print blank the "—" placeholder (papersheet.css), so a
    // blank sheet still prints as an empty handwriting line.
    <select
      value={v}
      disabled={readOnly}
      data-empty={v === "" || undefined}
      onChange={(e) => setField(f, e.target.value)}
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
  const { data, setField, readOnly } = useSheet();
  const v = data[f];
  return (
    <textarea
      value={typeof v === "string" ? v : ""}
      readOnly={readOnly}
      onChange={(e) => setField(f, e.target.value)}
      {...rest}
    />
  );
}

/** A bound checkbox (proficiency dots, death-save pips, studs, …). */
export function Chk({ f, ...rest }: { f: string } & InputHTMLAttributes<HTMLInputElement>) {
  const { data, setField, readOnly } = useSheet();
  return (
    <input
      type="checkbox"
      checked={data[f] === true}
      disabled={readOnly}
      onChange={(e) => setField(f, e.target.checked)}
      {...rest}
    />
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
                  <F f={`${prefix}_${r}_${c}`} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
