import { maxAddonPieces, studdedAddonIdsOf } from "@/lib/character";
import { useCharacterAutomation } from "../papersheet/characterAutomationContext";

export function CharacterSheetArmorRules() {
  const { card, result, klass } = useCharacterAutomation();
  const addonLimit = maxAddonPieces(card.mainArmorId, card.customItems);
  const addonCount = card.addonArmorIds?.length ?? 0;
  const studdedCount = studdedAddonIdsOf(card).length;
  const shieldArm = result.fields.shieldArm === true;

  return <details className="character-sheet-armor-rules">
    <summary><i aria-hidden="true">i</i><span><strong>Armor rules</strong><small>Training, studs and Shield Arm</small></span></summary>
    <div className="character-sheet-armor-rule-list">
      <article><span>Armor training</span><strong>{klass?.armorTraining.join(" · ") || "Choose a class"}</strong><p>{result.reasons.armorLight || "Your class determines which armor you can use effectively."}</p></article>
      <article><span>Armor Class</span><strong>{String(result.fields.ac ?? "—")} · {String(result.fields.armorCategory || "Unarmored")}</strong><p>{result.reasons.ac || "Unarmored AC starts at 10 + Dexterity. Worn armor, add-ons, and upgrades modify it."}</p></article>
      <article><span>Add-on armor</span><strong>{addonCount}/{addonLimit} pieces worn</strong><p>Wear one Main Armor and up to five Add-on pieces. Balanced Fit grants a sixth slot.</p></article>
      <article><span>Studs upgrade</span><strong>{studdedCount} piece{studdedCount === 1 ? "" : "s"} upgraded</strong><p>One studded Add-on grants +1 AC; five grant +2 AC. Each upgraded piece adds 3 lb.</p></article>
      <article><span>Shield Arm</span><strong>{shieldArm ? "Active" : "Inactive"}</strong><p>A pauldron and vambrace worn on the same arm complete one Shield Arm and improve its combined AC.</p></article>
    </div>
    <div className="character-sheet-armor-effects">
      <div><span>Current worn effects</span><p>{String(result.fields.special || "No worn armor effects.")}</p></div>
      <div><span>Current impression</span><p>{String(result.fields.impressions || "No visible armor impression.")}</p></div>
    </div>
  </details>;
}
