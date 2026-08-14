import { BACKGROUNDS } from "@/data/backgrounds";
import { CLASSES } from "@/data/classes";
import type { AppSheetModel } from "../appsheet/appSheetShared";
import { AppDisclosure, AppPanel, AutoReason } from "../appsheet/appSheetShared";
import { sheetText } from "../appsheet/appSheetValues";
import { useCharacterAutomation } from "../papersheet/characterAutomationContext";
export function View4Hunter({ model }: { model: AppSheetModel }) {
  const automation = useCharacterAutomation();
  const { card, klass, result } = automation;
  const name = sheetText(model.data, "name") || card.name;
  const feats = [...new Set([card.feat, ...(card.feats ?? [])].filter((feat): feat is string => !!feat))];

  return <div className="v4-hunter-build">
    <label className="v4-hunter-name"><span>Hunter name</span><input value={name} disabled={model.readOnly} placeholder="Unnamed hunter" onChange={(event) => model.setFields({ name: event.target.value }, { name: event.target.value })} /></label>
    <div className="v4-hunter-build-grid">
      <label><span>Class</span><select value={card.classId} disabled={model.readOnly} onChange={(event) => automation.chooseClass(event.target.value)}><option value="">Choose class...</option>{CLASSES.map((entry) => <option key={entry.id} value={entry.id}>{entry.title}</option>)}</select><small>Sets core traits, training, and class features.</small></label>
      <label><span>Background</span><select value={card.backgroundId ?? ""} disabled={model.readOnly} onChange={(event) => automation.chooseBackground(event.target.value)}><option value="">Choose background...</option>{BACKGROUNDS.map((entry) => <option key={entry.id} value={entry.id}>{entry.name}</option>)}</select><small>Sets creation bonuses, skills, and starting kit.</small></label>
      <div className="v4-hunter-build-value"><span>Subclass</span><strong>{klass?.subclasses.find((entry) => entry.id === card.subclassId)?.name ?? (card.level < 3 ? "Available at level 3" : "Choose during upgrade")}</strong><small>Your specialized class path is selected and saved through Upgrade.</small></div>
    </div>
    <AppDisclosure title="Feats & tools" summary={`${feats.join(", ") || "No feat"} · ${String(result.fields.tools || "No tools")}`} defaultOpen>
      <div className="appsheet-two-column appsheet-disclosure-grid">
        <AppPanel title="Feats">
          <div className="appsheet-token-list">{feats.map((feat) => <span key={feat}>{feat}</span>)}</div>
          {!feats.length && <p className="appsheet-empty-copy">No feat is currently granted.</p>}
          <AutoReason reason={result.reasons.feats} />
        </AppPanel>
        <AppPanel title="Tools">
          <p className="appsheet-large-readout">{String(result.fields.tools || "No tool proficiency")}</p>
          <AutoReason reason={result.reasons.tools} />
        </AppPanel>
      </div>
    </AppDisclosure>
  </div>;
}
