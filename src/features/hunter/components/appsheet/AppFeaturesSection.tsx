import { useCharacterAutomation } from "../papersheet/characterAutomationContext";
import { AppClassAbilities } from "./AppClassAbilities";
import { AppDeepcallerReference } from "./AppDeepcallerReference";
import {
  AppDisclosure,
  AppPanel,
  AppSection,
  AutoReason,
  DerivedValue,
  PendingNotice,
  type AppSheetModel,
} from "./appSheetShared";

export function AppFeaturesSection({ includeClassReferences = false }: { model: AppSheetModel; includeClassReferences?: boolean }) {
  const automation = useCharacterAutomation();
  const { card, klass, result } = automation;
  const currentProgression = klass?.progression.find((row) => row.level === card.level);

  return (
    <AppSection
      id="appsheet-features"
      title="Features"
    >
      {!klass && <PendingNotice><b>Choose a class in Hunter &amp; build</b><p>Class features will appear here automatically.</p></PendingNotice>}

      {klass && (
        <div className="appsheet-feature-hero appsheet-feature-summary">
          <div><span>Current class progression</span><h3>{klass.title} · level {card.level}</h3></div>
          <div>
            {Object.entries(currentProgression?.extras ?? {}).map(([label, value]) => <DerivedValue key={label} label={label} value={value} reason={`${klass.title} level ${card.level} progression table`} />)}
          </div>
        </div>
      )}

      {includeClassReferences && klass && <AppClassAbilities klass={klass} subclassId={card.subclassId} level={card.level} />}

      {includeClassReferences && <AppDeepcallerReference />}

      <AppDisclosure
        title="Feats & tools"
        summary={`${[card.feat, ...(card.feats ?? [])].filter(Boolean).join(", ") || "No feat"} · ${String(result.fields.tools || "No tools")}`}
      >
      <div className="appsheet-two-column appsheet-disclosure-grid">
        <AppPanel title="Feats">
          <div className="appsheet-token-list">{[card.feat, ...(card.feats ?? [])].filter(Boolean).map((feat) => <span key={feat}>{feat}</span>)}</div>
          {!card.feat && !(card.feats?.length) && <p className="appsheet-empty-copy">No feat is currently granted.</p>}
          <AutoReason reason={result.reasons.feats} />
        </AppPanel>
        <AppPanel title="Tools">
          <p className="appsheet-large-readout">{String(result.fields.tools || "No tool proficiency")}</p>
          <AutoReason reason={result.reasons.tools} />
        </AppPanel>
      </div>
      </AppDisclosure>
    </AppSection>
  );
}
