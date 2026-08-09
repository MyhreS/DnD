import type { HunterClass, LevelFeature } from "@/types";
import { AppDisclosure, AppPanel, AutoReason } from "./appSheetShared";

type Ability = LevelFeature & { source?: string };

function abilitiesThroughLevel(klass: HunterClass, subclassId: string | null | undefined, level: number): Ability[] {
  const subclass = klass.subclasses.find((entry) => entry.id === subclassId);
  const subclassAbilities = subclass
    ? subclass.features.map((feature) => ({ ...feature, source: subclass.name }))
    : [];
  return [
    ...(klass.features ?? []),
    ...subclassAbilities,
  ]
    .filter((feature) => feature.level <= level)
    .sort((a, b) => a.level - b.level || a.name.localeCompare(b.name));
}

export function AppClassAbilities({ klass, subclassId, level }: {
  klass: HunterClass;
  subclassId?: string | null;
  level: number;
}) {
  const subclass = klass.subclasses.find((entry) => entry.id === subclassId);
  const abilities = abilitiesThroughLevel(klass, subclassId, level);

  return (
    <AppDisclosure
      title="Class abilities"
      summary={`${abilities.length} unlocked through level ${level}`}
      className="appsheet-class-abilities"
    >
      <AppPanel title={`${klass.title}${subclass ? ` · ${subclass.name}` : ""}`} aside={<span className="appsheet-status-word">Level {level}</span>}>
        <p className="appsheet-abilities-intro">Open an ability to see how you can use it in play.</p>
        <div className="appsheet-feature-timeline" data-testid="appsheet-class-abilities">
          {abilities.map((ability, index) => (
            <details key={`${ability.level}-${ability.name}-${index}`}>
              <summary>
                <span>Level {ability.level}</span>
                <b>{ability.name}</b>
                {ability.source && <em>{ability.source}</em>}
              </summary>
              <p>{ability.text}</p>
            </details>
          ))}
        </div>
        <AutoReason reason={`${klass.title}${subclass ? ` and ${subclass.name}` : ""} abilities are shown only when their required level has been acquired.`} />
      </AppPanel>
    </AppDisclosure>
  );
}
