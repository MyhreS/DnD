import { useCallback, useEffect, useRef, useState } from "react";
import { subscribeParty } from "@/api/players";
import type { HunterCard } from "@/types";
import { SHOW } from "./fighterConfig";

export interface Show {
  /** Bumped each show so React fully remounts the scene (fresh choreography). */
  key: number;
  /** A party member to label the fighter with, if we have one. */
  name: string | null;
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
  const namesRef = useRef<string[]>([]);
  const endRef = useRef<() => void>(() => {});

  useEffect(
    () =>
      subscribeParty((party: HunterCard[]) => {
        namesRef.current = party.map((c) => c.name).filter((n): n is string => !!n);
      }, () => {}),
    [],
  );

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let restTimer = 0;
    let capTimer = 0;
    const rand = (a: number, b: number) => a + Math.random() * (b - a);

    const start = () => {
      // Don't bother performing to a backgrounded tab — try again shortly.
      if (document.hidden) {
        restTimer = window.setTimeout(start, 30_000);
        return;
      }
      const names = namesRef.current;
      setShow({ key: ++counter, name: names.length ? pick(names) : null });
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
  }, []);

  const endShow = useCallback(() => endRef.current(), []);
  return { show, endShow };
}
