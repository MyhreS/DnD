import type { HunterClass, LevelFeature } from "@/types";

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
  const abilities = abilitiesThroughLevel(klass, subclassId, level);

  return (
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
  );
}
