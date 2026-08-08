import type { HunterCard } from "@/types";
import { levelForInsight } from "@/lib/insight";
import { automationFor } from "./characterAutomation";
import { levelAdjustedPool } from "./levelUpVitals";

function numberField(value: unknown): number | undefined {
  const parsed = typeof value === "number" ? value : Number.parseInt(String(value), 10);
  return Number.isFinite(parsed) ? parsed : undefined;
}

/** Apply an Insight award without ever spending accumulated Insight. */
export function insightAwardPatch(card: HunterCard, delta: number): Partial<HunterCard> {
  const insight = Math.max(0, (card.insight ?? 0) + delta);
  const level = Math.max(card.level, levelForInsight(insight));
  if (level === card.level) return { insight };

  const current = automationFor(card).fields;
  const next = automationFor({ ...card, level }).fields;
  const currentHp = card.currentHp ?? numberField(current.hpCur) ?? 0;
  const currentSanity = card.sanity ?? numberField(current.sanityCur) ?? 0;
  const currentHpPatch = levelAdjustedPool(currentHp, numberField(current.hpMax), numberField(next.hpMax), true);
  const sanityPatch = levelAdjustedPool(currentSanity, numberField(current.sanityMax), numberField(next.sanityMax), true);
  return {
    insight,
    level,
    lastSeenLevel: level,
    ...(currentHpPatch == null ? {} : { currentHp: currentHpPatch }),
    ...(sanityPatch == null ? {} : { sanity: sanityPatch }),
  };
}
