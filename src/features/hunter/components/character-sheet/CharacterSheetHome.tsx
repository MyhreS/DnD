import { useState, type RefObject } from "react";
import { resolveUnassignedInventory } from "@/features/hunter/lib/inventoryPlacement";
import { levelForInsight } from "@/lib/insight";
import { AppAutoReasonsHidden, type AppSheetModel } from "../appsheet/appSheetShared";
import { AppAbilitiesSection } from "../appsheet/AppAbilitiesSection";
import { AppGearSection } from "../appsheet/AppGearSection";
import { sheetText } from "../appsheet/appSheetValues";
import { hasStagedUpgrade, useAppEditStage } from "../appsheet/appEditStageContext";
import { useCharacterSheetPageSafeArea } from "../../hooks/useCharacterSheetPageSafeArea";
import { useCharacterAutomation } from "../papersheet/characterAutomationContext";
import { CharacterSheetActionNeeded } from "./CharacterSheetActionNeeded";
import { useTimedBanner } from "../../hooks/useTimedBanner";
import { CharacterSheetUpgradeCelebration, type UpgradeSummary } from "./CharacterSheetUpgradeCelebration";
import { CharacterSheetBackButton } from "./CharacterSheetBackButton";
import { CharacterSheetClassAbilities } from "./CharacterSheetClassAbilities";
import { CharacterSheetDerivedStat } from "./CharacterSheetDerivedStat";
import { CharacterSheetEquipment } from "./CharacterSheetEquipment";
import { CharacterSheetFigure } from "./CharacterSheetFigure";
import { CharacterSheetHealth } from "./CharacterSheetHealth";
import { CharacterSheetHunter } from "./CharacterSheetHunter";
import { CharacterSheetIcon, type CharacterSheetIconName } from "./CharacterSheetIcons";
import { CharacterSheetPageStack } from "./CharacterSheetPageStack";
import { CharacterSheetProgress } from "./CharacterSheetProgress";
import { CharacterSheetResources } from "./CharacterSheetResources";
import { CharacterSheetRites } from "./CharacterSheetRites";
import { CharacterSheetNotes } from "./CharacterSheetNotes";
import { CharacterSheetSanity } from "./CharacterSheetSanity";
import { CharacterSheetUpgrade } from "./CharacterSheetUpgrade";

export type CharacterSheetPanel = "profile" | "abilities" | "skills" | "classAbilities" | "ac" | "speed" | "passive" | "initiative" | "inventory" | "notes" | "equipment" | "health" | "sanity" | "progress" | "resources" | "rites" | "upgrade";
const PANELS: Record<CharacterSheetPanel, { title: string }> = {
  profile: { title: "Hunter & build" },
  abilities: { title: "Abilities" },
  skills: { title: "Skills" },
  classAbilities: { title: "Class abilities" },
  ac: { title: "Armor Class" },
  speed: { title: "Speed" },
  passive: { title: "Passive Perception" },
  initiative: { title: "Initiative" },
  inventory: { title: "Inventory" },
  notes: { title: "Notes" },
  equipment: { title: "Equipment" },
  health: { title: "Health" },
  sanity: { title: "Madness" },
  progress: { title: "Insight & level" },
  resources: { title: "Resources" },
  rites: { title: "Rites & Whispers" },
  upgrade: { title: "Upgrade character" },
};
const LEFT: Array<{ panel: CharacterSheetPanel; icon: CharacterSheetIconName; label: string }> = [
  { panel: "profile", icon: "profile", label: "Hunter" },
  { panel: "abilities", icon: "abilities", label: "Abilities" },
  { panel: "skills", icon: "skills", label: "Skills" },
  { panel: "classAbilities", icon: "features", label: "Class abilities" },
];
const RIGHT: Array<{ panel: CharacterSheetPanel; icon: CharacterSheetIconName; label: string }> = [
  { panel: "notes", icon: "notes", label: "Notes" },
  { panel: "resources", icon: "resources", label: "Resources" },
];
const RITES = { panel: "rites", icon: "rites", label: "Rites & Whispers" } satisfies (typeof RIGHT)[number];

