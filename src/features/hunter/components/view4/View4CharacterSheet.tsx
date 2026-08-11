import { useState } from "react";
import type { AppSheetModel } from "../appsheet/appSheetShared";
import { AppAbilitiesSection } from "../appsheet/AppAbilitiesSection";
import { AppCombatSection } from "../appsheet/AppCombatSection";
import { AppFeaturesSection } from "../appsheet/AppFeaturesSection";
import { AppGearSection } from "../appsheet/AppGearSection";
import { AppNotesSection } from "../appsheet/AppNotesSection";
import { AppOverviewSection } from "../appsheet/AppOverviewSection";
import { sheetText } from "../appsheet/appSheetValues";
import { useAppEditStage } from "../appsheet/appEditStageContext";
import { useCharacterAutomation } from "../papersheet/characterAutomationContext";
import { View4Equipment } from "./View4Equipment";
import { View4Figure } from "./View4Figure";
import { View4Icon, type View4IconName } from "./View4Icons";
import { View4Overlay } from "./View4Overlay";
import { View4Resources } from "./View4Resources";

type Panel = "profile" | "abilities" | "features" | "combat" | "inventory" | "notes" | "equipment" | "resources";
const PANELS: Record<Panel, { title: string; eyebrow: string }> = {
  profile: { title: "Hunter & build", eyebrow: "Identity, class and background" },
  abilities: { title: "Abilities & skills", eyebrow: "Scores, saves and proficiencies" },
  features: { title: "Features & choices", eyebrow: "Class progression, feats and tools" },
  combat: { title: "Combat & armor", eyebrow: "Defence, weapons and armor rules" },
  inventory: { title: "Inventory", eyebrow: "Gear, carrying and found items" },
  notes: { title: "Notes", eyebrow: "Clues, promises and transformations" },
  equipment: { title: "Equipment", eyebrow: "Choose what your hunter wears" },
  resources: { title: "Resources", eyebrow: "Tap minus or plus, then apply" },
};
const LEFT: Array<{ panel: Panel; icon: View4IconName; label: string }> = [
  { panel: "profile", icon: "profile", label: "Hunter" },
  { panel: "abilities", icon: "abilities", label: "Skills" },
  { panel: "features", icon: "features", label: "Features" },
];
const RIGHT: Array<{ panel: Panel; icon: View4IconName; label: string }> = [
  { panel: "combat", icon: "combat", label: "Combat" },
  { panel: "notes", icon: "notes", label: "Notes" },
  { panel: "resources", icon: "resources", label: "More" },
];

function numberOf(value: unknown, fallback = 0): number {
  const parsed = Number.parseInt(String(value), 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function Rail({ items, open }: { items: typeof LEFT; open: (panel: Panel) => void }) {
  return <nav>{items.map((item) => <button key={item.panel} type="button" onClick={() => open(item.panel)}><View4Icon name={item.icon} /><span>{item.label}</span></button>)}</nav>;
}

export function View4CharacterSheet({ model }: { model: AppSheetModel }) {
  const [panel, setPanel] = useState<Panel | null>(null);
  const stage = useAppEditStage();
  const { card, klass, background, result } = useCharacterAutomation();
  const name = sheetText(model.data, "name") || card.name || "Unnamed hunter";
  const hpMax = numberOf(result.fields.hpMax);
  const hp = stage.previewCard.currentHp ?? hpMax;
  const sanityMax = numberOf(result.fields.sanityMax);
  const sanity = stage.previewCard.sanity ?? sanityMax;
  const insight = card.insight ?? numberOf(sheetText(model.data, "insight"));
  const pending = Object.values(result.pending).filter(Boolean).length;
  const overlay = panel ? PANELS[panel] : null;
  return <div className="v4-sheet" data-testid="view4-character-sheet">
    <header className="v4-identity">
      <button type="button" onClick={() => setPanel("profile")}><small>{klass?.title ?? "Unbound hunter"}</small><h1>{name}</h1><span>{background?.name ?? "No background"}</span></button>
      <div><button type="button" onClick={() => setPanel("resources")}><small>Level</small><strong>{card.level}</strong></button><button type="button" onClick={() => setPanel("resources")}><small>Insight</small><strong>{insight}</strong></button></div>
    </header>
    {pending > 0 && <button className="v4-pending" type="button" onClick={() => setPanel("profile")}><span>!</span>{pending} choice{pending === 1 ? "" : "s"} waiting</button>}
    <div className="v4-stage">
      <div className="v4-rail v4-rail-left"><Rail items={LEFT} open={setPanel} /></div>
      <button className="v4-character" type="button" aria-label="Open equipment slots" onClick={() => setPanel("equipment")}><span>Tap to equip</span><View4Figure classId={card.classId} /><small><View4Icon name="armor" /> Equipment</small></button>
      <div className="v4-rail v4-rail-right"><Rail items={RIGHT} open={setPanel} /></div>
    </div>
    <section className="v4-readouts" aria-label="At a glance">
      <button type="button" onClick={() => setPanel("combat")}><small>AC</small><strong>{String(result.fields.ac ?? "—")}</strong></button>
      <button type="button" onClick={() => setPanel("combat")}><small>Speed</small><strong>{String(result.fields.speed ?? "—")}</strong></button>
      <button type="button" onClick={() => setPanel("abilities")}><small>Passive</small><strong>{String(result.fields.passivePerception ?? "—")}</strong></button>
      <button type="button" onClick={() => setPanel("combat")}><small>Initiative</small><strong>{String(result.fields.initiative ?? "—")}</strong></button>
    </section>
    <section className="v4-vitals" aria-label="Current resources">
      <button type="button" onClick={() => setPanel("resources")}><span><b>Hit points</b><em>{hp} / {hpMax}</em></span><i><span style={{ width: `${hpMax ? Math.max(0, Math.min(100, hp / hpMax * 100)) : 0}%` }} /></i></button>
      <button type="button" onClick={() => setPanel("resources")}><span><b>Sanity</b><em>{sanity} / {sanityMax}</em></span><i><span style={{ width: `${sanityMax ? Math.max(0, Math.min(100, sanity / sanityMax * 100)) : 0}%` }} /></i></button>
    </section>
    <button className="v4-inventory-shortcut" type="button" onClick={() => setPanel("inventory")}><View4Icon name="inventory" /><span>Inventory</span><small>{card.inventory?.reduce((sum, item) => sum + item.qty, 0) ?? 0} carried</small></button>
    {panel && overlay && <View4Overlay title={overlay.title} eyebrow={overlay.eyebrow} classId={card.classId} onClose={() => setPanel(null)}>
      {panel === "profile" && <AppOverviewSection model={model} />}
      {panel === "abilities" && <AppAbilitiesSection model={model} />}
      {panel === "features" && <AppFeaturesSection model={model} />}
      {panel === "combat" && <AppCombatSection model={model} />}
      {panel === "inventory" && <AppGearSection model={model} />}
      {panel === "notes" && <AppNotesSection model={model} />}
      {panel === "equipment" && <View4Equipment model={model} />}
      {panel === "resources" && <View4Resources model={model} />}
    </View4Overlay>}
  </div>;
}
