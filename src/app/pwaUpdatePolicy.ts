export interface PwaIdleState {
  now: number;
  lastActivityAt: number;
  hiddenAt: number | null;
  isVisible: boolean;
}

export function shouldApplyIdleUpdate(
  state: PwaIdleState,
  idleRefreshMs: number,
  backgroundRefreshMs: number,
): boolean {
  if (state.isVisible) return state.now - state.lastActivityAt >= idleRefreshMs;
  return state.hiddenAt != null && state.now - state.hiddenAt >= backgroundRefreshMs;
}
