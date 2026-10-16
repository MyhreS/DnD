import { ALWAYS_PREPARED_ZEALOT_IDS, DEEPCALLER_RITES, DEEPCALLER_WHISPERS, type DeepcallerReference } from "@/data/characterOptions";
import { ChoiceToggle } from "../appsheet/appSheetShared";
import { useCharacterAutomation } from "../papersheet/characterAutomationContext";

/** The prepared-Whisper picker, shared by the Upgrade step and the Rites & Whispers page. */
export function CharacterSheetWhisperChoices({ intro }: { intro: string }) {
  const automation = useCharacterAutomation();
  const { card } = automation;
  const whispers = card.preparedWhispers ?? [];
  // Zealot Whispers — core-rulebook.txt [pages 76–77]. A level-3+ Zealot may
  // also prepare Level 1 Rites, and always has Eldritch Strike and Armor of
  // The Drowned Star prepared without them counting against the limit.
  const zealot = card.subclassId === "hunter-zealot" && card.level >= 3;
  const options: Array<{ entry: DeepcallerReference; zealotOption: boolean }> = [
    ...DEEPCALLER_WHISPERS.map((entry) => ({ entry, zealotOption: false })),
    ...(zealot ? DEEPCALLER_RITES.filter((rite) => rite.level === 1).map((entry) => ({ entry, zealotOption: true })) : []),
  ];
  return <div className="character-sheet-upgrade-choice-page"><p>{intro} <b>{whispers.length} / {automation.whisperLimit}</b></p>{options.map(({ entry, zealotOption }) => {
    const granted = zealot && ALWAYS_PREPARED_ZEALOT_IDS.includes(entry.id);
    const checked = granted || whispers.includes(entry.id);
    return <ChoiceToggle
      key={entry.id}
      label={entry.name}
      meta={`${granted ? "Always prepared · " : zealotOption ? "Zealot Whisper · " : ""}${entry.performing} · ${entry.range} · ${entry.damage} ${entry.damageType}`}
      checked={checked}
      disabled={automation.readOnly || granted || (!checked && whispers.length >= automation.whisperLimit)}
      onChange={() => automation.toggleWhisper(entry.id)}
    />;
  })}</div>;
}
