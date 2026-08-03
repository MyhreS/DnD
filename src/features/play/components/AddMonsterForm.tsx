import { useState } from "react";

/** DM mini-form to quickly add a monster/NPC combatant — name, initiative, HP,
 * AC, an optional note (its attack / special), and a quantity to spawn several
 * at once (auto-numbered). */
export function AddMonsterForm({
  onAdd,
}: {
  onAdd: (m: { name: string; initiative: number; maxHp: number; ac: number | null; note: string | null }) => void;
}) {
  const [name, setName] = useState("");
  const [init, setInit] = useState("10");
  const [hp, setHp] = useState("10");
  const [ac, setAc] = useState("");
  const [note, setNote] = useState("");
  const [count, setCount] = useState("1");

  function submit() {
    const base = name.trim();
    if (!base) return;
    const n = Math.max(1, Math.min(12, parseInt(count, 10) || 1));
    const initiative = parseInt(init, 10) || 0;
    const maxHp = Math.max(1, parseInt(hp, 10) || 1);
    const acVal = ac ? parseInt(ac, 10) : null;
    const noteVal = note.trim() || null;
    for (let i = 0; i < n; i++) {
      onAdd({ name: n > 1 ? `${base} ${i + 1}` : base, initiative, maxHp, ac: acVal, note: noteVal });
    }
    setName("");
    setInit("10");
    setHp("10");
    setAc("");
    setNote("");
    setCount("1");
  }

  return (
    <div style={{ marginTop: 8, display: "grid", gap: 6 }}>
      <input className="input" placeholder="Monster name" value={name} onChange={(e) => setName(e.target.value)} />
      <div className="row" style={{ gap: 6 }}>
        <input className="input" type="number" aria-label="initiative" placeholder="Init" value={init} onChange={(e) => setInit(e.target.value)} style={{ width: 58 }} />
        <input className="input" type="number" aria-label="hit points" placeholder="HP" value={hp} onChange={(e) => setHp(e.target.value)} style={{ width: 58 }} />
        <input className="input" type="number" aria-label="armor class" placeholder="AC" value={ac} onChange={(e) => setAc(e.target.value)} style={{ width: 58 }} />
        <input className="input" type="number" aria-label="quantity" placeholder="×" title="How many" value={count} onChange={(e) => setCount(e.target.value)} style={{ width: 48 }} />
      </div>
      <input className="input" placeholder="Note — attack / special (optional)" value={note} onChange={(e) => setNote(e.target.value)} />
      <button type="button" className="btn btn-ghost btn-sm" style={{ width: "auto" }} onClick={submit}>
        Add{(parseInt(count, 10) || 1) > 1 ? ` ${Math.min(12, parseInt(count, 10) || 1)}` : ""}
      </button>
    </div>
  );
}
