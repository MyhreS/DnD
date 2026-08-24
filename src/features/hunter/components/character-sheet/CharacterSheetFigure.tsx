import type { ComponentType } from "react";
import { Bloodbound, Brute, Deepcaller, Scout, Stalker, Warden } from "../papersheet/classFigures";

const FIGURES: Record<string, ComponentType> = {
  brute: Brute,
  scout: Scout,
  stalker: Stalker,
  deepcaller: Deepcaller,
  bloodbound: Bloodbound,
  warden: Warden,
};

export function CharacterSheetFigure({ classId, ghost = false }: { classId: string; ghost?: boolean }) {
  const Figure = FIGURES[classId] ?? Stalker;
  return <div className={`character-sheet-figure${ghost ? " is-ghost" : ""}`} aria-hidden="true"><Figure /></div>;
}
