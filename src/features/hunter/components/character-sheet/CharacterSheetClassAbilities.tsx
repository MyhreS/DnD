import { useCharacterAutomation } from "../papersheet/characterAutomationContext";
import { AppClassAbilities } from "../appsheet/AppClassAbilities";
import { PendingNotice } from "../appsheet/appSheetShared";

export function CharacterSheetClassAbilities() {
  const { card, klass } = useCharacterAutomation();

  if (!klass) return <PendingNotice><b>Choose a class in Hunter</b><p>Your class abilities will appear here automatically.</p></PendingNotice>;

  return <AppClassAbilities klass={klass} subclassId={card.subclassId} level={card.level} />;
}
