/**
 * File Name: src/engine/welfare.ts
 * Status: REFACTORED / SERVICE-ORIENTED
 * 
 * This is now a barrel file that orchestrates the Welfare & Compliance system.
 * Delegated to specialized sub-services in src/engine/systems/welfare/.
 * 
 * Goal: No monoliths, high-fidelity modularity.
 */

import { WelfareService } from "./systems/welfare/WelfareService";
import { WorldState } from "./types/world";
import type { Id } from "./types/common";
import type { DietRegimen, WelfareState } from "./types/economy";
import type { Heya } from "./types/heya";

// --- AUTHORITATIVE DELEGATION ---
export * from "./systems/welfare/WelfareCalculations";
export * from "./systems/welfare/WelfareService";

/**
 * Weekly tick for welfare (Legacy wrapper).
 */
export function tickWeekWelfare(world: WorldState): void {
  WelfareService.applyWeeklyWelfareTick(world);
}

/**
 * Set active diet for a heya (Legacy wrapper).
 */
export function setHeyaDiet(world: WorldState, heyaId: Id, diet: DietRegimen): void {
  WelfareService.setHeyaDiet(world, heyaId, diet);
}

/**
 * Ensure heya welfare state exists (Legacy wrapper).
 */
export function ensureHeyaWelfareState(heya: Heya): WelfareState {
  return WelfareService.ensureHeyaWelfareState(heya);
}

// Re-export type definitions for backward compatibility
export type { WelfareState, ComplianceState, DietRegimen } from "./types/economy";
