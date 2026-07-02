import { Link } from "react-router-dom";
import { useAuthStore } from "@/features/auth/store/authStore";
import { usePlayerStore } from "@/features/hunter/store/playerStore";
import { useCampaignStore } from "@/features/campaigns/store/campaignStore";
import { useIsDM } from "@/features/campaigns/hooks/useIsDM";
import { useCharactersStore } from "@/features/play/store/charactersStore";
import { useCharactersSync } from "@/features/play/hooks/useCharactersSync";
import { useHunterCard } from "../hooks/useHunterCard";
import { HunterCardView } from "./HunterCardView";
import { CharacterTrackers } from "./CharacterTrackers";
import { InventoryPanel } from "./InventoryPanel";
import { LevelUpModal } from "./LevelUpModal";
import { patchCharacter } from "@/api/players";
import { CardSkeleton } from "@/components/Skeleton";

/** The in-campaign Hunter page. Players see their own brought hunter; the DM sees
 * a DM view and can step into any hunter ("play as") to test the game, then
 * return to DM. */
export function CampaignHunterPage() {
  const user = useAuthStore((s) => s.user);
  const { characters, status } = usePlayerStore();
  const campaign = useCampaignStore((s) => s.active);
  const members = useCampaignStore((s) => s.members);
  const activeId = useCampaignStore((s) => s.activeId);
  const pickCharacter = useCampaignStore((s) => s.pickCharacter);
  const isDM = useIsDM();
  const playingAsId = useCampaignStore((s) => s.playingAsId);
  const playAs = useCampaignStore((s) => s.playAs);
  const returnToDm = useCampaignStore((s) => s.returnToDm);
  const dmPatch = useCharactersStore((s) => s.dmPatch);
  const party = useCharactersStore((s) => s.party);
  useHunterCard();
  useCharactersSync();

  // --- DM view: run the table, or step into a hunter to test the game ---
  if (isDM) {
    const playing = playingAsId
      ? party.find((c) => c.id === playingAsId && c.classId && c.name) ?? null
      : null;

    if (playing) {
      return (
        <div>
          <p className="eyebrow" style={{ margin: 0 }}>Playing as · DM</p>
          <h1 className="page-title" style={{ margin: "0 0 12px" }}>{playing.name}</h1>
          <div className="desk-2col">
            <aside className="desk-aside no-print">
              <CharacterTrackers card={playing} dmMode onPatch={(p) => void dmPatch(playing.id, p)} />
            </aside>
            <div className="desk-main">
              <div className="print-sheet">
                <HunterCardView card={playing} onPatch={(p) => void dmPatch(playing.id, p)} />
              </div>
              <div className="no-print" style={{ marginTop: 14 }}>
                <InventoryPanel card={playing} editable dmMode onPatch={(p) => void dmPatch(playing.id, p)} />
              </div>
            </div>
          </div>
          <button className="btn btn-ghost" style={{ marginTop: 14, maxWidth: 220 }} onClick={returnToDm}>
            ← Return to DM
          </button>
        </div>
      );
    }

    const campHunters = party.filter((c) => c.campaignId === activeId && c.classId && c.name);
    return (
      <div className="reading">
        <p className="eyebrow">You're the DM</p>
        <h1 className="page-title">DM view</h1>
        <p className="page-intro">
          As the DM you run the table from <Link className="gold" to="/play">Play</Link> — you don't bring
          your own hunter. To see the game from a player's side (great for a test run), step into one of
          the campaign's hunters below; you can return to DM at any time.
        </p>
        <div className="card">
          <p className="eyebrow" style={{ marginTop: 0 }}>Play as a hunter</p>
          {campHunters.length === 0 ? (
            <p className="muted" style={{ margin: 0 }}>No hunters in this campaign yet.</p>
          ) : (
            <div className="card-grid">
              {campHunters.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  className="card card-hover"
                  style={{ textAlign: "left" }}
                  onClick={() => playAs(c.id, c.name)}
                >
                  <div style={{ fontFamily: "var(--font-display)", fontWeight: 600 }}>{c.name}</div>
                  <div className="faint" style={{ fontSize: "0.82rem", marginTop: 2 }}>Level {c.level}</div>
                  <div className="gold" style={{ fontSize: "0.8rem", marginTop: 6 }}>Play as →</div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // --- Player view ---
  const myCharId = members.find((m) => m.uid === user?.uid)?.characterId ?? null;
  const brought = characters.find((c) => c.id === myCharId && c.classId && c.name) ?? null;

  function bring(id: string) {
    if (!user || !activeId) return;
    void pickCharacter(user.uid, id);
    void patchCharacter(id, { campaignId: activeId });
  }

  if (status === "idle" || status === "loading") {
    return (
      <div>
        <p className="eyebrow">Your Hunter</p>
        <h1 className="page-title">Hunter</h1>
        <CardSkeleton lines={4} />
      </div>
    );
  }

  // Your hunter for this campaign — show the live sheet.
  if (brought) {
    return (
      <div>
        <p className="eyebrow" style={{ margin: 0 }}>Your hunter in {campaign?.name}</p>
        <h1 className="page-title" style={{ margin: "0 0 12px" }}>{brought.name}</h1>
        {brought.lastSeenLevel != null && brought.level > brought.lastSeenLevel && (
          <LevelUpModal card={brought} onPatch={(p) => void patchCharacter(brought.id, p)} />
        )}
        <div className="desk-2col">
          <aside className="desk-aside no-print">
            <CharacterTrackers card={brought} />
          </aside>
          <div className="desk-main">
            <div className="print-sheet">
              <HunterCardView card={brought} onPatch={(p) => void patchCharacter(brought.id, p)} />
            </div>
            <div className="no-print" style={{ marginTop: 14 }}>
              <InventoryPanel card={brought} editable />
            </div>
          </div>
        </div>
        <p className="faint no-print" style={{ fontSize: "0.8rem", marginTop: 14 }}>
          Manage or swap hunters from the <Link className="gold" to="/character">main menu → Hunters</Link>.
        </p>
      </div>
    );
  }

  // No hunter chosen yet (new join, or yours died) → pick one you've created.
  const ready = characters.filter((c) => c.classId && c.name);
  return (
    <div className="reading">
      <p className="eyebrow">Your Hunter</p>
      <h1 className="page-title">Bring a hunter in</h1>
      <p className="page-intro">
        Choose which of your hunters joins <span className="gold">{campaign?.name}</span>.
        {myCharId ? " Your last hunter is gone — a fresh one starts at level 1 with no items." : ""}
      </p>

      {ready.length > 0 ? (
        <div className="card">
          <p className="eyebrow" style={{ marginTop: 0 }}>Your hunters</p>
          <div className="card-grid">
            {ready.map((c) => (
              <button key={c.id} type="button" className="card card-hover" style={{ textAlign: "left" }} onClick={() => bring(c.id)}>
                <div style={{ fontFamily: "var(--font-display)", fontWeight: 600 }}>{c.name}</div>
                <div className="faint" style={{ fontSize: "0.82rem", marginTop: 2 }}>Level {c.level}</div>
                <div className="gold" style={{ fontSize: "0.8rem", marginTop: 6 }}>Bring in →</div>
              </button>
            ))}
          </div>
          <Link className="btn btn-ghost" to="/character" style={{ marginTop: 12 }}>Create another in the main menu</Link>
        </div>
      ) : (
        <div className="card center">
          <p className="muted">You have no hunters yet. Forge one in the main menu, then bring it in.</p>
          <Link className="btn btn-primary" to="/character" style={{ maxWidth: 260, margin: "10px auto 0" }}>
            Go to Hunters
          </Link>
        </div>
      )}
    </div>
  );
}
