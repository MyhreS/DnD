import type { RefObject, ReactNode } from "react";
import { Link } from "react-router-dom";
import { CODEX_SOURCE_BY_ID, CURRENT_CHARACTER_SHEET, CURRENT_WHISPERS } from "@/data/codex";
import type { HunterCard, SheetData } from "@/types";
import "./source-character-sheet.css";

const ABILITIES = [
  { key: "str", short: "STR", name: "Strength" },
  { key: "dex", short: "DEX", name: "Dexterity" },
  { key: "con", short: "CON", name: "Constitution" },
  { key: "int", short: "INT", name: "Intelligence" },
  { key: "wis", short: "WIS", name: "Wisdom" },
  { key: "cha", short: "CHA", name: "Charisma" },
] as const;

const CURRENT_WHISPER_IDS = new Set(CURRENT_WHISPERS.map((whisper) => whisper.id));

const SKILL_FIELDS: Record<string, string> = {
  Athletics: "skAthletics",
  Acrobatics: "skAcrobatics",
  "Sleight of Hand": "skSleight",
  Stealth: "skStealth",
  Grit: "skGrit",
  "Eldritch Knowledge": "skEldritch",
  "Old World History": "skHistory",
  Investigation: "skInvestigation",
  "Blood Nature": "skBlood",
  Religion: "skReligion",
  "Animal Handling": "skAnimal",
  Insight: "skInsight",
  Medicine: "skMedicine",
  Perception: "skPerception",
  Survival: "skSurvival",
  Deception: "skDeception",
  Intimidation: "skIntimidation",
  Presence: "skPresence",
  Persuasion: "skPersuasion",
};

function textValue(data: SheetData, field: string): string {
  const value = data[field];
  return typeof value === "string" ? value : "";
}

function checkedValue(data: SheetData, field: string): boolean {
  return data[field] === true;
}

interface SourceCharacterSheetProps {
  data: SheetData;
  setField: (field: string, value: string | boolean) => void;
  setFields: (fields: SheetData, patch?: Partial<HunterCard>) => void;
  card: HunterCard;
  readOnly: boolean;
  onBack: () => void;
  backRef: RefObject<HTMLButtonElement | null>;
  saveMsg: string;
}

