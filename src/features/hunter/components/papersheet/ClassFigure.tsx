import type { ComponentType } from "react";
import { SheetValue } from "./sheetPrimitives";
import { CLASSES } from "@/data/classes";
import { Brute, Scout, Stalker, Deepcaller, Bloodbound, Warden } from "./classFigures";

const FIGURES: Record<string, ComponentType> = {
  brute: Brute,
  scout: Scout,
  stalker: Stalker,
  deepcaller: Deepcaller,
  bloodbound: Bloodbound,
  warden: Warden,
};

/** The little animated hunter under the eye emblem: one idle line-art pose
 * per class, matched from the sheet's class line (case-insensitively, so
 * legacy free-typed values still count). No class → nothing. Print hides it
 * and the height is fixed (papersheet.css), so page 1 never grows. */
export function ClassFigure() {
  return (
    <SheetValue f="class">
      {(v) => {
        const name = typeof v === "string" ? v.trim().toLowerCase() : "";
        const cls = name ? CLASSES.find((c) => c.name.toLowerCase() === name) : undefined;
        const Figure = cls ? FIGURES[cls.id] : undefined;
        if (!Figure) return null;
        return (
          <div className="classfig" data-step="1" aria-hidden="true">
            <Figure />
          </div>
        );
      }}
    </SheetValue>
  );
}
