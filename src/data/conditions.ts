import { CURRENT_CONDITIONS } from "./codex";

export interface ConditionOption { id: string; name: string }

function conditionId(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

/** Exhaustion is a level, not a flag. core-rulebook.txt [page 21]: "Each time
 * you gain Exhaustion, its level increases by 1… You die at level 6. A Long
 * Rest removes 1 level." A combatant's `conditions` is a boolean set, so the
 * six levels are offered as six ids instead of a new levelled field. The bare
 * generated `exhaustion` id stays in the name map so saved rows still read. */
const EXHAUSTION_LEVELS: ConditionOption[] = [1, 2, 3, 4, 5, 6].map((level) => ({
  id: `exhaustion-${level}`,
  name: `Exhaustion ${level}`,
}));

/** Table-tool markers that are not conditions in the sources and must stay out
 * of the generated condition list:
 * - Concentrating — a Readied Rite's concentration ([page 16]).
 * - Cover ([page 19]) — recorded as a chip rather than nudged into AC by hand. */
const EXTRA_MARKERS: ConditionOption[] = [
  { id: "concentrating", name: "Concentrating" },
  { id: "cover-half", name: "Half cover (+2)" },
  { id: "cover-three-quarters", name: "Three-quarters cover (+5)" },
  { id: "cover-total", name: "Total cover" },
];

/** Only conditions explicitly named in the four current source documents are
 * offered for new combat tracking. Historical saved ids remain displayable. */
const GENERATED: ConditionOption[] = CURRENT_CONDITIONS.map((name) => ({ id: conditionId(name), name }));

export const CONDITIONS: ConditionOption[] = [
  ...GENERATED.filter((condition) => condition.id !== "exhaustion"),
  ...EXHAUSTION_LEVELS,
  ...EXTRA_MARKERS,
];

export const CONDITION_NAME: Record<string, string> = Object.fromEntries(
  [...GENERATED, ...EXHAUSTION_LEVELS, ...EXTRA_MARKERS].map((condition) => [condition.id, condition.name]),
);
