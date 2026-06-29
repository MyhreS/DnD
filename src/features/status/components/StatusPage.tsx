import { Link } from "react-router-dom";
import { useCampaignStore } from "@/features/campaigns/store/campaignStore";
import { useGameStore, currentGame } from "@/features/play/store/gameStore";
import { useCharactersStore } from "@/features/play/store/charactersStore";
import { usePlaySync } from "@/features/play/hooks/usePlaySync";
import { useCharactersSync } from "@/features/play/hooks/useCharactersSync";
import { PHASE_LABEL, LOCATION_LABEL } from "@/features/play/lib/phase";
import { useWakeLock } from "@/hooks/common/useWakeLock";
import { useFullscreen } from "@/hooks/common/useFullscreen";
import { getClass } from "@/data/classes";
import { maxHp, maxSanity } from "@/lib/character";
import type { HunterCard } from "@/types";

/** Chrome-less big-screen board for a TV/laptop at the table: the current phase
 * + location and every hunter's live vitals. Read-only — a projection of the
 * live game; it never writes. (Combat initiative/conditions arrive with the
 * combat tracker.) */
export function StatusPage() {
  usePlaySync();
  useCharactersSync();
  useWakeLock();
  const { isFullscreen, toggle, supported } = useFullscreen();
  const campaign = useCampaignStore((s) => s.active);
  const members = useCampaignStore((s) => s.members);
  const games = useGameStore((s) => s.games);
  const party = useCharactersStore((s) => s.party);

  const game = currentGame(games, campaign?.id ?? null);
  const hunters = members
    .map((m) => party.find((c) => c.id === m.characterId))
    .filter((c): c is HunterCard => !!c && !!c.classId);

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", color: "var(--text)", padding: "clamp(16px, 3vw, 40px)" }}>
      <div className="row between" style={{ alignItems: "flex-start", marginBottom: 24, gap: 16 }}>
        <div style={{ minWidth: 0 }}>
          <p className="eyebrow">{campaign?.name ?? "Catacombs & Starspawns"}</p>
          <h1 style={{ fontSize: "clamp(2rem, 6vw, 4rem)", margin: 0, lineHeight: 1.05 }}>
            {game ? PHASE_LABEL[game.phase] : "Between hunts"}
          </h1>
          {game && (
            <span className="chip" style={{ marginTop: 10, fontSize: "1rem" }}>
              {LOCATION_LABEL[game.location ?? "wild"]}
            </span>
          )}
        </div>
        <div className="row" style={{ gap: 10, flex: "none" }}>
          {supported && (
            <button className="btn btn-ghost" style={{ width: "auto" }} onClick={toggle}>
              {isFullscreen ? "Exit fullscreen" : "⛶ Fullscreen"}
            </button>
          )}
          <Link className="btn btn-ghost" style={{ width: "auto" }} to="/">Menu</Link>
        </div>
      </div>

      {hunters.length === 0 ? (
        <p className="muted" style={{ fontSize: "1.2rem" }}>No hunters in this campaign yet.</p>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 320px), 1fr))",
            gap: 16,
          }}
        >
          {hunters.map((c) => (
            <VitalsCard key={c.id} card={c} />
          ))}
        </div>
      )}
    </div>
  );
}

function VitalsCard({ card }: { card: HunterCard }) {
  const klass = getClass(card.classId);
  const hpMax = klass ? maxHp(klass, card.abilities, card.level) : 0;
  const sanMax = klass ? maxSanity(klass, card.abilities, card.level) : 0;
  const hp = Math.min(hpMax, card.currentHp ?? hpMax);
  const san = Math.min(sanMax, card.sanity ?? sanMax);
  const dead = card.deathPending || hp <= 0;
  const transform = card.transformationLevel ?? 0;

  return (
    <div className="card" style={{ opacity: dead ? 0.55 : 1, borderColor: dead ? "var(--blood-bright)" : undefined }}>
      <div className="row between" style={{ marginBottom: 10, gap: 8 }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontFamily: "var(--font-display)", fontSize: "1.5rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {card.name}
          </div>
          <div className="faint" style={{ fontSize: "0.9rem" }}>
            {klass ? `${klass.name} · Lvl ${card.level}` : "Hunter"}
            {dead ? " · fallen" : ""}
          </div>
        </div>
        {transform > 0 && <span className="chip" style={{ flex: "none" }}>Transform {transform}</span>}
      </div>
      <Bar label="HP" value={hp} max={hpMax} color="var(--blood-bright)" />
      <Bar label="Sanity" value={san} max={sanMax} color="#7c5cff" sub={`Madness ${Math.max(0, sanMax - san)}`} />
    </div>
  );
}

function Bar({ label, value, max, color, sub }: { label: string; value: number; max: number; color: string; sub?: string }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div style={{ marginTop: 8 }}>
      <div className="row between" style={{ marginBottom: 4 }}>
        <span style={{ fontWeight: 600 }}>
          {label} {sub && <span className="faint" style={{ fontSize: "0.85rem" }}>{sub}</span>}
        </span>
        <span style={{ fontFamily: "var(--font-display)", fontSize: "1.3rem" }}>
          {value}<span className="faint" style={{ fontSize: "0.85rem" }}> / {max}</span>
        </span>
      </div>
      <div style={{ height: 10, borderRadius: 6, background: "var(--bg)", overflow: "hidden" }}>
        <div style={{ width: `${pct}%`, height: "100%", background: color }} />
      </div>
    </div>
  );
}
