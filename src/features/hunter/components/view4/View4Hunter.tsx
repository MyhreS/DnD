import { BACKGROUNDS } from "@/data/backgrounds";
import { CLASSES } from "@/data/classes";
import type { AppSheetModel } from "../appsheet/appSheetShared";
import { sheetText } from "../appsheet/appSheetValues";
import { useCharacterAutomation } from "../papersheet/characterAutomationContext";
import type { View4Panel } from "./View4CharacterSheet";

const PENDING_DRAWER: Partial<Record<string, View4Panel>> = {
  background: "profile",
  subclass: "profile",
  backgroundPoints: "abilities",
  classSkills: "abilities",
  featSkills: "abilities",
  levelChoices: "features",
  whispers: "features",
};

export function View4Hunter({ model, onOpen }: { model: AppSheetModel; onOpen: (panel: View4Panel) => void }) {
  const automation = useCharacterAutomation();
  const { card, klass, result } = automation;
  const pending = Object.entries(result.pending).filter((entry) => entry[1] && PENDING_DRAWER[entry[0]]);
  const name = sheetText(model.data, "name") || card.name;

  return <div className="v4-hunter-build">
    <label className="v4-hunter-name"><span>Hunter name</span><input value={name} disabled={model.readOnly} placeholder="Unnamed hunter" onChange={(event) => model.setFields({ name: event.target.value }, { name: event.target.value })} /></label>
    <div className="v4-hunter-build-grid">
      <label><span>Class</span><select value={card.classId} disabled={model.readOnly} onChange={(event) => automation.chooseClass(event.target.value)}><option value="">Choose class...</option>{CLASSES.map((entry) => <option key={entry.id} value={entry.id}>{entry.title}</option>)}</select><small>Sets core traits, training, and class features.</small></label>
      <label><span>Background</span><select value={card.backgroundId ?? ""} disabled={model.readOnly} onChange={(event) => automation.chooseBackground(event.target.value)}><option value="">Choose background...</option>{BACKGROUNDS.map((entry) => <option key={entry.id} value={entry.id}>{entry.name}</option>)}</select><small>Sets creation bonuses, skills, and starting kit.</small></label>
      <label><span>Subclass</span><select value={card.subclassId ?? ""} disabled={model.readOnly || !klass || card.level < 3} onChange={(event) => automation.chooseSubclass(event.target.value)}><option value="">{card.level < 3 ? "Available at level 3" : klass?.subclassOptional ? `Continue as ${klass.name}` : "Choose subclass..."}</option>{klass?.subclasses.map((entry) => <option key={entry.id} value={entry.id}>{entry.name}</option>)}</select><small>Your specialized class path.</small></label>
    </div>
    {pending.length > 0 && <section className="v4-hunter-decisions"><header><small>Choices waiting</small><h3>Finish your hunter</h3></header>{pending.map(([key, choice]) => choice && <button key={key} type="button" onClick={() => onOpen(PENDING_DRAWER[key]!)}><span><b>Choose {choice.remaining} {choice.label}{choice.remaining === 1 ? "" : "s"}</b><small>{choice.reason}</small></span><em>Open {PENDING_DRAWER[key] === "abilities" ? "Skills" : PENDING_DRAWER[key] === "features" ? "Features" : "Build"} -&gt;</em></button>)}</section>}
  </div>;
}