export function SourceCharacterSheet({
  data,
  setField,
  setFields,
  card,
  readOnly,
  onBack,
  backRef,
  saveMsg,
}: SourceCharacterSheetProps) {
  const sourcePath = CODEX_SOURCE_BY_ID.get("character-sheet")?.publicPath;

  return (
    <div className="source-sheet" data-testid="source-character-sheet">
      <header className="source-sheet-header">
        <button ref={backRef} type="button" className="btn btn-ghost btn-sm" onClick={onBack}>
          ← Hunters
        </button>
        <div>
          <p className="eyebrow">Current character sheet</p>
          <h1>{textValue(data, "name") || card.name || "New hunter"}</h1>
        </div>
        <div className="source-sheet-header-actions">
          {saveMsg && <span role="status">{saveMsg}</span>}
          {sourcePath && <a href={sourcePath} target="_blank" rel="noreferrer">Printable PDF</a>}
        </div>
      </header>

      <nav className="source-sheet-nav" aria-label="Character sheet sections">
        {CURRENT_CHARACTER_SHEET.sections.map((section, index) => (
          <a key={section.id} href={`#sheet-${section.id}`}>{index + 1}. {section.title}</a>
        ))}
      </nav>

      <main className="source-sheet-pages">
        <SheetSection id="identity-abilities" number="01" title="Identity & Abilities">
          <div className="source-sheet-grid source-sheet-grid-identity">
            <SheetField label="Your ACTUAL name" field="actualName" data={data} setField={setField} readOnly={readOnly} />
            <SheetField label="Your Name" field="name" data={data} setField={setField} readOnly={readOnly} />
            <SheetField label="Background" field="background" data={data} setField={setField} readOnly={readOnly} />
            <SheetField label="Class" field="class" data={data} setField={setField} readOnly={readOnly} />
            <SheetField label="Subclass" field="subclass" data={data} setField={setField} readOnly={readOnly} />
            <SheetField label="Level" field="level" data={data} setField={setField} readOnly={readOnly} compact />
            <SheetField label="Insight" field="insight" data={data} setField={setField} readOnly={readOnly} compact />
          </div>

          <h3>Vitals</h3>
          <div className="source-sheet-grid source-sheet-grid-vitals">
            <SheetField label="Transformation Lvl" field="transformation" data={data} setField={setField} readOnly={readOnly} compact />
            <SheetField label="Sanity · Current" field="sanityCur" data={data} setField={setField} readOnly={readOnly} compact />
            <SheetField label="Sanity · Max" field="sanityMax" data={data} setField={setField} readOnly={readOnly} compact />
            <SheetCheck label="Insane" field="insane" data={data} setField={setField} readOnly={readOnly} />
            <SheetField label="Sanity Dice" field="sanityDice" data={data} setField={setField} readOnly={readOnly} compact />
            <SheetField label="Hit Points · Current" field="hpCur" data={data} setField={setField} readOnly={readOnly} compact />
            <SheetField label="Hit Points · Max" field="hpMax" data={data} setField={setField} readOnly={readOnly} compact />
            <SheetField label="Hit Points · Temp" field="hpTemp" data={data} setField={setField} readOnly={readOnly} compact />
            <SheetField label="Hit Dice · Current" field="hdCur" data={data} setField={setField} readOnly={readOnly} compact />
            <SheetField label="Hit Dice · Spent" field="hdSpent" data={data} setField={setField} readOnly={readOnly} compact />
            <SheetField label="Hit Dice · Max" field="hdMax" data={data} setField={setField} readOnly={readOnly} compact />
          </div>
          <div className="source-sheet-death-saves">
            <span>Death Saves</span>
            <CheckSeries label="Successes" prefix="dsS" data={data} setField={setField} readOnly={readOnly} />
            <CheckSeries label="Failures" prefix="dsF" data={data} setField={setField} readOnly={readOnly} />
          </div>

          <h3>Abilities & Skills</h3>
          <SheetField label="Proficiency Bonus" field="profBonus" data={data} setField={setField} readOnly={readOnly} compact />
          <div className="source-ability-list">
            {ABILITIES.map((ability) => {
              const skills = CURRENT_CHARACTER_SHEET.skills.filter((skill) => skill.ability === ability.name);
              return (
                <section className="source-ability" key={ability.key} aria-labelledby={`ability-${ability.key}`}>
                  <header>
                    <div><strong id={`ability-${ability.key}`}>{ability.name}</strong><span>{ability.short}</span></div>
                    <SheetField label="Score" field={`${ability.key}Score`} data={data} setField={setField} readOnly={readOnly} compact />
                    <SheetField label="Modifier" field={`${ability.key}Mod`} data={data} setField={setField} readOnly={readOnly} compact />
                    <SheetField label="Saving Throw" field={`${ability.key}Save`} data={data} setField={setField} readOnly={readOnly} compact />
                  </header>
                  <div className="source-skill-list">
                    {skills.map((skill) => {
                      const field = SKILL_FIELDS[skill.name];
                      return (
                        <div className="source-skill" key={skill.name}>
                          <SheetCheck label="Proficient" field={`${field}P`} data={data} setField={setField} readOnly={readOnly} visuallyCompact />
                          <span>{skill.name}</span>
                          <SheetField label="Modifier" field={field} data={data} setField={setField} readOnly={readOnly} compact hideLabel />
                        </div>
                      );
                    })}
                  </div>
                </section>
              );
            })}
          </div>
          <div className="source-sheet-grid source-sheet-grid-vitals source-sheet-derived">
            <SheetCheck label="Blood Tinge" field="bloodTinge" data={data} setField={setField} readOnly={readOnly} />
            <SheetField label="Initiative" field="initiative" data={data} setField={setField} readOnly={readOnly} compact />
            <SheetField label="Speed" field="speed" data={data} setField={setField} readOnly={readOnly} compact />
            <div className="source-sheet-fixed"><span>Size</span><strong>Medium</strong></div>
            <SheetField label="Passive Perception" field="passivePerception" data={data} setField={setField} readOnly={readOnly} compact />
          </div>
        </SheetSection>

        <SheetSection id="armor-equipment" number="02" title="Armor & Equipment">
          <div className="source-sheet-grid source-sheet-grid-vitals">
            <SheetField label="Armor Class" field="ac" data={data} setField={setField} readOnly={readOnly} compact />
            <SheetField label="Armor Category" field="armorCategory" data={data} setField={setField} readOnly={readOnly} />
            <SheetField label="Shield Arm" field="shieldArm" data={data} setField={setField} readOnly={readOnly} />
            <SheetField label="Weight" field="weight" data={data} setField={setField} readOnly={readOnly} compact />
            <SheetField label="Weight Condition" field="weightCondition" data={data} setField={setField} readOnly={readOnly} />
          </div>
          <div className="source-sheet-grid source-sheet-grid-armor">
            {[["Head Gear", "headGear"], ["Scarf", "scarf"], ["Gloves", "gloves"], ["Main Armor", "mainArmor"], ["Boots", "boots"]].map(([label, field]) => (
              <SheetField key={field} label={label} field={field} data={data} setField={setField} readOnly={readOnly} />
            ))}
          </div>
          <h3>Add-on Armor</h3>
          <div className="source-addon-list">
            {Array.from({ length: 6 }, (_, index) => (
              <div key={index}>
                <SheetField label={`Piece ${index + 1}`} field={`addon${index + 1}`} data={data} setField={setField} readOnly={readOnly} hideLabel />
                <SheetCheck label="Studs" field={`studs${index + 1}`} data={data} setField={setField} readOnly={readOnly} />
              </div>
            ))}
          </div>
          <div className="source-sheet-grid source-sheet-grid-notes">
            <SheetArea label="Impressions" field="impressions" data={data} setField={setField} readOnly={readOnly} />
            <SheetArea label="Special" field="special" data={data} setField={setField} readOnly={readOnly} />
          </div>
          <SheetArea label="Storage Items" field="storageItems" data={data} setField={setField} readOnly={readOnly} rows={3} />
          <div className="source-storage-slots">
            <SheetCheck label="Oversized · Hand" field="slotHand" data={data} setField={setField} readOnly={readOnly} />
            <SheetCheck label="Significant · Back" field="slotBack" data={data} setField={setField} readOnly={readOnly} />
            <SheetCheck label="Significant · Hip" field="slotHip" data={data} setField={setField} readOnly={readOnly} />
            <SheetCheck label="Significant · Chest" field="slotChest" data={data} setField={setField} readOnly={readOnly} />
            <SheetCheck label="Significant · Ankle" field="slotAnkle" data={data} setField={setField} readOnly={readOnly} />
          </div>
          <h3>Training & Proficiencies</h3>
          <div className="source-training">
            <SheetCheck label="Armor · Light" field="armorLight" data={data} setField={setField} readOnly={readOnly} />
            <SheetCheck label="Armor · Medium" field="armorMedium" data={data} setField={setField} readOnly={readOnly} />
            <SheetCheck label="Armor · Heavy" field="armorHeavy" data={data} setField={setField} readOnly={readOnly} />
            <SheetCheck label="Weapons · Simple" field="wepSimple" data={data} setField={setField} readOnly={readOnly} />
            <SheetCheck label="Weapons · Martial" field="wepMartial" data={data} setField={setField} readOnly={readOnly} />
          </div>
          <div className="source-sheet-grid source-sheet-grid-notes">
            <SheetArea label="Tools" field="tools" data={data} setField={setField} readOnly={readOnly} rows={3} />
            <SheetField label="Coins · GP" field="coins" data={data} setField={setField} readOnly={readOnly} compact />
          </div>
        </SheetSection>

        <SheetSection id="equipment-weapons" number="03" title="Equipment & Weapons">
          <h3>Equipment (All)</h3>
          <EditableTable
            columns={["Item", "Carrying Category", "Item Slot", "Weight"]}
            rows={12}
            field={(row, column) => `eq_${row}_${column}`}
            data={data}
            setField={setField}
            readOnly={readOnly}
          />
          <h3>Weapons</h3>
          <EditableTable
            columns={["Name", "Attack Bonus", "Damage Type", "Notes"]}
            rows={8}
            field={(row, column) => `weapon_${row}_${column}`}
            data={data}
            setField={setField}
            readOnly={readOnly}
          />
        </SheetSection>

        <SheetSection id="class-features-feats" number="04" title="Class Features & Feats">
          <SheetArea label="Class Features" field="classFeatures" data={data} setField={setField} readOnly={readOnly} rows={14} />
          <SheetArea label="Feats" field="feats" data={data} setField={setField} readOnly={readOnly} rows={10} />
        </SheetSection>

        <SheetSection id="whispers-rites" number="05" title="Whispers & Rites">
          <div className="source-sheet-grid source-sheet-grid-vitals">
            <SheetField label="Rite Performing Ability" field="riteAbility" data={data} setField={setField} readOnly={readOnly} />
            <SheetField label="Rite Performing Modifier" field="riteMod" data={data} setField={setField} readOnly={readOnly} compact />
            <SheetField label="Rite Save DC" field="riteDC" data={data} setField={setField} readOnly={readOnly} compact />
            <SheetField label="Rite Attack Bonus" field="riteAttack" data={data} setField={setField} readOnly={readOnly} compact />
          </div>
          <div className="source-whisper-heading">
            <div><h3>Prepared Whispers</h3><p>Select only what is recorded for this hunter. The source set gives no preparation limit.</p></div>
            <Link to="/codex?group=Whispers">Read full Whisper rules</Link>
          </div>
          <div className="source-whisper-list">
            {CURRENT_WHISPERS.map((whisper) => {
              const field = `whisper_${whisper.id}`;
              const selected = checkedValue(data, field) || (data[field] === undefined && card.preparedWhispers?.includes(whisper.id));
              return (
                <label key={whisper.id} className={`source-whisper${selected ? " is-selected" : ""}`}>
                  <input
                    type="checkbox"
                    checked={selected}
                    disabled={readOnly}
                    data-f={field}
                    onChange={(event) => {
                      const next = event.target.checked;
                      const prepared = new Set(
                        (card.preparedWhispers ?? []).filter((id) => CURRENT_WHISPER_IDS.has(id)),
                      );
                      if (next) prepared.add(whisper.id);
                      else prepared.delete(whisper.id);
                      setFields({ [field]: next }, { preparedWhispers: [...prepared] });
                    }}
                  />
                  <span>
                    <strong>{whisper.name}</strong>
                    <small>Level {whisper.level} · {whisper.performing} · {whisper.range} · {whisper.duration}</small>
                  </span>
                </label>
              );
            })}
          </div>
          <div className="source-rites-link">
            <div><strong>Leveled Rites</strong><p>The current Book of the Deepcaller contains 21 Rites. No class progression or known-Rite limit was supplied.</p></div>
            <Link className="btn btn-ghost btn-sm" to="/codex?group=Rites">Browse Rites</Link>
          </div>
          <SheetArea label="Whispers & Rites notes" field="ritesNotes" data={data} setField={setField} readOnly={readOnly} rows={6} />
        </SheetSection>

        <SheetSection id="notes" number="06" title="Notes">
          <SheetArea
            label="Notes"
            field="pageNotes"
            data={data}
            setField={(field, value) => setFields({ [field]: value }, { notes: String(value) })}
            readOnly={readOnly}
            rows={24}
          />
        </SheetSection>
      </main>
    </div>
  );
}

