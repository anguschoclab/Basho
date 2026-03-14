// Game Context Helpers — autosave signal + match-day projection
import type { WorldState } from "@/engine/types/world";
import { autosave as rawAutosave } from "@/engine/saveload";
import { signalAutosave } from "@/hooks/useAutosaveIndicator";
import { getAutosaveEnabled } from "@/pages/SettingsPage";

/** Autosave with visual indicator signal — respects user setting */
export function autosaveWithSignal(world: WorldState): boolean {
  if (!getAutosaveEnabled()) return false;
  signalAutosave("saving");
  const ok = rawAutosave(world);
  setTimeout(() => signalAutosave("done"), 50);
  setTimeout(() => signalAutosave("idle"), 2000);
  return ok;
}

/** Get matches for the current basho day with east/west rikishi attached */
export function getMatchesForDay(world: WorldState | null) {
  if (!world?.currentBasho) return [];

  const day = world.currentBasho.day;
  return world.currentBasho.matches
    .filter(m => m.day === day)
    .map(m => ({
      ...m,
      east: world.rikishi.get(m.eastRikishiId),
      west: world.rikishi.get(m.westRikishiId),
    }));
}
