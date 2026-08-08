import { shouldApplyIdleUpdate } from "../src/app/pwaUpdatePolicy";

function expect(actual: boolean, expected: boolean, label: string): void {
  if (actual !== expected) throw new Error(`${label}: expected ${expected}, received ${actual}`);
}

const minute = 60_000;
expect(shouldApplyIdleUpdate({ now: 5 * minute, lastActivityAt: 1, hiddenAt: null, isVisible: true }, 5 * minute, minute), false, "active app before idle boundary");
expect(shouldApplyIdleUpdate({ now: 5 * minute, lastActivityAt: 0, hiddenAt: null, isVisible: true }, 5 * minute, minute), true, "visible app at idle boundary");
expect(shouldApplyIdleUpdate({ now: minute, lastActivityAt: 0, hiddenAt: 1, isVisible: false }, 5 * minute, minute), false, "background app before boundary");
expect(shouldApplyIdleUpdate({ now: 2 * minute, lastActivityAt: 0, hiddenAt: minute, isVisible: false }, 5 * minute, minute), true, "background app at boundary");
expect(shouldApplyIdleUpdate({ now: 10 * minute, lastActivityAt: 0, hiddenAt: null, isVisible: false }, 5 * minute, minute), false, "missing background timestamp");

console.log("PWA update policy tests passed.");
