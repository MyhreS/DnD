import { Link } from "react-router-dom";
import { useCampaignStore } from "@/features/campaigns/store/campaignStore";
import { useGameStore, currentGame } from "@/features/play/store/gameStore";
import { useCharactersStore } from "@/features/play/store/charactersStore";
import { useCombatStore } from "@/features/play/store/combatStore";
import { usePlaySync } from "@/features/play/hooks/usePlaySync";
import { useCharactersSync } from "@/features/play/hooks/useCharactersSync";
import { useCombatSync } from "@/features/play/hooks/useCombatSync";
import { useWakeLock } from "@/hooks/common/useWakeLock";
import { useFullscreen } from "@/hooks/common/useFullscreen";
import { sheetVitals, cardClassName } from "@/features/hunter/lib/papersheet";
import type { HunterCard } from "@/types";
import { CombatBoard } from "./CombatBoard";

/** Chrome-less table board. Character numbers come only from recorded sheet
 * fields; this projection never calculates missing rules or writes data. */
export function StatusPage() {
  usePlaySync();
  useCharactersSync();
  useWakeLock();
  const { isFullscreen, toggle, supported } = useFullscreen();
  const campaign = useCampaignStore((state) => state.active);
  const members = useCampaignStore((state) => state.members);
  const games = useGameStore((state) => state.games);
  const party = useCharactersStore((state) => state.party);
  const game = currentGame(games, campaign?.id ?? null);
  const liveGame = game && game.status === "active" ? game : null;
  useCombatSync(liveGame?.id ?? null, true);
  const combatants = useCombatStore((state) => state.combatants);
  const inCombat = Boolean(liveGame?.combat?.active && combatants.length > 0);
  const hunters = members
    .map((member) => party.find((card) => card.id === member.characterId))
    .filter((card): card is HunterCard => Boolean(card?.name));

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", color: "var(--ink)", padding: "clamp(16px, 3vw, 40px)" }}>
      <div className="row between" style={{ alignItems: "flex-start", marginBottom: 24, gap: 16 }}>
        <div style={{ minWidth: 0 }}>
          <p className="eyebrow">{campaign?.name ?? "Catacombs & Starspawns"}</p>
          <h1 style={{ margin: 0, fontSize: "clamp(2rem, 6vw, 4rem)", lineHeight: 1.05 }}>
            {inCombat ? "Combat" : liveGame ? "Session in progress" : "Between hunts"}
          </h1>
        </div>
        <div className="row" style={{ gap: 10, flex: "none" }}>
          {supported && <button className="btn btn-ghost" style={{ width: "auto" }} onClick={toggle}>{isFullscreen ? "Exit fullscreen" : "⛶ Fullscreen"}</button>}
          <Link className="btn btn-ghost" style={{ width: "auto" }} to="/">Menu</Link>
        </div>
      </div>

      {inCombat && liveGame && <CombatBoard game={liveGame} combatants={combatants} party={party} />}

      {hunters.length === 0 ? (
        <p className="muted" style={{ fontSize: "1.2rem" }}>No hunters in this campaign yet.</p>
      ) : (
        <>
          {inCombat && <p className="eyebrow" style={{ marginBottom: 12, fontSize: "1.05rem" }}>Party</p>}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 320px), 1fr))", gap: 16, alignItems: "start" }}>
            {hunters.map((card) => <VitalsCard key={card.id} card={card} />)}
          </div>
        </>
      )}
    </div>
  );
}

function recordedSheetInt(card: HunterCard, field: string, fallback?: number): number | null {
  const value = card.sheet?.[field];
  if (typeof value === "string") {
    const parsed = Number.parseInt(value.trim(), 10);
    if (Number.isFinite(parsed)) return parsed;
  }
  return typeof fallback === "number" ? fallback : null;
}

function VitalsCard({ card }: { card: HunterCard }) {
  const vitals = sheetVitals(card.sheet);
  const hp = vitals.hpCur ?? card.currentHp ?? null;
  const sanity = vitals.sanityCur ?? card.sanity ?? null;
  const fallen = hp !== null && hp <= 0;
  const transform = recordedSheetInt(card, "transformation", card.transformationLevel);
  const className = cardClassName(card);

  return (
    <div className="card" style={{ marginTop: 0, opacity: fallen ? .55 : 1, borderColor: fallen ? "var(--blood-bright)" : undefined }}>
      <div className="row between" style={{ marginBottom: 10, gap: 8 }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ overflowWrap: "anywhere", fontFamily: "var(--font-display)", fontSize: "1.5rem" }}>{card.name}</div>
          <div className="faint" style={{ fontSize: ".9rem" }}>{className ? `${className} · Lvl ${card.level}` : `Lvl ${card.level}`}{fallen ? " · fallen" : ""}</div>
        </div>
        {transform !== null && transform > 0 && <span className="chip" style={{ flex: "none" }}>Transform {transform}</span>}
      </div>
      {hp !== null && vitals.hpMax !== null ? <Bar label="HP" value={hp} max={vitals.hpMax} color="var(--blood-bright)" /> : hp !== null ? <RecordedValue label="HP" value={hp} /> : <p className="faint" style={{ margin: "8px 0 0" }}>Vitals are blank on the character sheet.</p>}
      {sanity !== null && vitals.sanityMax !== null ? <Bar label="Sanity" value={sanity} max={vitals.sanityMax} color="#7c5cff" /> : sanity !== null ? <RecordedValue label="Sanity" value={sanity} /> : null}
    </div>
  );
}

function Bar({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  const percent = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div style={{ marginTop: 8 }}>
      <div className="row between" style={{ marginBottom: 4 }}><span style={{ fontWeight: 600 }}>{label}</span><span style={{ fontFamily: "var(--font-display)", fontSize: "1.3rem" }}>{value}<span className="faint" style={{ fontSize: ".85rem" }}> / {max}</span></span></div>
      <div style={{ height: 10, overflow: "hidden", borderRadius: 6, background: "var(--bg)" }}><div style={{ width: `${Math.max(0, Math.min(100, percent))}%`, height: "100%", background: color }} /></div>
    </div>
  );
}

function RecordedValue({ label, value }: { label: string; value: number }) {
  return <div className="row between" style={{ marginTop: 10 }}><span>{label}</span><strong style={{ fontFamily: "var(--font-display)", fontSize: "1.3rem" }}>{value}</strong></div>;
}
