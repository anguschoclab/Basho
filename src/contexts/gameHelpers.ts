// Game Context Helpers — autosave signal + match-day projection
import type { WorldState } from "@/engine/types/world";
import { autosave as rawAutosave } from "@/engine/saveload";
import { signalAutosave } from "@/hooks/useAutosaveIndicator";
import { getAutosaveEnabled } from "@/pages/settingsHelpers";

// Module-level state to track autosave progress and prevent overlaps
let saveInProgress = false;
let doneTimeoutId: ReturnType<typeof setTimeout> | null = null;
let idleTimeoutId: ReturnType<typeof setTimeout> | null = null;

/** Autosave with visual indicator signal — respects user setting, prevents overlaps */
export function autosaveWithSignal(world: WorldState): boolean {
  if (!getAutosaveEnabled()) return false;

  // Debounce: if a save is already in progress, skip this one
  if (saveInProgress) return false;

  saveInProgress = true;
  signalAutosave("saving");

  const ok = rawAutosave(world);

  // Clear any existing timeouts to prevent signal overlap
  if (doneTimeoutId) clearTimeout(doneTimeoutId);
  if (idleTimeoutId) clearTimeout(idleTimeoutId);

  // Set new timeouts
  doneTimeoutId = setTimeout(() => {
    signalAutosave("done");
  }, 50);

  idleTimeoutId = setTimeout(() => {
    signalAutosave("idle");
    saveInProgress = false;
  }, 2000);

  return ok;
}

/** Get matches for the current basho day with east/west rikishi attached */
export function getMatchesForDay(world: WorldState | null) {
  if (!world?.currentBasho) return [];

  const day = world.currentBasho.day;
  return world.currentBasho.matches
    .filter((m) => m.day === day)
    .map((m) => ({
      ...m,
      east: world.rikishi.get(m.eastRikishiId),
      west: world.rikishi.get(m.westRikishiId),
    }));
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Reducer<S = any, A = any> = (state: S, action: A) => S;

/** Compose an array of reducers. Each slice is run sequentially on the state. */
export function combineReducers<S, A>(slices: Array<Reducer<S, A>>): Reducer<S, A> {
  return (state: S, action: A) => {
    return slices.reduce((currentState, slice) => slice(currentState, action), state);
  };
}
