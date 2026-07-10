import { Link } from "react-router-dom";
import { useAuthStore } from "@/features/auth/store/authStore";
import { usePlayerStore } from "@/features/hunter/store/playerStore";
import { useCampaignStore } from "@/features/campaigns/store/campaignStore";
import { useIsDM } from "@/features/campaigns/hooks/useIsDM";
import { useCharactersStore } from "@/features/play/store/charactersStore";
import { useCharactersSync } from "@/features/play/hooks/useCharactersSync";
import { useHunterCard } from "../hooks/useHunterCard";
import { HunterListCard } from "./HunterListCard";
import { SheetCharacterView } from "./SheetCharacterView";
import { patchCharacter } from "@/api/players";
import { CardSkeleton } from "@/components/Skeleton";
import type { HunterCard } from "@/types";

/** Playable in a campaign: any named hunter (every hunter is a paper sheet). */
const playable = (c: HunterCard) => !!c.name;

/** The in-campaign Hunter page. Players see their own brought hunter; the DM
 * sees a DM view and can step into any hunter's sheet, then return to DM. */
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
  const party = useCharactersStore((s) => s.party);
  useHunterCard();
  useCharactersSync();

  // --- DM view: run the table, or step into a hunter's sheet ---
  if (isDM) {
    const playing = playingAsId ? party.find((c) => c.id === playingAsId && playable(c)) ?? null : null;

    if (playing) {
      return (
        <div>
          <p className="eyebrow" style={{ margin: 0 }}>Playing as · DM</p>
          <h1 className="page-title" style={{ margin: "0 0 12px" }}>{playing.name}</h1>
          <SheetCharacterView key={playing.id} card={playing} autoOpen={false} />
          <button className="btn btn-ghost" style={{ marginTop: 14, maxWidth: 220 }} onClick={returnToDm}>
            ← Return to DM
          </button>
        </div>
      );
    }

    const campHunters = party.filter((c) => c.campaignId === activeId && playable(c));
    return (
      <div className="reading">
        <p className="eyebrow">You're the DM</p>
        <h1 className="page-title">DM view</h1>
        <p className="page-intro">
          As the DM you run the table from <Link className="gold" to="/play">Play</Link> — you don't bring
          your own hunter. To see the game from a player's side (great for a test run), step into one of
          the campaign's hunters below; you can return to DM at any time.
        </p>
        <p className="eyebrow" style={{ marginTop: 0, marginBottom: 8 }}>Play as a hunter</p>
        {campHunters.length === 0 ? (
          <div className="card"><p className="muted" style={{ margin: 0 }}>No hunters in this campaign yet.</p></div>
        ) : (
          <div className="stack" style={{ gap: 10 }}>
            {campHunters.map((c) => (
              <HunterListCard key={c.id} card={c} actionHint="Play as →" onOpen={() => playAs(c.id, c.name)} />
            ))}
          </div>
        )}
      </div>
    );
  }

  // --- Player view ---
  const myCharId = members.find((m) => m.uid === user?.uid)?.characterId ?? null;
  const brought = characters.find((c) => c.id === myCharId && playable(c)) ?? null;

  function bring(id: string) {
    if (!user || !activeId) return;
    void pickCharacter(user.uid, id, characters.find((c) => c.id === id)?.name);
    // Entering a campaign is a fresh start — leftover "recently dropped"
    // lines (#136) don't follow the hunter in.
    void patchCharacter(id, { campaignId: activeId, droppedItems: [] });
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

  // Your hunter for this campaign — the paper sheet is its whole truth.
  if (brought) {
    return (
      <div>
        <p className="eyebrow" style={{ margin: 0 }}>Your hunter in {campaign?.name}</p>
        <h1 className="page-title" style={{ margin: "0 0 12px" }}>{brought.name}</h1>
        <SheetCharacterView key={brought.id} card={brought} autoOpen={false} />
        <p className="faint no-print" style={{ fontSize: "0.8rem", marginTop: 14 }}>
          Manage or swap hunters from the <Link className="gold" to="/character">main menu → Hunters</Link>.
        </p>
      </div>
    );
  }

  // No hunter chosen yet (new join, or yours died) → pick one you've created.
  const ready = characters.filter(playable);
  return (
    <div className="reading">
      <p className="eyebrow">Your Hunter</p>
      <h1 className="page-title">Bring a hunter in</h1>
      <p className="page-intro">
        Choose which of your hunters joins <span className="gold">{campaign?.name}</span>.
        {myCharId ? " Your last hunter is gone — a fresh one starts at level 1 with no items." : ""}
      </p>

      {ready.length > 0 ? (
        <>
          <p className="eyebrow" style={{ marginTop: 0, marginBottom: 8 }}>Your hunters</p>
          <div className="stack" style={{ gap: 10 }}>
            {ready.map((c) => (
              <HunterListCard key={c.id} card={c} actionHint="Bring in →" onOpen={() => bring(c.id)} />
            ))}
          </div>
          <Link className="btn btn-ghost" to="/character?new=1" style={{ marginTop: 12 }}>Create another in the main menu</Link>
        </>
      ) : (
        <div className="card center">
          <p className="muted">You have no hunters yet. Write one on the sheet in the main menu, then bring it in.</p>
          <Link className="btn btn-primary" to="/character" style={{ maxWidth: 260, margin: "10px auto 0" }}>
            Go to Hunters
          </Link>
        </div>
      )}
    </div>
  );
}
