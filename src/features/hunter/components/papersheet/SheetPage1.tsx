import type { ReactNode } from "react";
import { F, Chk, St } from "./sheetPrimitives";
import { Info } from "./InfoDot";

interface SkillLine {
  label: string;
  f: string;
  step?: number;
}

/** One ability block: score + modifier, saving throw, then its skills. Field
 * names match the original sheet (`strScore`, `strSave`, `skAthletics`, …). */
function Ability({ title, k, step = 3, skills }: { title: string; k: string; step?: number; skills: SkillLine[] }) {
  return (
    <div className="abil">
      <h3>
        {title} <St n={step} /> <Info k="abilities" />
      </h3>
      <div className="scoremod">
        <div className="score"><F f={`${k}Score`} /></div>
        <div className="mod"><F f={`${k}Mod`} /></div>
      </div>
      <div className="sm-lbls"><span>SCORE</span><span>MODIFIER</span></div>
      <div style={{ height: "2mm" }} />
      <div className="skill save">
        <span className="sname">Saving Throw <St n={5} /></span>
        <F f={`${k}Save`} />
        <Chk f={`${k}SaveP`} className="prof" />
      </div>
      {skills.map((s) => (
        <div className="skill" key={s.f}>
          <span className="sname">
            {s.label} {s.step != null && <St n={s.step} />}
          </span>
          <F f={s.f} />
          <Chk f={`${s.f}P`} className="prof" />
        </div>
      ))}
    </div>
  );
}

function Vital({ head, children }: { head: ReactNode; children: ReactNode }) {
  return (
    <div className="vrow">
      <div className="rowhead">{head}</div>
      {children}
    </div>
  );
}

const MF = ({ f, lbl, tight }: { f: string; lbl?: ReactNode; tight?: boolean }) => (
  <div className={tight ? "mf tight" : "mf"}>
    <F f={f} />
    {lbl && <span className="lbl small">{lbl}</span>}
  </div>
);

