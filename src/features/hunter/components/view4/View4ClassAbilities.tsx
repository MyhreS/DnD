import { useCharacterAutomation } from "../papersheet/characterAutomationContext";
import { AppClassAbilities } from "../appsheet/AppClassAbilities";
import { AppDeepcallerReference } from "../appsheet/AppDeepcallerReference";
import { DerivedValue, PendingNotice } from "../appsheet/appSheetShared";

export function View4ClassAbilities() {
  const { card, klass } = useCharacterAutomation();
  const progression = klass?.progression.find((row) => row.level === card.level);

  if (!klass) return <PendingNotice><b>Choose a class in Hunter</b><p>Your class abilities will appear here automatically.</p></PendingNotice>;

  return <div className="v4-class-abilities">
    <div className="v4-class-summary">
      <span><small>Current class</small><strong>{klass.title}</strong><em>Level {card.level}</em></span>
      <div>{Object.entries(progression?.extras ?? {}).map(([label, value]) => <DerivedValue key={label} label={label} value={value} reason={`${klass.title} level ${card.level} progression table`} />)}</div>
    </div>
    <AppClassAbilities klass={klass} subclassId={card.subclassId} level={card.level} defaultOpen />
    <AppDeepcallerReference />
  </div>;
}
