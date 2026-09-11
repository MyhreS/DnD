import { useState } from "react";
import { canSpendFavor } from "@/lib/death";
import { INSIGHT_BY_LEVEL } from "@/lib/insight";
import type { HunterCard } from "@/types";

/** The at-the-moment-of-death Favor prompt. core-rulebook.txt [page 44]: "When
 * you die, you may expend one Favor. This decision must be made when you die."
 * A Hunter holding none gets a plain confirmation instead. */
export function HunterDeathDialog({
  card,
  busy,
  onConfirm,
  onClose,
}: {
  card: HunterCard;
  busy: boolean;
  onConfirm: (spendFavor: boolean) => void;
  onClose: () => void;
}) {
  const favors = card.favors ?? 0;
  const canSpend = canSpendFavor(card);
  const [spendFavor, setSpendFavor] = useState(false);
  const level = Math.max(1, Math.min(INSIGHT_BY_LEVEL.length - 1, card.level));
  const items = (card.inventory ?? []).reduce((total, entry) => total + (entry.qty ?? 1), 0);
  const coins = card.coins ?? 0;
  const drop = `${items} item${items === 1 ? "" : "s"} and ${coins} coin${coins === 1 ? "" : "s"}`;

  return (
    <div className="game-dialog-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="game-dialog battle-death-dialog" role="dialog" aria-modal="true" aria-labelledby="hunter-death-title">
        <header>
          <div><p className="eyebrow">Death</p><h2 id="hunter-death-title">{card.name} dies</h2></div>
          <button className="game-dialog-close" type="button" onClick={onClose} aria-label="Close">×</button>
        </header>

        {canSpend ? (<>
          <p className="muted">{card.name} holds {favors} Favor{favors === 1 ? "" : "s"}. The decision must be made now, at the moment of death.</p>
          <div className="battle-death-choices" role="group" aria-label="Favor decision">
            <button type="button" className={`battle-death-choice${spendFavor ? " is-chosen" : ""}`} aria-pressed={spendFavor} onClick={() => setSpendFavor(true)}>
              <strong>Expend a Favor</strong>
              <small>Their body and everything worn or carried disappear from the world — <b>nothing drops as loot</b>. They return with their gear after the Band's next Long Rest, and lose all Insight gained since reaching level {level}.</small>
            </button>
            <button type="button" className={`battle-death-choice${spendFavor ? "" : " is-chosen"}`} aria-pressed={!spendFavor} onClick={() => setSpendFavor(false)}>
              <strong>Keep the Favor — death proceeds normally</strong>
              <small>{card.name} is archived among the fallen and their gear (<b>{drop}</b>) drops as claimable loot. They do not return.</small>
            </button>
          </div>
        </>) : (
          <p className="muted">{card.name} holds no Favors, so death proceeds normally: they are archived among the fallen and their gear ({drop}) drops as claimable loot.</p>
        )}
        <p className="game-dialog-note">This marks another player's Hunter dead. You can un-archive them from the fallen roster on this screen.</p>

        <footer>
          <button className="btn btn-ghost" type="button" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" type="button" disabled={busy} onClick={() => onConfirm(spendFavor && canSpend)}>
            {spendFavor && canSpend ? "Expend a Favor" : "Confirm death"}
          </button>
        </footer>
      </section>
    </div>
  );
}