export function SheetPage1() {
  return (
    <div className="page">
      <div className="p1-top">
        <div className="idfields">
          <div className="fld">
            <span className="st-note">Your ACTUAL name</span>
            <F f="name" />
            <span className="lbl">Your Name <Info k="name" /></span>
          </div>
          <div className="fld"><F f="background" /><span className="lbl">Background <St n={2} /> <Info k="background" /></span></div>
          <div className="fld"><F f="class" /><span className="lbl">Class <St n={1} /> <Info k="class" side="right" /></span></div>
          <div className="fld"><F f="subclass" /><span className="lbl">Subclass <St n={1} /> <Info k="subclass" /></span></div>
        </div>

        <div className="eye-wrap">
          <div className="eye">
            <svg viewBox="0 0 240 134" fill="none" aria-hidden="true">
              <path d="M8 67 C 60 6, 180 6, 232 67 C 180 128, 60 128, 8 67 Z" stroke="#211d17" strokeWidth="6" fill="rgba(255,255,255,.35)" />
              <path d="M14 67 C 62 16, 178 16, 226 67" stroke="#211d17" strokeWidth="2.5" opacity=".35" fill="none" transform="translate(0,7)" />
              <circle cx="120" cy="67" r="53" stroke="#211d17" strokeWidth="3.5" fill="rgba(246,241,229,.95)" />
            </svg>
            <div className="iris-stack">
              <F f="level" />
              <span className="lbl">Level <St n={1} /> <Info k="level" /></span>
              <div className="iris-rule" />
              <span className="lbl">Insight <St n={5} /> <Info k="insight" /></span>
              <F f="insight" />
            </div>
          </div>
        </div>

        <div className="vitals">
          <Vital head={<>TRANSFORMATION LVL <St n={5} /> <Info k="transformation" side="left" /></>}>
            <div className="minifields"><MF f="transformation" /></div>
          </Vital>
          <Vital
            head={
              <>
                SANITY <St n={5} /> <Info k="sanity" side="left" />
                <span style={{ marginLeft: "auto" }} className="sanity-insane"><Chk f="insane" /> INSANE</span>
              </>
            }
          >
            <div className="minifields">
              <MF f="sanityCur" lbl="CURRENT" />
              <MF f="sanityMax" lbl="MAX" />
              <MF f="sanityDice" lbl={<>SANITY DICE <St n={5} /></>} />
            </div>
          </Vital>
          <Vital head={<>HIT POINTS <St n={5} /> <Info k="hp" side="left" /></>}>
            <div className="minifields">
              <MF f="hpCur" lbl="CURRENT" />
              <MF f="hpMax" lbl="MAX" />
              <MF f="hpTemp" lbl="TEMP" tight />
            </div>
          </Vital>
          <Vital head={<>HIT DICE <St n={5} /> <Info k="hitDice" side="left" /></>}>
            <div className="minifields">
              <MF f="hdSpent" lbl="SPENT" />
              <MF f="hdMax" lbl="MAX" />
            </div>
          </Vital>
          <Vital head={<>DEATH SAVES <Info k="deathSaves" side="left" /></>}>
            <div className="deathsaves">
              <div className="ds-line">
                <Chk f="dsS1" className="pip" /><Chk f="dsS2" className="pip" /><Chk f="dsS3" className="pip" />
                <span>— SUCCESSES</span>
              </div>
              <div className="ds-line">
                <Chk f="dsF1" className="pip fail" /><Chk f="dsF2" className="pip fail" /><Chk f="dsF3" className="pip fail" />
                <span>— FAILURES</span>
              </div>
            </div>
          </Vital>
        </div>
      </div>

      <div className="blue-rule" />

      <div className="statgrid">
        <div>
          <div className="abil" style={{ textAlign: "center" }}>
            <h3>PROFICIENCY BONUS <St n={2} /> <Info k="profBonus" /></h3>
            <div className="profbox"><F f="profBonus" /></div>
          </div>
          <Ability title="STRENGTH" k="str" skills={[{ label: "Athletics", f: "skAthletics", step: 2 }]} />
          <Ability
            title="DEXTERITY"
            k="dex"
            skills={[
              { label: "Acrobatics", f: "skAcrobatics", step: 2 },
              { label: "Sleight of Hand", f: "skSleight" },
              { label: "Stealth", f: "skStealth" },
            ]}
          />
        </div>

        <div>
          <Ability title="CONSTITUTION" k="con" skills={[{ label: "Grit", f: "skGrit", step: 2 }]} />
          <Ability
            title="INTELLIGENCE"
            k="int"
            skills={[
              { label: "Eldritch Knowledge", f: "skEldritch", step: 2 },
              { label: "Old World History", f: "skHistory" },
              { label: "Investigation", f: "skInvestigation" },
              { label: "Blood Nature", f: "skBloodNature" },
              { label: "Religion", f: "skReligion" },
            ]}
          />
          <div className="tinge">
            <h3>BLOOD TINGE <St n={5} /> <Info k="bloodTinge" /></h3>
            <div className="drop">
              <svg viewBox="0 0 60 78" aria-hidden="true">
                <path d="M30 3 C 30 3, 8 36, 8 52 a22 22 0 0 0 44 0 C 52 36, 30 3, 30 3 Z" stroke="#211d17" strokeWidth="4" fill="rgba(142,31,31,.10)" />
              </svg>
              <F f="bloodTinge" />
            </div>
          </div>
        </div>

        <div>
          <Ability
            title="WISDOM"
            k="wis"
            skills={[
              { label: "Animal Handling", f: "skAnimal", step: 2 },
              { label: "Insight", f: "skInsight" },
              { label: "Medicine", f: "skMedicine" },
              { label: "Perception", f: "skPerception" },
              { label: "Survival", f: "skSurvival" },
            ]}
          />
          <Ability
            title="CHARISMA"
            k="cha"
            skills={[
              { label: "Deception", f: "skDeception", step: 2 },
              { label: "Intimidation", f: "skIntimidation" },
              { label: "Presence", f: "skPresence" },
              { label: "Persuasion", f: "skPersuasion" },
            ]}
          />
        </div>
      </div>

      <div className="p1-bottom">
        <div className="bigstat"><div className="head">INITIATIVE <St n={5} /> <Info k="initiative" /></div><F f="initiative" /></div>
        <div>
          <div className="bigstat"><div className="head">SPEED <St n={2} /> <Info k="speed" /></div><F f="speed" /></div>
          <div className="sizecap">( SIZE : MEDIUM )</div>
        </div>
        <div className="bigstat"><div className="head">PASSIVE PERCEPTION <St n={5} /> <Info k="passivePerception" side="left" /></div><F f="passivePerception" /></div>
      </div>
      <div className="pageno">PAGE 1 · IDENTITY &amp; ABILITIES</div>
    </div>
  );
}
