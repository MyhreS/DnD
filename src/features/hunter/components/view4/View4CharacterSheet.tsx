import { levelForInsight } from "@/lib/insight";
import type { AppSheetModel } from "../appsheet/appSheetShared";
import { AppAbilitiesSection } from "../appsheet/AppAbilitiesSection";
import { AppFeaturesSection } from "../appsheet/AppFeaturesSection";
import { AppGearSection } from "../appsheet/AppGearSection";
import { AppOverviewSection } from "../appsheet/AppOverviewSection";
import { sheetText } from "../appsheet/appSheetValues";
import { useAppEditStage } from "../appsheet/appEditStageContext";
import { useCharacterAutomation } from "../papersheet/characterAutomationContext";
import { View4Equipment } from "./View4Equipment";
import { View4Figure } from "./View4Figure";
import { View4Health } from "./View4Health";
import { View4Icon, type View4IconName } from "./View4Icons";
import { View4Overlay } from "./View4Overlay";
import { View4Progress } from "./View4Progress";
import { View4Resources } from "./View4Resources";
import { View4Notes } from "./View4Notes";
import { View4Sanity } from "./View4Sanity";

export type View4Panel = "profile" | "abilities" | "features" | "inventory" | "notes" | "equipment" | "health" | "sanity" | "progress" | "resources";
const PANELS: Record<View4Panel, { title: string; eyebrow: string }> = {
  profile: { title: "Hunter & build", eyebrow: "Identity, class and background" },
  abilities: { title: "Abilities & skills", eyebrow: "Scores, saves and proficiencies" },
  features: { title: "Features & choices", eyebrow: "Class progression, feats and tools" },
  inventory: { title: "Inventory", eyebrow: "Gear, carrying and found items" },
  notes: { title: "Notes", eyebrow: "Clues, promises and transformations" },
  equipment: { title: "Equipment", eyebrow: "Choose what your hunter wears" },
  health: { title: "Health", eyebrow: "Hit points and temporary protection" },
  sanity: { title: "Sanity", eyebrow: "Your hunter's remaining grip" },
  progress: { title: "Insight & level", eyebrow: "Knowledge earned through the hunt" },
  resources: { title: "Resources", eyebrow: "Hit dice, states and supplies" },
};
const LEFT: Array<{ panel: View4Panel; icon: View4IconName; label: string }> = [
  { panel: "profile", icon: "profile", label: "Hunter" },
  { panel: "abilities", icon: "abilities", label: "Skills" },
  { panel: "features", icon: "features", label: "Features" },
];
const RIGHT: Array<{ panel: View4Panel; icon: View4IconName; label: string }> = [
  { panel: "notes", icon: "notes", label: "Notes" },
  { panel: "resources", icon: "resources", label: "Resources" },
];

