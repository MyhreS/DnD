import { useState } from "react";

/** DM mini-form to add a monster/NPC combatant. */
export function AddMonsterForm({
  onAdd,
}: {
  onAdd: (m: { name: string; initiative: number; maxHp: number; ac: number | null }) => void;
}) {
  const [name, setName] = useState("");
  const [init, setInit] = useState("10");
  const [hp, setHp] = useState("10");
  const [ac, setAc] = useState("");

  function submit() {
    if (!name.trim()) return;
    onAdd({
      name: name.trim(),
      initiative: parseInt(init, 10) || 0,
      maxHp: Math.max(1, parseInt(hp, 10) || 1),
      ac: ac ? parseInt(ac, 10) : null,
    });
    setName("");
    setInit("10");
    setHp("10");
    setAc("");
  }

  return (
    <div style={{ marginTop: 8, display: "grid", gap: 6 }}>
      <input className="input" placeholder="Monster name" value={name} onChange={(e) => setName(e.target.value)} />
      <div className="row" style={{ gap: 6 }}>
        <input className="input" type="number" aria-label="initiative" placeholder="Init" value={init} onChange={(e) => setInit(e.target.value)} style={{ width: 64 }} />
        <input className="input" type="number" aria-label="hit points" placeholder="HP" value={hp} onChange={(e) => setHp(e.target.value)} style={{ width: 64 }} />
        <input className="input" type="number" aria-label="armor class" placeholder="AC" value={ac} onChange={(e) => setAc(e.target.value)} style={{ width: 64 }} />
        <button type="button" className="btn btn-ghost btn-sm" style={{ width: "auto", flex: 1 }} onClick={submit}>
          Add
        </button>
      </div>
    </div>
  );
}
