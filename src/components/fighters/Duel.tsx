import { useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { MathUtils } from "three";
import { Combatant, type CombatantHandle } from "./Combatant";
import type { Cast } from "./useFighterShows";
import type { Impact } from "./fighterConfig";

const GAP = 2.2; // each fighter's distance from centre while clashing
const RUN = 3.6;
const WALK = 1.6;
const FACE_R = Math.PI / 2; // facing screen-right (toward a foe on the right)
const FACE_L = -Math.PI / 2;
const OFF = 1.2;
const EXCHANGE = 1.0; // seconds per traded blow
const IMPACT_AT = 0.42; // fraction into an exchange when the blow lands
const LUNGE = 0.45; // how far the attacker steps in

const pick = <T,>(xs: T[]): T => xs[Math.floor(Math.random() * xs.length)];

type Phase = "enter" | "clash" | "finish" | "recover" | "exit" | "done";

interface Props {
  left: Cast;
  right: Cast;
  onImpact: Impact;
  onDone: () => void;
}

/**
 * Two fighters charge in from opposite edges, trade a flurry of blows (attacks
 * answered by blocks / dodges / flinches, with sparks on the hit), then one
 * lands the finisher: the loser falls, the victor celebrates, the loser rises,
 * and both walk off. Empty slots are filled with nameless fighters upstream.
 */
export function Duel({ left, right, onImpact, onDone }: Props) {
  const L = useRef<CombatantHandle>(null);
  const R = useRef<CombatantHandle>(null);
  const { viewport } = useThree();
  const halfW = viewport.width / 2;
  const off = halfW + OFF;
  const groundY = -viewport.height / 2 + 0.1;

  const phase = useRef<Phase>("enter");
  const t = useRef(0);
  const ex = useRef(0);
  const exTotal = useRef(5);
  const attackerL = useRef(true);
  const impacted = useRef(false);
  const loserL = useRef(false);
  const finStep = useRef(0);
  const started = useRef(false);
  const fired = useRef(false);

  const startExchange = () => {
    impacted.current = false;
    const att = attackerL.current ? L.current : R.current;
    const def = attackerL.current ? R.current : L.current;
    const attConf = attackerL.current ? left : right;
    const defConf = attackerL.current ? right : left;
    att?.play(pick(attConf.fighter.clips.attack));
    def?.play(defConf.fighter.clips.idle);
  };

  const landImpact = () => {
    impacted.current = true;
    const def = attackerL.current ? R.current : L.current;
    const defConf = attackerL.current ? right : left;
    const r = Math.random();
    if (r < 0.45) def?.play(defConf.fighter.clips.block);
    else if (r < 0.7) def?.play(defConf.fighter.clips.dodge);
    else def?.play(defConf.fighter.clips.hit);
    const attConf = attackerL.current ? left : right;
    onImpact(0, groundY + 1.4, attConf.fighter.theme.accent);
  };

  useFrame((_, dt) => {
    const l = L.current;
    const r = R.current;
    const lg = l?.group;
    const rg = r?.group;
    if (!l || !r || !lg || !rg) return;

    if (!started.current) {
      started.current = true;
      lg.position.set(-off, groundY, 0);
      lg.rotation.y = FACE_R;
      l.play(left.fighter.clips.run);
      rg.position.set(off, groundY, 0);
      rg.rotation.y = FACE_L;
      r.play(right.fighter.clips.run);
      exTotal.current = 4 + Math.floor(Math.random() * 3); // 4–6 exchanges
    }
    lg.position.y = groundY;
    rg.position.y = groundY;
    t.current += dt;

    switch (phase.current) {
      case "enter": {
        lg.position.x = Math.min(-GAP, lg.position.x + RUN * dt);
        rg.position.x = Math.max(GAP, rg.position.x - RUN * dt);
        if (lg.position.x >= -GAP && rg.position.x <= GAP) {
          lg.position.x = -GAP;
          rg.position.x = GAP;
          phase.current = "clash";
          t.current = 0;
          ex.current = 0;
          attackerL.current = Math.random() < 0.5;
          startExchange();
        }
        break;
      }
      case "clash": {
        // Attacker lunges in and back over the exchange; defender holds ground.
        const lunge = LUNGE * Math.sin(Math.min(t.current / EXCHANGE, 1) * Math.PI);
        lg.position.x = -GAP + (attackerL.current ? lunge : 0);
        rg.position.x = GAP - (attackerL.current ? 0 : lunge);
        if (!impacted.current && t.current >= EXCHANGE * IMPACT_AT) landImpact();
        if (t.current >= EXCHANGE) {
          ex.current += 1;
          t.current = 0;
          if (ex.current >= exTotal.current) {
            phase.current = "finish";
            finStep.current = 0;
            loserL.current = Math.random() < 0.5;
            const winner = loserL.current ? r : l;
            const wConf = loserL.current ? right : left;
            winner.play(pick(wConf.fighter.clips.attack));
          } else {
            attackerL.current = !attackerL.current;
            startExchange();
          }
        }
        break;
      }
      case "finish": {
        if (finStep.current === 0 && t.current >= 0.4) {
          finStep.current = 1;
          const loser = loserL.current ? l : r;
          const loserConf = loserL.current ? left : right;
          const winConf = loserL.current ? right : left;
          loser.play(loserConf.fighter.clips.death, { loop: false, clamp: true });
          onImpact(loserL.current ? -GAP : GAP, groundY + 1.3, winConf.fighter.theme.accent);
        } else if (finStep.current === 1 && t.current >= 1.5) {
          finStep.current = 2;
          const winner = loserL.current ? r : l;
          const winConf = loserL.current ? right : left;
          winner.play(winConf.fighter.clips.cheer);
        } else if (finStep.current === 2 && t.current >= 3.2) {
          phase.current = "recover";
          t.current = 0;
          const loser = loserL.current ? l : r;
          const loserConf = loserL.current ? left : right;
          loser.play(loserConf.fighter.clips.standUp, { loop: false, clamp: true });
        }
        break;
      }
      case "recover": {
        if (t.current >= 1.4) {
          phase.current = "exit";
          t.current = 0;
          l.play(left.fighter.clips.walk);
          r.play(right.fighter.clips.walk);
        }
        break;
      }
      case "exit": {
        lg.rotation.y = MathUtils.damp(lg.rotation.y, FACE_L, 6, dt);
        rg.rotation.y = MathUtils.damp(rg.rotation.y, FACE_R, 6, dt);
        lg.position.x -= WALK * dt;
        rg.position.x += WALK * dt;
        if (lg.position.x <= -off && rg.position.x >= off) {
          phase.current = "done";
          if (!fired.current) {
            fired.current = true;
            onDone();
          }
        }
        break;
      }
      case "done":
        break;
    }
  });

  return (
    <>
      <Combatant ref={L} fighter={left.fighter} name={left.name} />
      <Combatant ref={R} fighter={right.fighter} name={right.name} />
    </>
  );
}
