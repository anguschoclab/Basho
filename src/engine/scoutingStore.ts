// scoutingStore.ts
// Player Knowledge Store — persistent scouting memory across screens/bouts.
// Keeps fog-of-war meaningful by persisting observations, investment, and decay.
// Designed to be engine-only (UI reads via accessors).

import type { WorldState, Id, Rikishi } from "./types";
import {
  type ScoutedRikishi,
  type ScoutingInvestment,
  createScoutedView,
  recordObservation,
  applyScoutingDecay,
  refreshTruthSnapshot
} from "./scouting";

/**
 * Where scouting data lives in the WorldState.
 * This is intentionally defensive because your WorldState shape may vary.
 *
 * Expected shape (recommended):
 * world.playerKnowledge = {
 *   scouting: Record<string, ScoutedRikishi>
 * }
 */
function ensureScoutingTable(world: WorldState): Record<string, ScoutedRikishi> {
  const w: any = world as any;
  if (!w.playerKnowledge) w.playerKnowledge = {};
  if (!w.playerKnowledge.scouting) w.playerKnowledge.scouting = {};
  return w.playerKnowledge.scouting as Record<string, ScoutedRikishi>;
}

function getWorldWeek(world: WorldState): number {
  const w: any = world as any;
  // support multiple schemas
  if (typeof w.week === "number") return w.week;
  if (typeof w.currentWeek === "number") return w.currentWeek;
  if (typeof w.time?.week === "number") return w.time.week;
  return 0;
}

function getPlayerHeyaId(world: WorldState): string | null {
  const w: any = world as any;
  return (w.playerHeyaId ?? w.playerHeya ?? w.player?.heyaId ?? null) as string | null;
}

function getRikishi(world: WorldState, rikishiId: string): Rikishi | null {
  const w: any = world as any;
  const map = w.rikishi;
  if (map && typeof map.get === "function") return map.get(rikishiId) || null;
  if (map && typeof map === "object") return map[rikishiId] || null;
  return null;
}

/**
 * Get or create a ScoutedRikishi entry for a given rikishi.
 * - Owned rikishi are always 100% intel
 * - Non-owned start at baseline observation=0 + investment=none (unless set)
 */
export function getOrCreateScouted(world: WorldState, rikishiId: Id, baselineObservation: number = 0): ScoutedRikishi {
  const table = ensureScoutingTable(world);
  const existing = table[rikishiId];
  const currentWeek = getWorldWeek(world);
  const playerHeyaId = getPlayerHeyaId(world);

  const truth = getRikishi(world, rikishiId);
  if (!truth) {
    // Create a minimal placeholder entry to avoid crashes (should be rare)
    const placeholder: ScoutedRikishi = {
      rikishiId,
      publicInfo: {
        id: rikishiId,
        shikona: "Unknown",
        rank: "unknown",
        height: 0,
        weight: 0
      },
      isOwned: false,
      timesObserved: 0,
      lastObservedWeek: currentWeek,
      scoutingInvestment: "none",
      scoutingLevel: 0,
      attributes: { power: 0, speed: 0, balance: 0, technique: 0, aggression: 0, experience: 0 }
    };
    table[rikishiId] = existing ?? placeholder;
    return table[rikishiId];
  }

  if (existing) {
    // Keep public info and snapshot fresh (safe / prevents drift)
    table[rikishiId] = refreshTruthSnapshot(existing, truth);
    return table[rikishiId];
  }

  const isOwned = (truth as any).heyaId === playerHeyaId;
  const obs = isOwned ? 100 : Math.max(0, baselineObservation);

  const created = createScoutedView(truth, playerHeyaId, obs, "none", currentWeek);
  table[rikishiId] = created;
  return created;
}

/**
 * Set scouting investment for a target.
 * This should typically be driven by UI actions / economy spend.
 */
export function setScoutingInvestment(world: WorldState, rikishiId: Id, investment: ScoutingInvestment): ScoutedRikishi {
  const table = ensureScoutingTable(world);
  const entry = getOrCreateScouted(world, rikishiId);

  // Rebuild with updated investment but preserve observations + timestamps
  const currentWeek = getWorldWeek(world);
  const playerHeyaId = getPlayerHeyaId(world);

  const truth = getRikishi(world, rikishiId);
  if (!truth) return entry;

  const rebuilt = createScoutedView(truth, playerHeyaId, entry.timesObserved, investment, currentWeek);
  // Preserve lastObservedWeek if it's newer than currentWeek (shouldn't happen, but safe)
  rebuilt.lastObservedWeek = Math.max(entry.lastObservedWeek, currentWeek);

  table[rikishiId] = rebuilt;
  return rebuilt;
}

/**
 * Record that the player watched a bout involving these rikishi.
 * Call this when:
 * - a bout is simulated AND the player watched it
 * - OR the bout is a player bout (auto-observed)
 */
export function observeBout(world: WorldState, eastId: Id, westId: Id): void {
  const table = ensureScoutingTable(world);
  const currentWeek = getWorldWeek(world);

  const east = getOrCreateScouted(world, eastId);
  const west = getOrCreateScouted(world, westId);

  table[eastId] = recordObservation(east, currentWeek);
  table[westId] = recordObservation(west, currentWeek);
}

/**
 * Apply scouting decay across all stored entries.
 * Call once per week tick (between basho weeks, training weeks, etc.).
 */
export function applyWeeklyScoutingDecay(world: WorldState): void {
  const table = ensureScoutingTable(world);
  const currentWeek = getWorldWeek(world);

  for (const id of Object.keys(table)) {
    table[id] = applyScoutingDecay(table[id], currentWeek);
  }
}

/**
 * Convenience: get a scouting % level for UI badges.
 */
export function getScoutingLevel(world: WorldState, rikishiId: Id, baselineObservation: number = 0): number {
  return getOrCreateScouted(world, rikishiId, baselineObservation).scoutingLevel;
}

/**
 * Convenience: ensure scouting entries exist for a whole list (e.g. banzuke page).
 */
export function warmScoutingForRikishiList(world: WorldState, rikishiIds: Id[], baselineObservation: number = 0): void {
  for (const id of rikishiIds) getOrCreateScouted(world, id, baselineObservation);
}
