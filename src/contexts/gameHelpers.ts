// Game Context Helpers — autosave signal + match-day projection + impact application
import type { WorldState } from "@/engine/types/world";
import { autosave as rawAutosave } from "@/engine/saveload";
import { signalAutosave } from "@/hooks/useAutosaveIndicator";
import { getAutosaveEnabled } from "@/pages/settingsHelpers";
import { resolveImpacts } from "@/engine/core/ImpactResolver";
import { buildBashoMatchIndex } from "@/engine/bout/bashoMatchIndex";
import type { StateImpact } from "@/engine/core/StateImpact";
import type { GameState } from "./gameTypes";

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
  const index = buildBashoMatchIndex(world.currentBasho);
  return (index.get(day) ?? [])
    .map((m) => ({
      ...m,
      east: world.rikishi.get(m.eastRikishiId),
      west: world.rikishi.get(m.westRikishiId),
    }));
}

export type Reducer<S = unknown, A = { type: string; payload?: unknown }> = (
  state: S,
  action: A
) => S;

/** Compose an array of reducers. Each slice is run sequentially on the state. */
export function combineReducers<S, A>(slices: Array<Reducer<S, A>>): Reducer<S, A> {
  return (state: S, action: A) => {
    return slices.reduce((currentState, slice) => slice(currentState, action), state);
  };
}

/** Apply a single StateImpact to GameState, returning a new state with updated world. */
export function applyImpact(state: GameState, impact: StateImpact): GameState {
  if (!state.world) return state;
  return { ...state, world: resolveImpacts(state.world, [impact]) };
}

/** Apply multiple StateImpacts to GameState in order, returning a new state with updated world. */
export function applyImpacts(state: GameState, impacts: StateImpact[]): GameState {
  if (!state.world || impacts.length === 0) return state;
  return { ...state, world: resolveImpacts(state.world, impacts) };
}
