/**
 * @fileoverview economics_awards.ts
 * Handles specific economic calculations for Kinboshi stipends and Special Prizes (Sanshō).
 * Designed to be imported by both the simulation tick and UI rendering layers.
 */

import { SIMULATION_CONFIG } from "./core/SimulationConfig";

// Assumptions based on canonical world logic
// Note: Constants now centralized in SimulationConfig.ts

export interface SalaryBreakdown {
  base: number;
  kinboshiBonus: number;
  total: number;
}

/**
 * Calculates the legible breakdown of a Rikishi's salary.
 * This ensures the UI can explain *why* a Rikishi is earning a specific amount.
 * @param baseSalary - The canonical base salary calculated from rank
 * @param division - The current division of the Rikishi
 * @param kinboshiCount - The historical number of Kinboshi earned
 * @returns SalaryBreakdown object
 */
export function getSalaryBreakdown(
  baseSalary: number,
  division: string,
  kinboshiCount: number
): SalaryBreakdown {
  let kinboshiBonus = 0;

  // Kinboshi stipends are strictly only paid out while competing in the top division.
  // Note: Division names are lowercase ('makuuchi') in the engine.
  if (division.toLowerCase() === "makuuchi" && kinboshiCount > 0) {
    kinboshiBonus = kinboshiCount * SIMULATION_CONFIG.prizes.kinboshiStipend;
  }

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
