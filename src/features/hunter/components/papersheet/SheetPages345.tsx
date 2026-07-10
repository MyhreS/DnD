import { F, Ta, St, SheetTable } from "./sheetPrimitives";

export function SheetPage3() {
  return (
    <div className="page">
      <h2 className="sec">EQUIPMENT (ALL) <St n={2} /></h2>
      <SheetTable
        prefix="eq"
        head={["ITEM", "CARRYING CATEGORY", "ITEM SLOT", "WEIGHT"]}
        widths={["40%", "24%", "20%", "16%"]}
        rows={20}
      />

      <h2 className="sec" style={{ marginTop: "9mm" }}>WEAPON DAMAGE <St n={5} /></h2>
      <SheetTable
        prefix="wd"
        head={["NAME", "ATTACK BONUS", "DAMAGE TYPE", "NOTES"]}
        widths={["36%", "18%", "22%", "24%"]}
        rows={8}
      />
      <div className="pageno">PAGE 3 · EQUIPMENT &amp; WEAPONS</div>
    </div>
  );
}

export function SheetPage4() {
  return (
    <div className="page">
      <h2 className="sec">CLASS FEATURES <St n={5} /></h2>
      <div className="features">
        <div className="col"><Ta f="features1" /></div>
        <div className="col"><Ta f="features2" /></div>
      </div>

      <h2 className="centered">FEATS <St n={2} /></h2>
      <div className="featsbox"><Ta f="feats" /></div>
      <div style={{ borderBottom: "2px solid var(--rule)" }} />
      <div className="pageno">PAGE 4 · CLASS FEATURES &amp; FEATS</div>
    </div>
  );
}

export function SheetPage5() {
  return (
    <div className="page">
      <div className="blue-rule" style={{ marginTop: 0, width: "60mm" }} />
      <div className="rites-grid">
        <div>
          <h2 className="sec" style={{ fontSize: 16 }}>WHISPERS AND RITES <St n={5} /></h2>
          <div className="riteline wide"><span className="lbl">RITE PERFORMING ABILITY</span><F f="riteAbility" /></div>
          <div className="riteline"><span className="lbl">RITE PERFORMING MODIFIER <St n={5} /></span><F f="riteMod" /></div>
          <div className="riteline"><span className="lbl">RITE SAVE DC <St n={5} /></span><F f="riteDC" /></div>
          <div className="riteline"><span className="lbl">RITE ATTACK BONUS <St n={5} /></span><F f="riteAttack" /></div>
        </div>
        <div>
          <h2 className="sec">PREPARED WHISPERS <St n={5} /></h2>
          <SheetTable
            prefix="wh"
            head={["LEVEL", "NAME", "PERFORMING", "RANGE", "DURATION", "ROUNDS"]}
            widths={["10%", "32%", "18%", "13%", "15%", "12%"]}
            rows={10}
          />
        </div>
      </div>
      <div className="pageno">PAGE 5 · WHISPERS &amp; RITES</div>
    </div>
  );
}
