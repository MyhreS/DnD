import { useEffect, useState } from "react";
import { useAuthStore } from "@/store/authStore";
import { usePlayerStore } from "@/store/playerStore";
import { CharacterEditor } from "@/components/CharacterEditor";
import { HunterCardView } from "@/components/HunterCardView";
import { emptyCard } from "@/lib/character";
import { Splash } from "@/components/Splash";
import { HunterIcon } from "@/components/icons";
import type { HunterCard } from "@/types";

export function HunterPage() {
  const user = useAuthStore((s) => s.user);
  const { card, status, saving, error, load, save } = usePlayerStore();
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    if (user && status === "idle") void load(user.uid);
  }, [user, status, load]);

  if (status === "idle" || status === "loading") {
    return <Splash message="Unrolling your character sheet…" />;
  }

  if (status === "error") {
    return (
      <div className="card center">
        <p className="muted">{error ?? "Something went wrong."}</p>
        <button
          className="btn btn-ghost"
          style={{ maxWidth: 200, margin: "12px auto 0" }}
          onClick={() => user && void load(user.uid)}
        >
          Try again
        </button>
      </div>
    );
  }

  const hasCard = !!card && !!card.classId && !!card.name;

  async function handleSave(next: HunterCard) {
    const ok = await save(next);
    if (ok) setEditing(false);
  }

  // No card yet, or actively editing → show the builder.
  if (editing || !hasCard) {
    const initial =
      card ??
      emptyCard({
        uid: user!.uid,
        email: user!.email ?? "",
        displayName: user!.displayName ?? user!.email ?? "Hunter",
      });

    return (
      <div>
        <p className="eyebrow">Your Hunter</p>
        <h1 className="page-title">{hasCard ? "Edit hunter" : "Forge your hunter"}</h1>
        <p className="page-intro">
          {hasCard
            ? "Adjust your build below."
            : "Five steps from the handbook. The maths is done for you."}
        </p>
        <CharacterEditor
          initial={initial}
          saving={saving}
          error={error}
          onSave={handleSave}
          onCancel={hasCard ? () => setEditing(false) : undefined}
        />
      </div>
    );
  }

  // Has a card → show it.
  return (
    <div>
      <div className="row between" style={{ marginBottom: 14 }}>
        <p className="eyebrow row" style={{ gap: 6, margin: 0 }}>
          <HunterIcon width={16} height={16} /> Your Hunter
        </p>
        <button className="btn btn-ghost btn-sm" onClick={() => setEditing(true)}>
          Edit
        </button>
      </div>
      <HunterCardView card={card!} />
    </div>
  );
}
