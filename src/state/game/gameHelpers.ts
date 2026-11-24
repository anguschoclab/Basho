// Game Context Helpers — autosave signal + match-day projection + impact application
import type { WorldState } from "@/engine/types/world";
import { autosave as rawAutosave } from "@/engine/persistence/saveload";
import { signalAutosave } from "@/hooks/useAutosaveIndicator";
import { getAutosaveEnabled } from "@/pages/settingsHelpers";
import { resolveImpacts } from "@/engine/core/ImpactResolver";
import { buildBashoMatchIndex } from "@/engine/bout/bashoMatchIndex";
import type { StateImpact } from "@/engine/core/StateImpact";
import type { GameState } from "@/state/game/gameTypes";

// Module-level state to track autosave progress and prevent overlaps
let saveInProgress = false;
let pendingWorld: WorldState | null = null;
let doneTimeoutId: ReturnType<typeof setTimeout> | null = null;
let idleTimeoutId: ReturnType<typeof setTimeout> | null = null;
let debounceTimerId: ReturnType<typeof setTimeout> | null = null;
let staleTimerId: ReturnType<typeof setTimeout> | null = null;
let scheduledWorld: WorldState | null = null;

// Trailing-edge debounce: serializing the world (JSON.stringify ~10MB +
// LZ compress + 3-slot rotation) is a synchronous main-thread cost, so a
// save on every world change stalls each tick. Changes coalesce into one
// write ~1.5s after activity settles; the staleness cap forces a write
// during continuous churn so the autosave never falls indefinitely behind.
const AUTOSAVE_DEBOUNCE_MS = 1500;
const AUTOSAVE_STALENESS_CAP_MS = 20_000;

function performSave(world: WorldState): boolean {
  // If a save is already in progress, don't drop the new world — stash it so
  // the trailing flush persists the latest state once the lock clears.
  // Dropping it silently would leave the autosave permanently stale when this
  // update is the last one of a burst (e.g. the post-basho publish at END_BASHO).
  if (saveInProgress) {
    pendingWorld = world;
    return false;
  }

  saveInProgress = true;
  signalAutosave("saving");

  // Wall-clock lives here, in the UI layer — engine code may not call
  // new Date() (dateArithmeticGuard), so callers must supply the stamp.
  const ok = rawAutosave(world, new Date().toISOString());

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
    if (pendingWorld) {
      const flushed = pendingWorld;
      pendingWorld = null;
      autosaveWithSignal(flushed);
    }
  }, 2000);

  return ok;
}

function flushScheduledAutosave(): boolean {
  if (debounceTimerId) {
    clearTimeout(debounceTimerId);
    debounceTimerId = null;
  }
  if (staleTimerId) {
    clearTimeout(staleTimerId);
    staleTimerId = null;
  }
  const world = scheduledWorld;
  scheduledWorld = null;
  if (!world) return false;
  return performSave(world);
}

/**
 * Autosave with visual indicator signal — respects user setting, prevents
 * overlaps. Default calls are debounced: the latest world is written ~1.5s
 * after activity settles (a staleness cap forces a write under sustained
 * churn). `{ immediate: true }` saves synchronously — for explicit user saves.
 */
export function autosaveWithSignal(world: WorldState, opts?: { immediate?: boolean }): boolean {
  if (!getAutosaveEnabled()) return false;

  scheduledWorld = world;

  if (opts?.immediate) return flushScheduledAutosave();

  // Trailing debounce — resets on every call so the write lands once activity
  // settles. The staleness cap is armed once per pending period so nonstop
  // churn still produces a periodic save.
  if (debounceTimerId) clearTimeout(debounceTimerId);
  debounceTimerId = setTimeout(flushScheduledAutosave, AUTOSAVE_DEBOUNCE_MS);
  if (!staleTimerId) {
    staleTimerId = setTimeout(flushScheduledAutosave, AUTOSAVE_STALENESS_CAP_MS);
  }
  return true;
}

/** Get matches for the current basho day with east/west rikishi attached */
export function getMatchesForDay(world: WorldState | null) {
  if (!world?.currentBasho) return [];

  const day = world.currentBasho.day;
  const index = buildBashoMatchIndex(world.currentBasho);
  return (index.get(day) ?? []).map((m) => ({
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
export function applyImpactToGameState(state: GameState, impact: StateImpact): GameState {
  if (!state.world) return state;
  return { ...state, world: resolveImpacts(state.world, [impact]) };
}

/** Apply multiple StateImpacts to GameState in order, returning a new state with updated world. */
export function applyImpacts(state: GameState, impacts: StateImpact[]): GameState {
  if (!state.world || impacts.length === 0) return state;
  return { ...state, world: resolveImpacts(state.world, impacts) };
}