function numberOf(value: unknown, fallback = 0): number {
  const parsed = Number.parseInt(String(value), 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function Rail({ items, open }: { items: typeof LEFT; open: (panel: CharacterSheetPanel) => void }) {
  return <nav aria-label="Character sheet sections">{items.map((item) => <button key={item.panel} type="button" aria-haspopup="dialog" onClick={() => open(item.panel)}><CharacterSheetIcon name={item.icon} /><span>{item.label}</span></button>)}</nav>;
}

export function CharacterSheetHome({ model, notesModel, panel, onPanelChange, onBack, backRef, saveMsg }: { model: AppSheetModel; notesModel: AppSheetModel; panel: CharacterSheetPanel | null; onPanelChange: (panel: CharacterSheetPanel | null) => void; onBack: () => void; backRef: RefObject<HTMLButtonElement | null>; saveMsg: string }) {
  const stage = useAppEditStage();
  const { card, klass, background, result, whisperLimit } = useCharacterAutomation();
  const rightRail = klass?.id === "deepcaller" || whisperLimit > 0 ? [...RIGHT, RITES] : RIGHT;
  const name = sheetText(model.data, "name") || card.name || "Unnamed hunter";
  const hpMax = numberOf(result.fields.hpMax);
  const hp = stage.previewCard.currentHp ?? hpMax;
  const tempHp = numberOf(sheetText(model.data, "hpTemp"));
  const sanityMax = numberOf(result.fields.sanityMax);
  // core-rulebook.txt [page 42]: Madness is the tracked pool; Current Sanity
  // is not tracked. The bar therefore fills with Madness against Max Sanity.
  const madness = stage.previewCard.madness ?? 0;
  const insight = stage.previewCard.insight ?? numberOf(sheetText(model.data, "insight"));
  const displayedLevel = stage.savedCard.level;
  const earned = Math.max(stage.savedCard.level, levelForInsight(insight));
  const upgradePending = earned > stage.savedCard.level || hasStagedUpgrade(stage.patch) || Object.values(result.pending).some(Boolean);
  const inventoryCount = resolveUnassignedInventory(card)
    .filter(({ item }) => item.category !== "Armor")
    .reduce((total, { qty }) => total + qty, 0);
  const [completedUpgrade, setCompletedUpgrade] = useState(0);
  const [celebration, setCelebration] = useState<UpgradeSummary | null>(null);
  const missingChoices = Object.values(result.pending).filter((entry) => entry != null).map((entry) => entry.label);
  // Levelling up can wait for the table, so the front-page banner steps aside
  // after a minute (or when closed); Level / Insight keep their pending glow
  // and Insight & Level keeps the upgrade button.
  const [actionBannerVisible, dismissActionBanner] = useTimedBanner(60_000);
  const showAction = !model.readOnly && upgradePending && !hasStagedUpgrade(stage.patch) && panel === null && actionBannerVisible;
  const pageDefinition = panel ? PANELS[panel] : null;
  useCharacterSheetPageSafeArea(panel !== null);
  return <div className={`character-sheet-sheet${showAction ? " has-action" : ""}`} data-testid="character-sheet">
    <header className="character-sheet-identity">
      <div className="character-sheet-header-tools"><CharacterSheetBackButton backRef={backRef} onClick={onBack} ariaLabel="Back to hunters" />{saveMsg && <small className="character-sheet-save" role="status">{saveMsg}</small>}</div>
      <button className="character-sheet-identity-profile" type="button" onClick={() => onPanelChange("profile")}><small>{klass?.title ?? "Unbound hunter"}</small><h1>{name}</h1><span>{background?.name ?? "No background"}</span></button>
      <div className="character-sheet-identity-progress"><button className={upgradePending ? "character-sheet-upgrade-pending" : ""} type="button" onClick={() => onPanelChange("progress")}><small>Level</small><strong>{displayedLevel}</strong></button><button className={upgradePending ? "character-sheet-upgrade-pending" : ""} type="button" onClick={() => onPanelChange("progress")}><small>Insight</small><strong>{insight}</strong></button></div>
    </header>
    {completedUpgrade > 0 && <span key={completedUpgrade} className="character-sheet-upgrade-complete" role="status">Upgrade complete</span>}
    {celebration && <CharacterSheetUpgradeCelebration summary={celebration} onClose={() => setCelebration(null)} />}
    {showAction && <CharacterSheetActionNeeded
      newLevel={earned > stage.savedCard.level ? earned : null}
      missing={missingChoices}
      onAct={() => { stage.stageLevel(earned); onPanelChange("upgrade"); }}
      onDismiss={dismissActionBanner}
    />}
    <div className="character-sheet-stage">
      <div className="character-sheet-rail character-sheet-rail-left"><Rail items={LEFT} open={onPanelChange} /></div>
      <button className="character-sheet-character" type="button" aria-label="Open equipment slots" onClick={() => onPanelChange("equipment")}><span>Tap to equip</span><CharacterSheetFigure classId={card.classId} /><small><CharacterSheetIcon name="armor" /> Equipment</small></button>
      <div className="character-sheet-rail character-sheet-rail-right"><Rail items={rightRail} open={onPanelChange} /></div>
    </div>
    <section className="character-sheet-readouts" aria-label="At a glance">
      <button type="button" onClick={() => onPanelChange("ac")}><small>AC</small><strong>{String(result.fields.ac ?? "—")}</strong></button>
      <button type="button" onClick={() => onPanelChange("speed")}><small>Speed</small><strong>{String(result.fields.speed ?? "—")}</strong></button>
      <button type="button" onClick={() => onPanelChange("passive")}><small>Passive</small><strong>{String(result.fields.passivePerception ?? "—")}</strong></button>
      <button type="button" onClick={() => onPanelChange("initiative")}><small>Initiative</small><strong>{String(result.fields.initiative ?? "—")}</strong></button>
      <button type="button" aria-label={`Proficiency Bonus ${String(result.fields.profBonus ?? "—")}`} onClick={() => onPanelChange("progress")}><small>Prof. bonus</small><strong>{String(result.fields.profBonus ?? "—")}</strong></button>
    </section>
    <section className="character-sheet-vitals" aria-label="Current resources">
      <button type="button" onClick={() => onPanelChange("health")}><span><b>Hit points</b><em>{hp} / {hpMax}{tempHp > 0 && <small> +{tempHp} temp</small>}</em></span><i><span style={{ width: `${hpMax ? Math.max(0, Math.min(100, hp / hpMax * 100)) : 0}%` }} /></i></button>
      <button type="button" onClick={() => onPanelChange("sanity")}><span><b>Madness</b><em>{madness} / {sanityMax}<small> · Max Sanity{sanityMax > 0 && madness >= sanityMax ? " · Insane" : ""}</small></em></span><i><span style={{ width: `${sanityMax ? Math.max(0, Math.min(100, madness / sanityMax * 100)) : 0}%` }} /></i></button>
      <button className="character-sheet-inventory-shortcut" type="button" onClick={() => onPanelChange("inventory")}><CharacterSheetIcon name="inventory" /><span>Inventory</span><small>{inventoryCount} carried</small></button>
    </section>
    {panel && pageDefinition && <CharacterSheetPageStack
      key={panel}
      panel={panel}
      onExit={() => onPanelChange(panel === "upgrade" ? "progress" : null)}
      root={{
        id: panel,
        title: pageDefinition.title,
        content: <AppAutoReasonsHidden>
          {panel === "profile" && <CharacterSheetHunter model={model} />}
          {panel === "abilities" && <AppAbilitiesSection model={model} view="abilities" />}
          {panel === "skills" && <AppAbilitiesSection model={model} view="skills" />}
          {panel === "classAbilities" && <CharacterSheetClassAbilities />}
          {panel === "ac" && <CharacterSheetDerivedStat model={model} kind="ac" />}
          {panel === "speed" && <CharacterSheetDerivedStat model={model} kind="speed" />}
          {panel === "passive" && <CharacterSheetDerivedStat model={model} kind="passive" />}
          {panel === "initiative" && <CharacterSheetDerivedStat model={model} kind="initiative" />}
          {panel === "inventory" && <AppGearSection model={model} hideGoldSummary includeDamageBonuses manageEquipmentSeparately />}
          {panel === "notes" && <CharacterSheetNotes model={notesModel} saveMsg={saveMsg} />}
          {panel === "equipment" && <CharacterSheetEquipment model={model} />}
          {panel === "health" && <CharacterSheetHealth model={model} />}
          {panel === "sanity" && <CharacterSheetSanity model={model} />}
          {panel === "progress" && <CharacterSheetProgress model={model} upgradePending={upgradePending} onUpgrade={() => onPanelChange("upgrade")} />}
          {panel === "resources" && <CharacterSheetResources model={model} />}
          {panel === "rites" && <CharacterSheetRites />}
          {panel === "upgrade" && <CharacterSheetUpgrade model={model} onComplete={(summary) => { setCompletedUpgrade((value) => value + 1); setCelebration(summary); onPanelChange(null); }} />}
        </AppAutoReasonsHidden>,
      }}
    />}
  </div>;
}
