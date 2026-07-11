import { useMemo, useState } from "react";
import { SearchControls } from "@/components/SearchControls";
import { searchEntries } from "@/lib/search";
import { cardClassName } from "@/features/hunter/lib/papersheet";
import type { HunterCard } from "@/types";

const MAX_RESULTS = 12;

/** The DM board's search: ranks every hunter not yet on the board — by hunter
 * name, owner (name / email prefix), class, background and level — via the
 * shared search primitive (lib/search), with an Add button per result. */
export function DMHunterSearch({
  characters,
  onAdd,
}: {
  /** Candidates: all hunters minus the ones already on the board. */
  characters: HunterCard[];
  onAdd: (id: string) => void;
}) {
  const [query, setQuery] = useState("");

  const entries = useMemo(
    () =>
      characters.map((card) => ({
        card,
        term: card.name || "Unnamed hunter",
        aliases: [card.ownerName, card.ownerEmail.split("@")[0] ?? "", cardClassName(card)].filter(Boolean),
        body: [card.background || "", `level ${card.level}`, `lvl ${card.level}`],
      })),
    [characters],
  );

  const results = query.trim() ? searchEntries(entries, query).slice(0, MAX_RESULTS) : [];

  return (
    <div className="stack" style={{ gap: 10 }}>
      <SearchControls
        query={query}
        onQuery={setQuery}
        placeholder="Search a player, hunter or class…"
        categories={[]}
        category="all"
        onCategory={() => undefined}
        showCategories={false}
      />
      {query.trim() !== "" &&
        (results.length === 0 ? (
          <p className="muted" style={{ margin: 0, fontSize: "0.9rem" }}>
            No hunter answers to that name.
          </p>
        ) : (
          results.map(({ card }) => <ResultRow key={card.id} card={card} onAdd={onAdd} />)
        ))}
    </div>
  );
}

function ResultRow({ card, onAdd }: { card: HunterCard; onAdd: (id: string) => void }) {
  const name = card.name || "Unnamed hunter";
  const cls = cardClassName(card);
  return (
    <div className="card row between" style={{ padding: "10px 14px", gap: 10 }}>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontFamily: "var(--font-display)", fontWeight: 600 }}>{name}</div>
        <div className="gold" style={{ fontSize: "0.84rem" }}>
          {cls ? `${cls} · ` : ""}Lvl {card.level}
          <span className="faint"> · {card.ownerName}</span>
        </div>
      </div>
      <button
        type="button"
        className="btn btn-sm"
        style={{ flex: "none" }}
        aria-label={`add ${name} to your board`}
        onClick={() => onAdd(card.id)}
      >
        Add
      </button>
    </div>
  );
}
