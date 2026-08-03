import { F, Ta, Chk, St } from "./sheetPrimitives";
import { HunterFigure } from "./HunterFigure";
import { Info } from "./InfoDot";

// Six rows: five is the normal maximum, and a Balanced Fit Main Armor lets
// one Add-on not count toward it (handbook Armor Types).
const ADDONS = [1, 2, 3, 4, 5, 6] as const;

const SLOTS = [
  { f: "slotHand", label: "OVERSIZED STORAGE SLOT (HAND)" },
  { f: "slotBack", label: "SIGNIFICANT STORAGE SLOT (BACK)" },
  { f: "slotHip", label: "SIGNIFICANT STORAGE SLOT (HIP)" },
  { f: "slotChest", label: "SIGNIFICANT STORAGE SLOT (CHEST)" },
  { f: "slotAnkle", label: "SIGNIFICANT STORAGE SLOT (ANKLE)" },
] as const;

export function SheetPage2() {
  return (
    <div className="page">
      <div className="blue-rule" style={{ marginTop: 0 }} />
      <div className="sec-title">ARMOR &amp; EQUIPMENT</div>
      <div className="p2-grid">
        {/* left column: armor */}
        <div>
          <div className="ac-row">
            <div className="shield" data-step="4">
              <span className="lbl">ARMOR CLASS <St n={4} /> <Info k="ac" /></span>
              <div className="shield-gfx">
                <svg viewBox="0 0 90 104" aria-hidden="true">
                  <path d="M45 4 L 84 14 C 84 52, 74 84, 45 100 C 16 84, 6 52, 6 14 Z" stroke="#211d17" strokeWidth="5" fill="rgba(255,255,255,.35)" />
                </svg>
                <F f="ac" />
              </div>
              <div className="shieldarm"><Chk f="shieldArm" /> SHIELD ARM <St n={4} /></div>
            </div>
            <div className="armorcat">
              <div className="fld" data-step="4"><F f="armorCategory" /><span className="lbl">ARMOR CATEGORY <St n={4} /> <Info k="armorCategory" /></span></div>
              <div className="wt2">
                <div className="fld" data-step="4"><F f="weight" /><span className="lbl">WEIGHT <St n={4} /> <Info k="weight" /></span></div>
                <div className="fld" data-step="4"><F f="weightCondition" /><span className="lbl">WEIGHT CONDITION <St n={4} /> <Info k="weightCondition" /></span></div>
              </div>
            </div>
          </div>

          <div className="dashed-rule" />

          <HunterFigure />

          <h2 className="sec" style={{ marginTop: "4mm" }} data-step="4">ADD-ON ARMOR <St n={4} /> <Info k="addons" /></h2>
          <div className="addons">
            {ADDONS.map((i) => (
              <div className="addon-row" key={i} data-step="4">
                <div className="frame"><F f={`addon${i}`} /></div>
                <span className="studs"><Chk f={`studs${i}`} /> STUDS <St n={4} /></span>
              </div>
            ))}
          </div>

          <div className="coins" data-step="2">
            <span className="lbl">COINS <St n={2} /> <Info k="coins" side="up" /></span>
            <div className="coinbox"><F f="coins" /></div>
            <span className="lbl">GP</span>
          </div>
        </div>

        {/* right column */}
        <div className="rcol">
          <div className="frame" data-step="4">
            <div className="head">IMPRESSIONS <St n={4} /> <Info k="impressions" side="left" /></div>
            <Ta rows={3} f="impressions" />
          </div>
          <div className="frame" data-step="4">
            <div className="head">SPECIAL <St n={4} /> <Info k="special" side="left" /></div>
            <Ta rows={7} f="special" />
          </div>
          <div className="frame" data-step="2">
            <div className="head">STORAGE ITEMS <St n={2} /> <Info k="storageItems" side="left" /></div>
            <Ta rows={4} f="storageItems" />
          </div>

          <div className="slots">
            {SLOTS.map((s, i) => (
              <div className="slotline" key={s.f} data-step="2">
                <span className="lbl">{s.label} <St n={2} /> {i === 0 && <Info k="slots" side="left" />}</span>
                {/* the slot is used or it isn't — a check, not a text field
                 * (legacy free-text values read as checked via truthyText) */}
                <Chk f={s.f} className="slotbox" truthyText aria-label={s.label} />
              </div>
            ))}
          </div>

          <div className="training">
            <h2 className="sec">EQUIPMENT TRAINING &amp; PROFICIENCIES</h2>
            <div className="trainline" data-step="1">
              <span className="lbl">ARMOR TRAINING <St n={1} /> <Info k="training" side="left" /></span>
              <span className="chk"><Chk f="armorLight" /> LIGHT</span>
              <span className="chk"><Chk f="armorMedium" /> MEDIUM</span>
              <span className="chk"><Chk f="armorHeavy" /> HEAVY</span>
            </div>
            <div className="trainline" data-step="2">
              <span className="lbl">WEAPONS <St n={2} /> <Info k="weaponsProf" side="left" /></span>
              <span className="chk"><Chk f="wepSimple" /> SIMPLE</span>
              <span className="chk"><Chk f="wepMartial" /> MARTIAL</span>
            </div>
          </div>

          <div className="frame" style={{ marginTop: "5mm" }} data-step="2">
            <div className="head">TOOLS <St n={2} /> <Info k="tools" side="left" /></div>
            <Ta rows={4} f="tools" />
          </div>
        </div>
      </div>
      <div className="pageno">PAGE 2 · ARMOR &amp; EQUIPMENT</div>
    </div>
  );
}
