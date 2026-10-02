/**
 * @fileoverview economics_awards.ts
 * Handles specific economic calculations for Kinboshi stipends and Special Prizes (Sanshō).
 * Designed to be imported by both the simulation tick and UI rendering layers.
 */

import { SIMULATION_CONFIG } from "./core/SimulationConfig";
import {
  MOCHIKYUKIN_POINT_VALUE,
  MOCHIKYUKIN_RANK_FLOORS,
} from "../constants/engine/economic";

// Assumptions based on canonical world logic
// Note: Constants now centralized in SimulationConfig.ts

export interface SalaryBreakdown {
  base: number;
  /**
   * Per-basho mochikyukin annuity (¥): effective points × ¥4,000, matching
   * payMochikyukinBonuses (paid every second month while sekitori). Includes
   * points from all sources — kinboshi, kachi-nokori, yusho, the debut seed —
   * plus rank floors for senior rikishi.
   */
  kinboshiBonus: number;
  total: number;
}

/**
 * Calculates the legible breakdown of a Rikishi's income.
 * @param baseSalary - The canonical base salary calculated from rank
 * @param division - The current division of the Rikishi (annuity pays to
 *   sekitori only: makuuchi + juryo; it freezes below juryo)
 * @param mochikyukinPoints - Accumulated career mochikyukin points
 *   (achievements.mochikyukinPoints — includes the ¥3 debut seed)
 * @param rank - Rank key for MOCHIKYUKIN_RANK_FLOORS (yokozuna floor ¥150
 *   points exceeds what a modest kinboshi tally alone earns)
 * @returns SalaryBreakdown object
 */
export function getSalaryBreakdown(
  baseSalary: number,
  division: string,
  mochikyukinPoints: number,
  rank?: string
): SalaryBreakdown {
  const div = division.toLowerCase();
  const isSekitori = div === "makuuchi" || div === "juryo";

  const effectivePoints = isSekitori
    ? Math.max(mochikyukinPoints, MOCHIKYUKIN_RANK_FLOORS[rank ?? ""] ?? 0)
    : 0;
  const kinboshiBonus = effectivePoints * MOCHIKYUKIN_POINT_VALUE;

  return {
    base: baseSalary,
    kinboshiBonus,
    total: baseSalary + kinboshiBonus,
  };
}

/**
 * Generates the financial transaction ledger entry for a Sansho prize.
 */
export function generateSanshoLedgerEntry(
  rikishiName: string,
  prizeType: "Shukun" | "Kanto" | "Gino"
) {
  const prizeNames = {
    Shukun: "Outstanding Performance",
    Kanto: "Fighting Spirit",
    Gino: "Technique",
  };

  return {
    amount: SIMULATION_CONFIG.prizes.specialPrize,
    description: `Special Prize (${prizeNames[prizeType]}): ${rikishiName}`,
    category: "Prize Money",
  };
}
