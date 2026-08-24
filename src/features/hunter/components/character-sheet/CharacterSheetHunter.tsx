import { BACKGROUNDS } from "@/data/backgrounds";
import { TOOL_DETAILS, TOOL_PROFICIENCIES } from "@/data/characterOptions";
import { CLASSES } from "@/data/classes";
import { FEATS } from "@/data/feats";
import type { AppSheetModel } from "../appsheet/appSheetShared";
import { AppPanel, AutoReason } from "../appsheet/appSheetShared";
import { sheetText } from "../appsheet/appSheetValues";
import { useCharacterAutomation } from "../papersheet/characterAutomationContext";
export function CharacterSheetHunter({ model }: { model: AppSheetModel }) {
  const automation = useCharacterAutomation();
  const { card, klass, result } = automation;
  const name = sheetText(model.data, "name") || card.name;
  const setupComplete = automation.state.setupComplete === true;
  const feats = [...new Set([card.feat, ...(card.feats ?? [])].filter((feat): feat is string => !!feat))];
  const tools = String(result.fields.tools || "").split(",").map((tool) => tool.trim().replace(/\s+\(unique item\)$/i, "")).filter(Boolean);

  return <div className="character-sheet-hunter-build">
    <label className="character-sheet-hunter-name"><span>Hunter name</span><input value={name} disabled={model.readOnly} placeholder="Unnamed hunter" onChange={(event) => model.setFields({ name: event.target.value }, { name: event.target.value })} /></label>
    <div className="character-sheet-hunter-build-grid">
      <div className="character-sheet-hunter-build-value"><span>Actual player</span><strong>{card.ownerName || "Unknown player"}</strong><small>The player recorded on this hunter.</small></div>
      <div className="character-sheet-hunter-build-value"><span>Size</span><strong>Medium</strong><small>The size printed on the supplied character sheet.</small></div>
      {setupComplete
        ? <><div className="character-sheet-hunter-build-value"><span>Class</span><strong>{klass?.title ?? "Unbound hunter"}</strong><small>Core traits, training, and class features.</small></div><div className="character-sheet-hunter-build-value"><span>Background</span><strong>{(automation.background?.name ?? card.background) || "No background"}</strong><small>Origin, skills, feat, and starting kit.</small></div></>
        : <><label><span>Class</span><select value={card.classId} disabled={model.readOnly} onChange={(event) => automation.chooseClass(event.target.value)}><option value="">Choose class...</option>{CLASSES.map((entry) => <option key={entry.id} value={entry.id}>{entry.title}</option>)}</select><small>Sets core traits, training, and class features.</small></label><label><span>Background</span><select value={card.backgroundId ?? ""} disabled={model.readOnly} onChange={(event) => automation.chooseBackground(event.target.value)}><option value="">Choose background...</option>{BACKGROUNDS.map((entry) => <option key={entry.id} value={entry.id}>{entry.name}</option>)}</select><small>Sets origin, skills, and starting kit.</small></label></>}
      <div className="character-sheet-hunter-build-value"><span>Subclass</span><strong>{klass?.subclasses.find((entry) => entry.id === card.subclassId)?.name ?? (card.level < 3 ? "Available at level 3" : "Choose during upgrade")}</strong><small>Your specialized class path is selected and saved through Upgrade.</small></div>
    </div>
    <div className="appsheet-two-column character-sheet-hunter-feats-tools">
      <AppPanel title="Feats">
        <div className="character-sheet-reference-list">{feats.map((featName) => {
          const feat = FEATS.find((entry) => entry.name === featName);
          return <article key={featName}><h4>{featName}</h4>{feat && <small>{feat.category} feat{feat.prerequisite ? ` · ${feat.prerequisite}` : ""}</small>}<p>{feat?.description ?? "This feat is recorded on the hunter, but its full rules description is not available in the game catalog."}</p></article>;
        })}</div>
        {!feats.length && <p className="appsheet-empty-copy">No feat is currently granted.</p>}
        <AutoReason reason={result.reasons.feats} />
      </AppPanel>
      <AppPanel title="Tools">
        <div className="character-sheet-reference-list">{tools.map((toolName) => {
          const canonicalName = TOOL_PROFICIENCIES.find((entry) => entry.toLowerCase().replaceAll("'", "") === toolName.toLowerCase().replaceAll("'", ""));
          const detail = canonicalName ? TOOL_DETAILS[canonicalName] : null;
          return <article key={toolName}><h4>{canonicalName ?? toolName}</h4>{detail && <small>Uses {detail.ability}</small>}<p>{detail?.description ?? "Add your Proficiency Bonus to an ability check that uses this tool."}</p></article>;
        })}</div>
        {!tools.length && <p className="appsheet-empty-copy">No tool proficiency is currently granted.</p>}
        <AutoReason reason={result.reasons.tools} />
      </AppPanel>
    </div>
  </div>;
}
