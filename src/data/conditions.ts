import { CURRENT_CONDITIONS } from "./codex";

export interface ConditionOption { id: string; name: string }

function conditionId(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

/** Only conditions explicitly named in the four current source documents are
 * offered for new combat tracking. Historical saved ids remain displayable. */
export const CONDITIONS: ConditionOption[] = CURRENT_CONDITIONS.map((name) => ({ id: conditionId(name), name }));
export const CONDITION_NAME: Record<string, string> = Object.fromEntries(CONDITIONS.map((condition) => [condition.id, condition.name]));

export function conditionName(id: string): string {
  return CONDITION_NAME[id] ?? id.split(/[-_\s]+/).filter(Boolean).map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(" ");
}
