import { useAuthStore } from "@/features/auth/store/authStore";
import { usePartyData } from "@/features/party/hooks/usePartyData";
import { useCombatSync } from "../hooks/useCombatSync";
import { useCombatStore } from "../store/combatStore";
import { CombatRulesPanel } from "./CombatRulesPanel";
import { CombatSetup } from "./CombatSetup";
import { CombatTracker } from "./CombatTracker";

const PLAYER_CARD_PATH = "/game-card/players-game-card.pdf";

export function CombatPage() {
  useCombatSync();
  const canControl = useAuthStore((s) => s.caps.oversight);
  const started = useCombatStore((s) => s.session.started);
  const { players } = usePartyData({ oversight: false });

  if (!canControl) {
    return (
      <div>
        <h1 className="page-title">Combat</h1>
        <p className="page-intro">The DM controls the live encounter. Players can follow it on the battle screen.</p>
        <a className="btn btn-ghost" href={PLAYER_CARD_PATH} target="_blank" rel="noreferrer">Open player's game card</a>
      </div>
    );
  }

  return (
    <div className="combat-page">
      <div className="combat-page-heading">
        <div>
          <p className="eyebrow">DM tools</p>
          <h1 className="page-title">Combat</h1>
        </div>
        <button className="btn btn-ghost btn-sm" type="button" onClick={() => window.open("/combat/display", "cs-battle-screen")}>
          Open battle screen
        </button>
      </div>
      <p className="page-intro">Run initiative, damage, conditions, and the 90-second turn clock.</p>

      {started ? <CombatTracker /> : <CombatSetup hunters={players ?? []} />}

      <div className="combat-resource-links">
        <a href={PLAYER_CARD_PATH} target="_blank" rel="noreferrer">Open player's game card</a>
        <a href="/combat/display" target="_blank" rel="noreferrer">Open presentation view</a>
      </div>
      <CombatRulesPanel />
    </div>
  );
}

