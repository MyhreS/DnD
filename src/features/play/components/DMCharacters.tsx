import { useState } from "react";
import { getClass } from "@/data/classes";
import { maxHp, earnedLevel, isLevelUpPending } from "@/lib/character";
import { AsyncButton } from "@/components/AsyncButton";
import { DMCharacterEditor } from "./DMCharacterEditor";
import { useCharactersStore } from "../store/charactersStore";
import { useCampaignStore } from "@/features/campaigns/store/campaignStore";
import type { ArchivedCharacter, HunterCard } from "@/types";

/** DM-only board: this campaign's characters with HP / level / items, plus full
 * control — confirm/override death and recover archived hunters. Scoped to the
 * active campaign so the DM only sees (and can only act on) hunters it manages. */
export function DMCharacters({ gameId }: { gameId: string | null }) {
  const activeId = useCampaignStore((s) => s.activeId);
  const party = useCharactersStore((s) => s.party).filter((c) => c.campaignId === activeId);
  const archive = useCharactersStore((s) => s.archive);
  const error = useCharactersStore((s) => s.error);

  return (
    <div className="card">
      <p className="eyebrow" style={{ marginBottom: 8 }}>Characters · DM control</p>
      {error && <div className="banner banner-error" style={{ marginBottom: 8 }}>{error}</div>}

      {party.length === 0 ? (
        <p className="faint" style={{ fontSize: "0.88rem", margin: 0 }}>No characters yet.</p>
      ) : (
        party.map((c) => <CharacterRow key={c.id} card={c} gameId={gameId} />)
      )}

      {archive.length > 0 && (
        <>
          <hr className="divider" />
          <p className="eyebrow" style={{ marginBottom: 8 }}>Archived ({archive.length})</p>
          {archive.map((a) => <ArchivedRow key={a.id} a={a} />)}
        </>
      )}
    </div>
  );
}

function CharacterRow({ card, gameId }: { card: HunterCard; gameId: string | null }) {
  const kill = useCharactersStore((s) => s.killCharacter);
  const revive = useCharactersStore((s) => s.revive);
  const award = useCharactersStore((s) => s.awardInsight);
  const [editing, setEditing] = useState(false);
  const [confirming, setConfirming] = useState(false);

  const klass = getClass(card.classId);
  const hpMax = klass ? maxHp(klass, card.abilities, card.level) : 0;
  const hp = card.currentHp ?? hpMax;
  const dying = card.deathPending || hp <= 0;
  const insight = card.insight ?? 0;
  const earnedLvl = earnedLevel(card);
  const pendingLevel = isLevelUpPending(card);

  return (
    <div style={{ padding: "10px 0", borderTop: "1px solid var(--border)" }}>
      <div className="row between" style={{ gap: 8 }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontWeight: 600 }}>
            {card.name}
            {card.deathPending && <span className="role-tag" style={{ marginLeft: 8, color: "var(--blood-bright)" }}>death pending</span>}
          </div>
          <div className="faint" style={{ fontSize: "0.78rem" }}>
            {klass ? `${klass.name} · Lvl ${card.level}` : "Hunter"} · HP {hp}/{hpMax}
          </div>
        </div>
        <button className="btn btn-ghost btn-sm" style={{ width: "auto", flex: "none" }} onClick={() => setEditing((s) => !s)}>
          {editing ? "Close" : "Edit"}
        </button>
      </div>

      {editing && <DMCharacterEditor card={card} />}

      <div className="row between" style={{ marginTop: 8, gap: 8 }}>
        <div className="faint" style={{ fontSize: "0.78rem", minWidth: 0 }}>
          Insight {insight}
          {pendingLevel && <span className="gold"> · → Lvl {earnedLvl} after a rest</span>}
        </div>
        <div className="row" style={{ gap: 4, flex: "none" }}>
          {[1, 5, 25].map((d) => (
            <button
              key={d}
              className="btn btn-ghost btn-sm"
              style={{ width: "auto", padding: "4px 8px" }}
              onClick={() => award(card.id, d)}
            >
              +{d}
            </button>
          ))}
          <button
            className="btn btn-ghost btn-sm"
            style={{ width: "auto", padding: "4px 8px" }}
            disabled={insight <= 0}
            onClick={() => award(card.id, -1)}
            aria-label="decrease Insight"
          >
            −
          </button>
        </div>
      </div>

      <div className="btn-row" style={{ marginTop: 8 }}>
        {card.deathPending ? (
          <>
            <AsyncButton className="btn btn-ghost" pendingText="…" showDone={false} onClick={() => revive(card.id)}>
              Revive
            </AsyncButton>
            <AsyncButton className="btn btn-primary" style={{ background: "var(--blood)" }} pendingText="…" showDone={false} onClick={() => kill(card, gameId)}>
              Confirm death
            </AsyncButton>
          </>
        ) : confirming ? (
          <>
            <button className="btn btn-ghost" onClick={() => setConfirming(false)}>Cancel</button>
            <AsyncButton className="btn btn-primary" style={{ background: "var(--blood)" }} pendingText="…" showDone={false} onClick={() => kill(card, gameId)}>
              Yes, mark dead
            </AsyncButton>
          </>
        ) : (
          <button className="btn btn-ghost btn-sm" style={{ color: dying ? "var(--blood-bright)" : undefined, width: "auto" }} onClick={() => setConfirming(true)}>
            Mark dead
          </button>
        )}
      </div>
    </div>
  );
}

function ArchivedRow({ a }: { a: ArchivedCharacter }) {
  const recover = useCharactersStore((s) => s.recover);
  const klass = getClass(a.card.classId);
  return (
    <div className="row between" style={{ padding: "8px 0", borderTop: "1px solid var(--border)", gap: 8 }}>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontWeight: 600, fontSize: "0.92rem" }}>{a.card.name}</div>
        <div className="faint" style={{ fontSize: "0.78rem" }}>
          {klass ? `${klass.name} · Lvl ${a.card.level}` : "Hunter"} · {a.reason}
        </div>
      </div>
      <AsyncButton className="btn btn-ghost btn-sm" style={{ width: "auto", flex: "none" }} pendingText="…" showDone={false} onClick={() => recover(a)}>
        Recover
      </AsyncButton>
    </div>
  );
}
