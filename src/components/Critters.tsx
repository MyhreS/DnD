import { useEffect, useState, type CSSProperties } from "react";
import { subscribeParty } from "@/api/players";
import { CreatureSprite } from "@/data/CreatureSprite";
import { Climber } from "./Climber";
import type { HunterCard } from "@/types";

type Behavior = "climb-left" | "climb-right" | "card-roll" | "card-climb";

interface Critter {
  key: number;
  creatureId: string;
  name: string | null;
  behavior: Behavior;
  style: CSSProperties;
  flip: boolean;
}

const DEFAULTS = ["reaper", "wraith", "gargoyle", "demon", "valkyrie"];
const SIZE = 56;
let k = 0;
const rand = (n: number) => Math.floor(Math.random() * n);

/** Visible content cards we can perch / climb on. */
function visibleCards(): DOMRect[] {
  const main = document.querySelector(".app-main");
  if (!main) return [];
  return Array.from(main.querySelectorAll(".card"))
    .map((el) => el.getBoundingClientRect())
    .filter((r) => r.width > 130 && r.top > 110 && r.bottom < window.innerHeight - 24 && r.height > 70);
}

/**
 * Playful overlay: a party member's mascot figure climbs a screen/card edge or
 * tumbles across the top of a card, labelled with the hunter's name. Never sits
 * at the bottom. pointer-events:none, print-hidden, reduced-motion friendly.
 */
export function Critters() {
  const [party, setParty] = useState<HunterCard[]>([]);
  const [active, setActive] = useState<Critter | null>(null);

  useEffect(() => subscribeParty(setParty, () => {}), []);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let timer: number;
    function fire() {
      const withCreature = party.filter((c) => c.creatureId && c.name);
      let creatureId: string;
      let name: string | null;
      if (withCreature.length) {
        const c = withCreature[rand(withCreature.length)];
        creatureId = c.creatureId as string;
        name = c.name;
      } else {
        creatureId = DEFAULTS[rand(DEFAULTS.length)];
        name = null;
      }

      const cards = visibleCards();
      let behavior: Behavior;
      let style: Record<string, string | number> = {};
      let flip = false;

      if (cards.length && Math.random() < 0.6) {
        const r = cards[rand(cards.length)];
        if (Math.random() < 0.55) {
          behavior = "card-roll";
          style = { left: r.left, top: r.top - SIZE + 8, "--roll": `${Math.max(24, r.width - SIZE - 6)}px` };
        } else {
          behavior = "card-climb";
          const onRight = Math.random() < 0.5;
          style = { left: onRight ? r.right - SIZE + 10 : r.left - 10, top: r.bottom - SIZE, "--climb": `${r.height - 6}px` };
          flip = onRight;
        }
      } else {
        const onLeft = Math.random() < 0.5;
        behavior = onLeft ? "climb-left" : "climb-right";
        style = onLeft ? { left: 2 } : { right: 2 };
        flip = !onLeft; // face inward on the right edge
      }

      setActive({ key: ++k, creatureId, name, behavior, style: style as CSSProperties, flip });
      timer = window.setTimeout(fire, 13000 + Math.random() * 10000);
    }
    timer = window.setTimeout(fire, 3000);
    return () => window.clearTimeout(timer);
  }, [party]);

  return (
    <div className="critters no-print" aria-hidden>
      {active && (
        <div
          key={active.key}
          className={`critter critter-${active.behavior}`}
          style={active.style}
          onAnimationEnd={() => setActive(null)}
        >
          {active.name && <span className="critter-name">{active.name}</span>}
          <div className="critter-fig" style={active.flip ? { transform: "scaleX(-1)" } : undefined}>
            {active.behavior === "card-roll" ? (
              <CreatureSprite id={active.creatureId} size={SIZE} className="critter-sprite" />
            ) : (
              <Climber id={active.creatureId} size={SIZE} className="critter-sprite" />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
