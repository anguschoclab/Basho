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
import type { Style } from "./types/combat";
import type { Id } from "./types/common";
import { getAvailableStables, getActiveRikishi as getSelectorsActiveRikishi } from "./selectors";

// ─── Single-Entity Lookups ──────────────────────────────

/**
 * Get a rikishi by ID.
 * @returns The Rikishi, or undefined if not found.
 */
export function getRikishi(world: WorldState, id: Id): Rikishi | undefined {
  return world.rikishi.get(id);
}

/**
 * Get a heya by ID.
 * @returns The Heya, or undefined if not found.
 */
export function getHeya(world: WorldState, id: Id): Heya | undefined {
  return world.heyas.get(id);
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

/**
 * Get the resolved Rikishi objects for a heya's roster.
 * Skips any IDs that don't resolve (dangling references).
 */
export function getHeyaRoster(world: WorldState, heyaId: Id): Rikishi[] {
  const ids = getHeyaRosterIds(world, heyaId);
  const roster: Rikishi[] = [];
  for (const id of ids) {
    const r = world.rikishi.get(id);
    if (r) roster.push(r);
  }
  return roster;
}

/**
 * Count foreign-born (non-Japanese) rikishi in a heya.
 */
export function getForeignCountInHeya(world: WorldState, heyaId: Id): number {
  let count = 0;
  for (const r of getSelectorsActiveRikishi(world)) {
    if (r.heyaId !== heyaId) continue;
    if ((r.nationality || "Japan") !== "Japan") count += 1;
  }
  return count;
}

/**
 * Count sekitori (makuuchi + juryo division) rikishi in a heya.
 */
export function getSekitoriInHeya(world: WorldState, heyaId: Id): number {
  const roster = getHeyaRoster(world, heyaId);
  let count = 0;
  for (const r of roster) {
    if (r.division === "makuuchi" || r.division === "juryo") count += 1;
  }
  return count;
}

/**
 * Determine the style bias (oshi / yotsu / neutral) of a heya's roster.
 * Identical logic that was duplicated in npcAI.ts and perception.ts.
 */
export function getHeyaStyleBias(world: WorldState, heyaId: Id): Style | "neutral" {
  const roster = getHeyaRoster(world, heyaId);
  let oshi = 0;
  let yotsu = 0;
  for (const r of roster) {
    if (r.style === "oshi") oshi += 1;
    if (r.style === "yotsu") yotsu += 1;
  }
  if (oshi === yotsu) return "neutral";
  return oshi > yotsu ? "oshi" : "yotsu";
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
