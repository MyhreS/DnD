import {
  ALWAYS_PREPARED_ZEALOT_IDS,
  DEEPCALLER_RITES,
  DEEPCALLER_WHISPERS,
  forbiddenRevelationLevel,
  forbiddenRevelationOptions,
  riteDamageAtStrain,
  type DeepcallerReference,
  whisperDamageAtLevel,
} from "@/data/characterOptions";
import { Link } from "react-router-dom";
import { useCharacterAutomation } from "../papersheet/characterAutomationContext";
import { AppDisclosure, AppPanel } from "./appSheetShared";

function numberOf(value: unknown): number {
  const parsed = Number.parseInt(String(value), 10);
  return Number.isFinite(parsed) ? parsed : 0;
}

function ReferenceRow({
  entry,
  characterLevel,
  strainLevel,
  effectiveRiteLevel,
}: {
  entry: DeepcallerReference;
  characterLevel: number;
  strainLevel: number;
  effectiveRiteLevel?: number;
}) {
  const damage = entry.kind === "Whisper"
    ? whisperDamageAtLevel(entry, characterLevel)
    : riteDamageAtStrain(entry, strainLevel);
  const group = entry.kind === "Whisper" ? "Whispers" : "Rites";
  return <details className="appsheet-rite-reference">
    <summary>
      <span><b>{entry.name}</b><small>{entry.kind === "Whisper" ? "Whisper" : `Level ${effectiveRiteLevel ?? entry.level} Rite${effectiveRiteLevel != null && effectiveRiteLevel !== entry.level ? ` (base Level ${entry.level})` : ""}`} / {entry.school}</small></span>
      <span>{damage === "—" ? "No damage" : `${damage} ${entry.damageType}`}</span>
    </summary>
    <div>
      <dl>
        {/* The source labels this field `Type` (e.g. "Evocation Rite"); the
            stored value has the " Rite" suffix trimmed for the summary line. */}
        <div><dt>Type</dt><dd>{entry.school} Rite</dd></div>
        <div><dt>Perform</dt><dd>{entry.performing}</dd></div>
        <div><dt>Range</dt><dd>{entry.range}</dd></div>
        <div><dt>Duration</dt><dd>{entry.duration}</dd></div>
        <div><dt>Damage</dt><dd>{damage}</dd></div>
        <div><dt>Damage type</dt><dd>{entry.damageType}</dd></div>
        {entry.section && <div><dt>Section</dt><dd>{entry.section}</dd></div>}
        {entry.special && (entry.special.startsWith("Special Requirements: ")
          ? <div><dt>Special requirements</dt><dd>{entry.special.slice("Special Requirements: ".length)}</dd></div>
          : <div><dt>Special</dt><dd>{entry.special}</dd></div>)}
        {entry.upgrade && <div><dt>At higher level Strain</dt><dd>{entry.upgrade}</dd></div>}
        {entry.sourceNote && <div><dt>Source note</dt><dd>{entry.sourceNote}</dd></div>}
      </dl>
      <Link to={`/codex?group=${group}&q=${encodeURIComponent(entry.name)}`}>Read the full rule in Codex</Link>
    </div>
  </details>;
}

export function AppDeepcallerReference() {
  const { card, klass, result, state } = useCharacterAutomation();
  if (klass?.id !== "deepcaller") return null;
  const strainLevel = String(result.fields.strainLevel ?? "—");
  const currentStrainLevel = numberOf(strainLevel);
  // A Zealot's prepared list may hold Level 1 Rites as well as Whispers, and
  // always includes the two Carved entries (core-rulebook.txt [pages 76–77]).
  const zealot = card.subclassId === "hunter-zealot" && card.level >= 3;
  const preparedIds = [
    ...(zealot ? ALWAYS_PREPARED_ZEALOT_IDS : []),
    ...(card.preparedWhispers ?? []).filter((id) => !zealot || !ALWAYS_PREPARED_ZEALOT_IDS.includes(id)),
  ];
  const prepared = preparedIds
    .map((id) => DEEPCALLER_WHISPERS.find((entry) => entry.id === id) ?? DEEPCALLER_RITES.find((entry) => entry.id === id))
    .filter((entry): entry is DeepcallerReference => entry != null);
  const rites = DEEPCALLER_RITES.filter((rite) => rite.level != null && rite.level <= currentStrainLevel);
  const revelations = Object.entries(state.levelChoices ?? {}).flatMap(([key, value]) => {
    const level = forbiddenRevelationLevel(key);
    if (level == null) return [];
    const entry = forbiddenRevelationOptions(level).find((rite) => rite.name === value);
    return entry ? [{ entry, level }] : [];
  });
  return <AppDisclosure title="Rites & Whispers" summary={`Strain level ${strainLevel} / ${rites.length} Rites${revelations.length ? ` / ${revelations.length} Revelations` : ""}`} className="appsheet-rites-disclosure">
    <p className="appsheet-rites-intro">Whisper damage follows hunter level. Rite damage and printed higher-Strain upgrades use this hunter's current Strain level.</p>
    <AppPanel title="Prepared Whispers" aside={<span className="appsheet-status-word">{prepared.length} prepared</span>}>
      {prepared.length
        ? <div className="appsheet-rite-reference-list">{prepared.map((entry) => <ReferenceRow key={entry.id} entry={entry} characterLevel={card.level} strainLevel={currentStrainLevel} />)}</div>
        : <p className="appsheet-empty-copy">Choose prepared Whispers during Upgrade.</p>}
    </AppPanel>
    <AppPanel title={`Rites available with level ${strainLevel} Strains`}>
      <div className="appsheet-rite-reference-list">{rites.map((entry) => <ReferenceRow key={entry.id} entry={entry} characterLevel={card.level} strainLevel={currentStrainLevel} />)}</div>
    </AppPanel>
    {revelations.length > 0 && <AppPanel title="Forbidden Revelations" aside={<span className="appsheet-status-word">Once each / Long Rest</span>}>
      <div className="appsheet-rite-reference-list">{revelations.map(({ entry, level }) => <ReferenceRow key={`${level}:${entry.id}`} entry={entry} characterLevel={card.level} strainLevel={level} effectiveRiteLevel={level} />)}</div>
    </AppPanel>}
  </AppDisclosure>;
}
