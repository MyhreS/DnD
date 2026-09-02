import { INSANE_QUIRKS, INSANE_QUIRK_BY_ID } from "@/data/insaneQuirks";
import type { AppSheetModel } from "../appsheet/appSheetShared";
import { useAppEditStage } from "../appsheet/appEditStageContext";
import { useCharacterAutomation } from "../papersheet/characterAutomationContext";
import { CharacterSheetResourceControl } from "./CharacterSheetResourceControl";
import { characterSheetNumber, madnessPatch } from "./characterSheetValues";

export function CharacterSheetSanity({ model }: { model: AppSheetModel }) {
  const stage = useAppEditStage();
  const { result } = useCharacterAutomation();
  const sanityMax = characterSheetNumber(result.fields.sanityMax);
  const madness = stage.previewCard.madness ?? 0;
  // core-rulebook.txt [page 42]: "Start with 0 Madness and do not track Current
  // Sanity." [page 23]: the Insane condition is gained when Madness equals or
  // exceeds Max Sanity, and ends immediately when it drops below — so Insane is
  // derived here, never hand-ticked.
  const insane = sanityMax > 0 && madness >= sanityMax;
  const quirk = insane ? INSANE_QUIRK_BY_ID[stage.previewCard.insaneQuirkId ?? ""] : undefined;
  return <div className="character-sheet-vital-page character-sheet-sanity-page">
    <div className="character-sheet-vital-summary"><small>Mind pressure{insane ? " · Insane" : ""}</small><strong>{madness}<span> / {sanityMax} Max Sanity</span></strong></div>
    <div className="character-sheet-resource-grid character-sheet-vital-controls">
      <CharacterSheetResourceControl label="Madness" value={madness} min={0} note="Madness works like damage against your Max Sanity." disabled={model.readOnly} onChange={(value) => stage.stageChange({}, madnessPatch(stage.previewCard, value, sanityMax))} />
      <label className="character-sheet-status-toggle"><input type="checkbox" checked={insane} disabled readOnly /><span><b>Insane</b><small>Automatic when Madness reaches your Max Sanity.</small><small>Cracked Perception: while Insane, you have Advantage on Wisdom (Perception) checks and Intelligence (Eldritch Knowledge) checks made to notice unnatural things, hidden entities, dream-architecture, impossible movement, or occult distortions.</small>{quirk && <small>Insane Quirk — {quirk.name}. {quirk.text}</small>}</span></label>
      {insane && <label className="character-sheet-session-picker" data-testid="character-sheet-insane-quirk">
        <span>Insane Quirk</span>
        <select aria-label="Insane Quirk" disabled={model.readOnly} value={stage.previewCard.insaneQuirkId ?? ""} onChange={(event) => stage.stageChange({}, { insaneQuirkId: event.target.value })}>
          <option value="">Not rolled yet (d100)</option>
          {INSANE_QUIRKS.map((entry) => <option key={entry.id} value={entry.id}>{entry.low === entry.high ? entry.low : `${entry.low}–${entry.high}`} · {entry.name}</option>)}
        </select>
        <small>Roll a d100 when you gain the Insane condition and record the result here. It clears itself when Madness drops below your Max Sanity.</small>
      </label>}
    </div>
  </div>;
}