function SheetSection({ id, number, title, children }: { id: string; number: string; title: string; children: ReactNode }) {
  return (
    <section className="source-sheet-page" id={`sheet-${id}`}>
      <header><span>Page {number}</span><h2>{title}</h2></header>
      {children}
    </section>
  );
}

function SheetField({ label, field, data, setField, readOnly, compact = false, hideLabel = false }: {
  label: string;
  field: string;
  data: SheetData;
  setField: (field: string, value: string | boolean) => void;
  readOnly: boolean;
  compact?: boolean;
  hideLabel?: boolean;
}) {
  return (
    <label className={`source-field${compact ? " is-compact" : ""}`}>
      <span className={hideLabel ? "sr-only" : undefined}>{label}</span>
      <input
        type="text"
        inputMode={compact ? "text" : undefined}
        value={textValue(data, field)}
        readOnly={readOnly}
        data-f={field}
        aria-label={label}
        onChange={(event) => setField(field, event.target.value)}
      />
    </label>
  );
}

function SheetArea({ label, field, data, setField, readOnly, rows = 5 }: {
  label: string;
  field: string;
  data: SheetData;
  setField: (field: string, value: string | boolean) => void;
  readOnly: boolean;
  rows?: number;
}) {
  return (
    <label className="source-field source-area">
      <span>{label}</span>
      <textarea
        rows={rows}
        value={textValue(data, field)}
        readOnly={readOnly}
        data-f={field}
        onChange={(event) => setField(field, event.target.value)}
      />
    </label>
  );
}