function numberOf(value: unknown, fallback = 0): number {
  const parsed = Number.parseInt(String(value), 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function Rail({ items, open }: { items: typeof LEFT; open: (panel: View4Panel) => void }) {
  return <nav aria-label="Character sheet sections">{items.map((item) => <button key={item.panel} type="button" aria-haspopup="dialog" onClick={() => open(item.panel)}><View4Icon name={item.icon} /><span>{item.label}</span></button>)}</nav>;
}

export function View4CharacterSheet({ model, notesModel, panel, onPanelChange }: { model: AppSheetModel; notesModel: AppSheetModel; panel: View4Panel | null; onPanelChange: (panel: View4Panel | null) => void }) {
  const stage = useAppEditStage();
  const { card, klass, background, result } = useCharacterAutomation();
  const name = sheetText(model.data, "name") || card.name || "Unnamed hunter";
  const hpMax = numberOf(result.fields.hpMax);
  const hp = stage.previewCard.currentHp ?? hpMax;
  const tempHp = numberOf(sheetText(model.data, "hpTemp"));
  const sanityMax = numberOf(result.fields.sanityMax);
  const sanity = stage.previewCard.sanity ?? sanityMax;
  const insight = stage.previewCard.insight ?? numberOf(sheetText(model.data, "insight"));
  const displayedLevel = Math.max(stage.previewCard.level, levelForInsight(insight));
  const pending = Object.values(result.pending).filter(Boolean).length;
  const overlay = panel ? PANELS[panel] : null;
  return <div
    className="v4-sheet"
    data-testid="view4-character-sheet"
    onKeyDownCapture={(event) => {
      if (event.key !== "Escape" || !panel) return;
      event.preventDefault();
      event.stopPropagation();
      onPanelChange(null);
    }}
  >
    <header className="v4-identity">
      <button type="button" onClick={() => onPanelChange("profile")}><small>{klass?.title ?? "Unbound hunter"}</small><h1>{name}</h1><span>{background?.name ?? "No background"}</span></button>
      <div><button type="button" onClick={() => onPanelChange("progress")}><small>Level</small><strong>{displayedLevel}</strong></button><button type="button" onClick={() => onPanelChange("progress")}><small>Insight</small><strong>{insight}</strong></button></div>
    </header>
    {pending > 0 && <button className="v4-pending" type="button" onClick={() => onPanelChange("profile")}><span>!</span>{pending} choice{pending === 1 ? "" : "s"} waiting</button>}
    <div className="v4-stage">
      <div className="v4-rail v4-rail-left"><Rail items={LEFT} open={onPanelChange} /></div>
      <button className="v4-character" type="button" aria-label="Open equipment slots" onClick={() => onPanelChange("equipment")}><span>Tap to equip</span><View4Figure classId={card.classId} /><small><View4Icon name="armor" /> Equipment</small></button>
      <div className="v4-rail v4-rail-right"><Rail items={RIGHT} open={onPanelChange} /></div>
    </div>
    <section className="v4-readouts" aria-label="At a glance">
      <button type="button" onClick={() => onPanelChange("equipment")}><small>AC</small><strong>{String(result.fields.ac ?? "—")}</strong></button>
      <button type="button" onClick={() => onPanelChange("abilities")}><small>Speed</small><strong>{String(result.fields.speed ?? "—")}</strong></button>
      <button type="button" onClick={() => onPanelChange("abilities")}><small>Passive</small><strong>{String(result.fields.passivePerception ?? "—")}</strong></button>
      <button type="button" onClick={() => onPanelChange("abilities")}><small>Initiative</small><strong>{String(result.fields.initiative ?? "—")}</strong></button>
    </section>
    <section className="v4-vitals" aria-label="Current resources">
      <button type="button" onClick={() => onPanelChange("health")}><span><b>Hit points</b><em>{hp} / {hpMax}{tempHp > 0 && <small> +{tempHp} temp</small>}</em></span><i><span style={{ width: `${hpMax ? Math.max(0, Math.min(100, hp / hpMax * 100)) : 0}%` }} /></i></button>
      <button type="button" onClick={() => onPanelChange("sanity")}><span><b>Sanity</b><em>{sanity} / {sanityMax}</em></span><i><span style={{ width: `${sanityMax ? Math.max(0, Math.min(100, sanity / sanityMax * 100)) : 0}%` }} /></i></button>
    </section>
    <button className="v4-inventory-shortcut" type="button" onClick={() => onPanelChange("inventory")}><View4Icon name="inventory" /><span>Inventory</span><small>{card.inventory?.reduce((sum, item) => sum + item.qty, 0) ?? 0} carried</small></button>
    {panel && overlay && <View4Overlay title={overlay.title} eyebrow={overlay.eyebrow} panel={panel} onClose={() => onPanelChange(null)}>
      {panel === "profile" && <AppOverviewSection model={model} onNavigate={(href) => {
        if (href === "#appsheet-abilities") onPanelChange("abilities");
        if (href === "#appsheet-features") onPanelChange("features");
      }} />}
      {panel === "abilities" && <AppAbilitiesSection model={model} />}
      {panel === "features" && <AppFeaturesSection model={model} />}
      {panel === "inventory" && <AppGearSection model={model} />}
      {panel === "notes" && <View4Notes model={notesModel} />}
      {panel === "equipment" && <View4Equipment model={model} />}
      {panel === "health" && <View4Health model={model} />}
      {panel === "sanity" && <View4Sanity model={model} />}
      {panel === "progress" && <View4Progress model={model} />}
      {panel === "resources" && <View4Resources model={model} />}
    </View4Overlay>}
  </div>;
}
