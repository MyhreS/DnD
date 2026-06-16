import { useEffect, useState } from "react";
import { subscribeParty } from "@/api/players";
import { CreatureSprite } from "@/data/CreatureSprite";
import type { HunterCard } from "@/types";

interface Critter {
  key: number;
  creatureId: string;
  name: string | null;
  type: "peek" | "walk";
  left: number;
}

// Shown for ambience when no party creatures exist yet.
const DEFAULTS = ["orc", "slime", "ghost", "bat", "crow"];
let critterKey = 0;

/**
 * Playful overlay: occasionally a party member's mascot creature peeks up from
 * the bottom edge or strolls across it, labelled with the hunter's name.
 * Tiny, pointer-events:none, hidden in print and for reduced-motion users.
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
        const c = withCreature[Math.floor(Math.random() * withCreature.length)];
        creatureId = c.creatureId as string;
        name = c.name;
      } else {
        creatureId = DEFAULTS[Math.floor(Math.random() * DEFAULTS.length)];
        name = null;
      }
      const type = Math.random() < 0.6 ? "peek" : "walk";
      const left = 10 + Math.random() * 70;
      setActive({ key: ++critterKey, creatureId, name, type, left });
      timer = window.setTimeout(fire, 17000 + Math.random() * 12000);
    }
    timer = window.setTimeout(fire, 3500);
    return () => window.clearTimeout(timer);
  }, [party]);

  return (
    <div className="critters no-print" aria-hidden>
      {active && (
        <div
          key={active.key}
          className={`critter critter-${active.type}`}
          style={active.type === "peek" ? { left: `${active.left}%` } : undefined}
          onAnimationEnd={() => setActive(null)}
        >
          {active.name && <span className="critter-name">{active.name}</span>}
          <CreatureSprite id={active.creatureId} size={44} className="critter-sprite" />
        </div>
      )}
    </div>
  );
}
