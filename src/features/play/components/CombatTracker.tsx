import { useState } from "react";
import { AsyncButton } from "@/components/AsyncButton";
import { getClass } from "@/data/classes";
import { maxHp, initiativeMod } from "@/lib/character";
import { useCombatStore, initiativeOrder } from "../store/combatStore";
import { useCombatSync } from "../hooks/useCombatSync";
import { useCharactersSync } from "../hooks/useCharactersSync";
import { useCharactersStore } from "../store/charactersStore";
import { CombatantRow } from "./CombatantRow";
import { AddMonsterForm } from "./AddMonsterForm";
import type { Combatant, Game, GameParticipant } from "@/types";

/** Live initiative tracker shown to EVERYONE during the combat phase. The DM
 * edits (start, add monsters, turns, HP, conditions); players read. PC HP is
 * read live from the HunterCard; monsters carry their own HP. */
export function CombatTracker({
  game,
  isDM,
  participants,
}: {
  game: Game;
  isDM: boolean;
  participants: GameParticipant[];
}) {
  useCombatSync(game.id);
  useCharactersSync();
  const combatants = useCombatStore((s) => s.combatants);
  const party = useCharactersStore((s) => s.party);
  const startEncounter = useCombatStore((s) => s.startEncounter);
  const addMonster = useCombatStore((s) => s.addMonster);
  const patch = useCombatStore((s) => s.patch);
  const remove = useCombatStore((s) => s.remove);
  const toggleCondition = useCombatStore((s) => s.toggleCondition);
  const nextTurn = useCombatStore((s) => s.nextTurn);
  const endEncounter = useCombatStore((s) => s.endEncounter);
  const [adding, setAdding] = useState(false);

  const active = game.combat?.active ?? false;
  const order = initiativeOrder(combatants);
  const activeId = game.combat?.turnId ?? order[0]?.id ?? null;

  /** Seed PC combatants from the participants who brought a hunter. */
  function seedPcs() {
    const seen = new Set<string>();
    const pcs: { characterId: string; name: string; dexMod: number }[] = [];
    for (const pt of participants) {
      if (pt.role !== "player") continue;
      const card = party.find((c) => c.ownerUid === pt.uid && !!c.classId);
      if (!card || seen.has(card.id)) continue;
      seen.add(card.id);
      pcs.push({ characterId: card.id, name: card.name, dexMod: initiativeMod(card.abilities) });
    }
    return pcs;
  }

  /** PC HP from the live HunterCard; monsters self-contained. */
  function vitals(c: Combatant): { hp: number | null; max: number | null } {
    if (c.kind === "monster") return { hp: c.currentHp ?? null, max: c.maxHp ?? null };
    const card = c.characterId ? party.find((p) => p.id === c.characterId) : undefined;
    if (!card) return { hp: null, max: null };
    const klass = getClass(card.classId);
    const max = klass ? maxHp(klass, card.abilities, card.level) : null;
    return { hp: card.currentHp ?? max, max };
  }

  if (!active) {
    return (
      <div className="card" style={{ borderColor: "var(--blood-bright)" }}>
        <p className="eyebrow" style={{ marginBottom: 6 }}>Combat</p>
        {isDM ? (
          <>
            <p className="muted" style={{ marginTop: 0, fontSize: "0.9rem" }}>
              Roll initiative to start the encounter — hunters in the game are added automatically.
            </p>
            <AsyncButton
              className="btn btn-primary"
              pendingText="Rolling…"
              showDone={false}
              onClick={() => startEncounter(game.id, seedPcs())}
            >
              Roll initiative
            </AsyncButton>
          </>
        ) : (
          <p className="muted" style={{ margin: 0, fontSize: "0.9rem" }}>
            Waiting for the DM to roll initiative…
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="card" style={{ borderColor: "var(--blood-bright)" }}>
      <div className="row between" style={{ marginBottom: 8, gap: 8 }}>
        <p className="eyebrow" style={{ margin: 0 }}>Combat · Round {game.combat?.round ?? 1}</p>
        {isDM && (
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            style={{ width: "auto", flex: "none" }}
            onClick={() => nextTurn(game.id, game, combatants)}
          >
            Next turn ▸
          </button>
        )}
      </div>

      {order.length === 0 ? (
        <p className="faint" style={{ fontSize: "0.88rem", margin: 0 }}>No combatants yet.</p>
      ) : (
        <div className="stack" style={{ gap: 8 }}>
          {order.map((c) => {
            const v = vitals(c);
            return (
              <CombatantRow
                key={c.id}
                combatant={c}
                hp={v.hp}
                max={v.max}
                active={c.id === activeId}
                isDM={isDM}
                onPatch={(p) => patch(game.id, c.id, p)}
                onToggleCondition={(cid) => toggleCondition(game.id, c, cid)}
                onRemove={() => remove(game.id, c.id)}
              />
            );
          })}
        </div>
      )}

      {isDM && (
        <div style={{ marginTop: 10, borderTop: "1px solid var(--border)", paddingTop: 10 }}>
          <div className="btn-row">
            <button type="button" className="btn btn-ghost btn-sm" style={{ width: "auto" }} onClick={() => setAdding((a) => !a)}>
              {adding ? "Cancel" : "+ Monster"}
            </button>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              style={{ width: "auto", color: "var(--blood-bright)" }}
              onClick={() => endEncounter(game.id)}
            >
              End encounter
            </button>
          </div>
          {adding && (
            <AddMonsterForm
              onAdd={(m) => {
                void addMonster(game.id, m);
                setAdding(false);
              }}
            />
          )}
        </div>
      )}
    </div>
  );
}
