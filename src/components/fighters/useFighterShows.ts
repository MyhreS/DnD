import { useCallback, useEffect, useRef, useState } from "react";
import { subscribeParty } from "@/api/players";
import { useSettings } from "@/app/settings";
import type { HunterCard } from "@/types";
import { FIGHTERS, SHOW, fighterForClass, type FighterConfig } from "./fighterConfig";

export interface Show {
  /** Bumped each show so React fully remounts the scene (fresh choreography). */
  key: number;
  /** A party member to label the fighter with, if we have one. */
  name: string | null;
  /** Which fighter performs this show (matched to the member's class). */
  fighter: FighterConfig;
}

interface Hunter {
  name: string;
  classId?: string;
}

let counter = 0;
const pick = <T,>(xs: T[]): T => xs[Math.floor(Math.random() * xs.length)];

/**
 * Drives the occasional 3D fighter show. Returns the active show (or null) plus
 * `endShow`, which the scene calls when its choreography finishes. While a show
 * is null the caller renders nothing — so the WebGL canvas is unmounted and
 * costs no GPU/battery during the long rest between shows.
 */
export function useFighterShows(): { show: Show | null; endShow: () => void } {
  const [show, setShow] = useState<Show | null>(null);
  const enabled = useSettings((s) => s.fighters);
  const huntersRef = useRef<Hunter[]>([]);
  const endRef = useRef<() => void>(() => {});

  useEffect(
    () =>
      subscribeParty((party: HunterCard[]) => {
        // Prefer members who have actually built a hunter (so we can match their
        // class); fall back to anyone with a name.
        huntersRef.current = party
          .filter((c) => c.name)
          .map((c) => ({ name: c.name as string, classId: c.classId }));
      }, () => {}),
    [],
  );

  useEffect(() => {
    // Turned off in Settings, or the user prefers reduced motion: never play,
    // and stop any show that's currently on screen.
    if (!enabled || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setShow(null);
      return;
    }

    let restTimer = 0;
    let capTimer = 0;
    const rand = (a: number, b: number) => a + Math.random() * (b - a);

    const start = () => {
      // Don't bother performing to a backgrounded tab — try again shortly.
      if (document.hidden) {
        restTimer = window.setTimeout(start, 30_000);
        return;
      }
      // Pick a hunter and send their class's fighter on stage, with their name.
      // With no party data (e.g. preview), just send a random fighter.
      const hunters = huntersRef.current;
      const withClass = hunters.filter((h) => h.classId);
      const hunter = withClass.length ? pick(withClass) : hunters.length ? pick(hunters) : null;
      setShow({
        key: ++counter,
        name: hunter?.name ?? null,
        fighter: hunter ? fighterForClass(hunter.classId) : pick(FIGHTERS),
      });
      capTimer = window.setTimeout(end, SHOW.maxMs);
    };

    const end = () => {
      window.clearTimeout(capTimer);
      setShow(null);
      restTimer = window.setTimeout(start, rand(SHOW.restMinMs, SHOW.restMaxMs));
    };

    endRef.current = end;
    restTimer = window.setTimeout(start, SHOW.firstDelayMs);
    return () => {
      window.clearTimeout(restTimer);
      window.clearTimeout(capTimer);
    };
  }, [enabled]);

  const endShow = useCallback(() => endRef.current(), []);
  return { show, endShow };
}
