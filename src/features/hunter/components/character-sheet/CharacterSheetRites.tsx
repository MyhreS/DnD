import { AppDeepcallerReference } from "../appsheet/AppDeepcallerReference";
import { AppPanel } from "../appsheet/appSheetShared";
import { CharacterSheetWhisperChoices } from "./CharacterSheetWhisperChoices";

export function CharacterSheetRites() {
  return <div className="character-sheet-resource-layout">
    <AppDeepcallerReference swap={<AppPanel title="Swap Whispers">
      <CharacterSheetWhisperChoices intro="Untick a prepared Whisper, then pick its replacement." />
    </AppPanel>} />
  </div>;
}