function SheetCheck({ label, field, data, setField, readOnly, visuallyCompact = false }: {
  label: string;
  field: string;
  data: SheetData;
  setField: (field: string, value: string | boolean) => void;
  readOnly: boolean;
  visuallyCompact?: boolean;
}) {
  return (
    <label className={`source-check${visuallyCompact ? " is-compact" : ""}`} title={label}>
      <input
        type="checkbox"
        checked={checkedValue(data, field)}
        disabled={readOnly}
        data-f={field}
        onChange={(event) => setField(field, event.target.checked)}
      />
      <span>{visuallyCompact ? <span className="sr-only">{label}</span> : label}</span>
    </label>
  );
}

function CheckSeries({ label, prefix, data, setField, readOnly }: {
  label: string;
  prefix: string;
  data: SheetData;
  setField: (field: string, value: string | boolean) => void;
  readOnly: boolean;
}) {
  return (
    <div><small>{label}</small>{[1, 2, 3].map((index) => (
      <input
        key={index}
        type="checkbox"
        aria-label={`${label} ${index}`}
        checked={checkedValue(data, `${prefix}${index}`)}
        disabled={readOnly}
        data-f={`${prefix}${index}`}
        onChange={(event) => setField(`${prefix}${index}`, event.target.checked)}
      />
    ))}</div>
  );
}

function EditableTable({ columns, rows, field, data, setField, readOnly }: {
  columns: string[];
  rows: number;
  field: (row: number, column: number) => string;
  data: SheetData;
  setField: (field: string, value: string | boolean) => void;
  readOnly: boolean;
}) {
  return (
    <div className="source-editable-table-wrap">
      <table className="source-editable-table">
        <thead><tr>{columns.map((column) => <th key={column} scope="col">{column}</th>)}</tr></thead>
        <tbody>{Array.from({ length: rows }, (_, row) => (
          <tr key={row}>{columns.map((column, columnIndex) => {
            const key = field(row, columnIndex);
            return <td key={column}><input type="text" aria-label={`${column} row ${row + 1}`} value={textValue(data, key)} readOnly={readOnly} data-f={key} onChange={(event) => setField(key, event.target.value)} /></td>;
          })}</tr>
        ))}</tbody>
      </table>
    </div>
  );
}
