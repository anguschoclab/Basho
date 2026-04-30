/**
 * src/engine/types/crises.ts
 *
 * Defines the Interactive Crisis System imported from Studio-Boss.
 * Crises represent ongoing narrative threats that require a player's
 * interactive choice to resolve, rather than passive logging.
 */

export type CrisisType =
  | "financial_insolvency"
  | "talent_poaching"
  | "conduct_scandal"
  | "oyakata_succession"
  | "medical_emergency";

export interface CrisisOption {
  id: string;
  label: string;
  description?: string;
  impactGenerator: (world: import("./world").WorldState) => import("../core/StateImpact").StateImpact;
}

export interface ActiveCrisis {
  id: string;
  type?: CrisisType | string;
  title: string;
  description: string;
  severity?: "low" | "medium" | "high" | "critical";
  generatedAtWeek?: number;
  options: CrisisOption[];
}
