import { abilityModifier } from "@/data/abilities";
import { WEAPON_FACTS, weaponDamageLabel } from "@/data/weapons";
import { resolveInventory } from "@/lib/inventory";
import { useCharacterAutomation } from "../papersheet/characterAutomationContext";
import { useAppEditStage } from "./appEditStageContext";
import { AppPanel, DerivedValue, NumericStepper, type AppSheetModel } from "./appSheetShared";
import { sheetText } from "./appSheetValues";

function numeric(value: string, fallback = 0): number {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function signed(value: number): string {
  return value >= 0 ? `+${value}` : String(value);
}

export function AppQuickView({ model }: { model: AppSheetModel }) {
  const { card, klass, result } = useCharacterAutomation();
  const editStage = useAppEditStage();
  const name = sheetText(model.data, "name") || card.name || "Unnamed hunter";
  const weapons = resolveInventory(card).filter(({ item }) => item.category === "Weapon");
  const hp = editStage.previewCard.currentHp ?? numeric(sheetText(model.data, "hpCur"), numeric(String(result.fields.hpMax)));
  const sanity = editStage.previewCard.sanity ?? numeric(sheetText(model.data, "sanityCur"), numeric(String(result.fields.sanityMax)));

  return (
    <main className="appsheet-quick-view" data-testid="app-character-sheet-2">
      <header className="appsheet-quick-header">
        <div>
          <h1>{name}</h1>
          <p>{klass?.title ?? "Choose a class"} · Level {card.level}</p>
        </div>
        <div className="appsheet-quick-core" aria-label="Core combat values">
          <DerivedValue label="AC" value={result.fields.ac} />
          <DerivedValue label="Speed" value={result.fields.speed} />
          <DerivedValue label="Initiative" value={result.fields.initiative} />
        </div>
      </header>

      <section className="appsheet-quick-vitals" aria-label="Current pools">
        <div>
          <span>Hit points</span>
          <NumericStepper label="HP" value={hp} disabled={model.readOnly} onChange={editStage.stageHp} />
          <small>of {result.fields.hpMax}</small>
        </div>
        <div>
          <span>Sanity</span>
          <NumericStepper label="sanity" value={sanity} disabled={model.readOnly} onChange={editStage.stageSanity} />
          <small>of {result.fields.sanityMax}</small>
        </div>
        {klass?.caster && (
          <div>
            <span>Strains</span>
            <NumericStepper label="Strains left" value={numeric(sheetText(model.data, "strainCur"), numeric(String(result.fields.strainMax)))} max={numeric(String(result.fields.strainMax))} disabled={model.readOnly} onChange={(value) => model.setField("strainCur", String(value))} />
            <small>level {String(result.fields.strainLevel ?? "—")}</small>
          </div>
        )}
      </section>

      <div className="appsheet-quick-grid">
        <AppPanel title="Weapons">
          {weapons.length ? <ul className="appsheet-quick-list">
            {weapons.map(({ item, qty }) => {
              const facts = WEAPON_FACTS[item.id];
              const modifier = facts?.attack === "Ranged" ? abilityModifier(card.abilities.dex) : abilityModifier(card.abilities.str);
              const custom = card.customItems?.find((entry) => entry.id === item.id);
              return <li key={item.id}><span><b>{item.name}{qty > 1 ? ` ×${qty}` : ""}</b><small>{facts?.attack ?? "Weapon"} · {facts?.mastery ?? "DM-set mastery"}</small></span><strong>{custom?.damage || weaponDamageLabel(facts)} <em>{signed(modifier)}</em></strong></li>;
            })}
          </ul> : <p className="appsheet-empty-copy">No carried weapons yet.</p>}
        </AppPanel>
        <AppPanel title="Ready reference">
          <dl className="appsheet-quick-reference">
            <div><dt>Armor</dt><dd>{String(result.fields.armorCategory || "Unarmored")}</dd></div>
            <div><dt>Sanity die</dt><dd>{String(result.fields.sanityDice || "—")}</dd></div>
            <div><dt>Passive perception</dt><dd>{String(result.fields.passivePerception || "—")}</dd></div>
            <div><dt>Tools</dt><dd>{String(result.fields.tools || "—")}</dd></div>
          </dl>
        </AppPanel>
      </div>
    </main>
  );
}
