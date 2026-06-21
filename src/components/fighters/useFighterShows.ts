import { useCallback, useEffect, useRef, useState } from "react";
import { subscribeParty } from "@/api/players";
import { useSettings } from "@/app/settings";
import type { HunterCard } from "@/types";
import {
  SHOW,
  fighterForClass,
  randomFighter,
  type FighterConfig,
} from "./fighterConfig";

/** One performer: a fighter model plus the party-member name to label it with. */
export interface Cast {
  fighter: FighterConfig;
  /** A party member's name, or null for a nameless fighter (empty party). */
  name: string | null;
}

export type Show =
  // `key` is bumped each show so React fully remounts the scene (fresh start).
  | { key: number; kind: "solo"; cast: Cast }
  | { key: number; kind: "duel"; left: Cast; right: Cast };

interface Hunter {
  name: string;
  classId?: string;
}

let counter = 0;
const pick = <T,>(xs: T[]): T => xs[Math.floor(Math.random() * xs.length)];

/** A nameless random fighter — the fallback when there's no party member to use. */
const nameless = (): Cast => ({ fighter: randomFighter(), name: null });

/** Cast one hero, preferring members who've actually built a hunter. */
function soloCast(hunters: Hunter[]): Cast {
  const withClass = hunters.filter((h) => h.classId);
  const h = withClass.length ? pick(withClass) : hunters.length ? pick(hunters) : null;
  return h ? { fighter: fighterForClass(h.classId), name: h.name } : nameless();
}

/**
 * Cast two combatants for a duel. Draws up to two *distinct* party members and
 * fills any empty slot with a nameless random fighter — so a duel always has two
 * fighters even when the party has fewer than two built hunters.
 */
function duelCast(hunters: Hunter[]): { left: Cast; right: Cast } {
  const pool = [...hunters];
  const draw = (): Cast => {
    if (!pool.length) return nameless();
    const [h] = pool.splice(Math.floor(Math.random() * pool.length), 1);
    return { fighter: fighterForClass(h.classId), name: h.name };
  };
  return { left: draw(), right: draw() };
}

/** DEV-only override: `?fighters=duel` / `?fighters=solo` forces the next kind. */
function devForcedKind(): "solo" | "duel" | null {
  if (!import.meta.env.DEV) return null;
  const v = new URLSearchParams(window.location.search).get("fighters");
  return v === "duel" || v === "solo" ? v : null;
}

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
    const forced = devForcedKind();

    const start = () => {
      // Don't bother performing to a backgrounded tab — try again shortly.
      if (document.hidden) {
        restTimer = window.setTimeout(start, 30_000);
        return;
      }
      const hunters = huntersRef.current;
      const key = ++counter;
      const duel = forced ? forced === "duel" : Math.random() < SHOW.duelChance;
      setShow(
        duel
          ? { key, kind: "duel", ...duelCast(hunters) }
          : { key, kind: "solo", cast: soloCast(hunters) },
      );
      capTimer = window.setTimeout(end, SHOW.maxMs);
    };

    const end = () => {
      window.clearTimeout(capTimer);
      setShow(null);
      restTimer = window.setTimeout(start, rand(SHOW.restMinMs, SHOW.restMaxMs));
    };

    endRef.current = end;
    restTimer = window.setTimeout(start, forced ? 800 : SHOW.firstDelayMs);
    return () => {
      window.clearTimeout(restTimer);
      window.clearTimeout(capTimer);
    };
  }, [enabled]);

  const endShow = useCallback(() => endRef.current(), []);
  return { show, endShow };
}
