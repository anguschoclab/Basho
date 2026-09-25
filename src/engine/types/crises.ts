/**
 * src/engine/types/crises.ts
 *
 * Defines the Interactive Crisis System.
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
  /**
   * Live resolver for the option's engine effect. Present on registry
   * crises; intentionally absent on crises stored in world state
   * (`world.pendingCrisis`, `heya.activeCrisis`) — functions cannot
   * survive structuredClone/JSON persistence, so stored crises carry
   * only serializable fields and resolvers re-derive the effect.
   */
  impactGenerator?: (
    world: import("./world").WorldState,
    heyaId?: import("./common").Id
  ) => import("../core/StateImpact").StateImpact;
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
