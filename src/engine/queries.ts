// queries.ts
// =======================================================
// Centralized State Selectors (The "Find Rikishi" Problem)
// Single-source-of-truth query functions for all engine modules.
// Eliminates duplicated state traversal/filtering across modules.
// =======================================================

import type { WorldState } from "./types/world";
import type { Rikishi } from "./types/rikishi";
import type { Heya } from "./types/heya";
import type { Oyakata } from "./types/oyakata";
import type { Division } from "./types/banzuke";
import type { StyleBias } from "./types/training";
import type { Staff } from "./types/staff";
import type { Id } from "./types/common";
import { isSekitoriDivision } from "@/constants/engine/rankDisplay";
import { getAvailableStables, getActiveRikishi as getSelectorsActiveRikishi } from "./selectors";

// ─── Single-Entity Lookups ──────────────────────────────

/**
 * Get an active rikishi by ID.
 * @returns The Rikishi, or undefined if not found in active collection.
 */
export function getRikishi(world: WorldState, id: Id): Rikishi | undefined {
  return world.rikishi.get(id);
}

/**
 * Get a rikishi by ID from either active or historical collection.
 * @returns The Rikishi, or undefined if not found.
 */
export function getRikishiAnywhere(world: WorldState, id: Id): Rikishi | undefined {
  return world.rikishi.get(id) || world.historicalRikishi?.get(id);
}

/**
 * Get a heya by ID.
 * @returns The Heya, or undefined if not found.
 */
export function getHeya(world: WorldState, id: Id): Heya | undefined {
  return world.heyas.get(id);
}

/**
 * Get the player's heya.
 * @returns The Heya, or undefined if playerHeyaId is not set or heya not found.
 */
export function getPlayerHeya(world: WorldState): Heya | undefined {
  if (!world.playerHeyaId) return undefined;
  return world.heyas.get(world.playerHeyaId);
}

/**
 * Resolve the Oyakata for a given heya, following heya → oyakataId → oyakata.
 * @returns The Oyakata, or undefined if heya or oyakata not found.
 */
export function getOyakataForHeya(world: WorldState, heyaId: Id): Oyakata | undefined {
  const heya = world.heyas.get(heyaId);
  if (!heya) return undefined;
  return world.oyakata.get(heya.oyakataId);
}

// ─── Roster Queries ─────────────────────────────────────

/**
 * Get the rikishi IDs for a heya, safely returning an empty array
 * if the heya is not found.
 */
export function getHeyaRosterIds(world: WorldState, heyaId: Id): Id[] {
  const heya = world.heyas.get(heyaId);
  return heya?.rikishiIds ?? [];
}

// Memoization cache for roster queries (cleared when week changes)
const rosterCache = new Map<string, { week: number; roster: Rikishi[] }>();
const styleBiasCache = new Map<string, { week: number; bias: StyleBias }>();

/**
 * Clear memoization caches for roster and style bias queries.
 * Should be called at the start of each new week to ensure cache invalidation.
 */
export function clearQueryCaches(): void {
  rosterCache.clear();
  styleBiasCache.clear();
}

/**
 * Get the resolved Rikishi objects for a heya's roster.
 * Skips any IDs that don't resolve (dangling references).
 * Memoized per heya per week to avoid redundant lookups.
 */
export function getHeyaRoster(world: WorldState, heyaId: Id): Rikishi[] {
  const cacheKey = `${heyaId}`;
  const cached = rosterCache.get(cacheKey);
  const currentWeek = world.week ?? 0;

  if (cached && cached.week === currentWeek) {
    return cached.roster;
  }

  const ids = getHeyaRosterIds(world, heyaId);
  const roster: Rikishi[] = [];
  for (const id of ids) {
    const r = world.rikishi.get(id);
    if (r) roster.push(r);
  }

  rosterCache.set(cacheKey, { week: currentWeek, roster });
  return roster;
}

/**
 * Count sekitori (makuuchi + juryo division) rikishi in a heya.
 */
export function getSekitoriInHeya(world: WorldState, heyaId: Id): number {
  const roster = getHeyaRoster(world, heyaId);
  let count = 0;
  for (const r of roster) {
    if (isSekitoriDivision(r.division)) count += 1;
  }
  return count;
}

/**
 * Determine the style bias (oshi / yotsu / neutral) of a heya's roster.
 * Identical logic that was duplicated in npcAI.ts and perception.ts.
 * Memoized per heya per week to avoid redundant calculations.
 */
export function getHeyaStyleBias(world: WorldState, heyaId: Id): StyleBias {
  const cacheKey = `${heyaId}`;
  const cached = styleBiasCache.get(cacheKey);
  const currentWeek = world.week ?? 0;

  if (cached && cached.week === currentWeek) {
    return cached.bias;
  }

  const roster = getHeyaRoster(world, heyaId);
  let oshi = 0;
  let yotsu = 0;
  for (const r of roster) {
    if (r.style === "oshi") oshi += 1;
    if (r.style === "yotsu") yotsu += 1;
  }
  const bias: StyleBias = oshi === yotsu ? "neutral" : oshi > yotsu ? "oshi" : "yotsu";

  styleBiasCache.set(cacheKey, { week: currentWeek, bias });
  return bias;
}

// ─── Cross-Heya Queries ─────────────────────────────────

/**
 * Get all heyas as an array (stable iteration order from the Map).
 */
export function getAllHeyas(world: WorldState): Heya[] {
  return getAvailableStables(world);
}

/**
 * Get all NPC-managed heyas (excludes the player heya).
 */
export function getNPCHeyas(world: WorldState): Heya[] {
  const playerHeyaId = world.playerHeyaId;
  const out: Heya[] = [];
  for (const heya of getAvailableStables(world)) {
    if (heya.id !== playerHeyaId) out.push(heya);
  }
  return out;
}

// ─── Rikishi Collection Queries ─────────────────────────

/**
 * Get all active rikishi as an array.
 * "Active" = present in world.rikishi (the map is the canonical set).
 * NOTE: Also available from selectors.ts for cached access.
 */
export function getActiveRikishi(world: WorldState): Rikishi[] {
  return getSelectorsActiveRikishi(world);
}

/**
 * Get all active rikishi in a specific division.
 */
export function getRikishiByDivision(world: WorldState, division: Division): Rikishi[] {
  const out: Rikishi[] = [];
  for (const r of getSelectorsActiveRikishi(world)) {
    if (r.division === division) out.push(r);
  }
  return out;
}

/**
 * Get the currently active basho state, or undefined if no basho is active.
 */
export function getCurrentBasho(world: WorldState) {
  return world.currentBasho;
}
/**
 * Get all staff associated with a specific heyaId.
 */
export function getHeyaStaff(world: WorldState, heyaId: Id): Staff[] {
  const heya = world.heyas.get(heyaId);
  const staffIds = heya?.staffIds ?? [];
  const staffList: Staff[] = [];
  for (const id of staffIds) {
    const s = world.staff.get(id);
    if (s) staffList.push(s);
  }
  return staffList;
}

/**
 * Immutably update a heya in the world, returning a new WorldState.
 * Returns the same world reference if the heyaId is not found.
 */
export function updateHeyaInWorld(world: WorldState, heyaId: Id, patch: Partial<Heya>): WorldState {
  const heya = world.heyas.get(heyaId);
  if (!heya) return world;
  const updatedHeyas = new Map(world.heyas);
  updatedHeyas.set(heyaId, { ...heya, ...patch });
  return { ...world, heyas: updatedHeyas };
}
