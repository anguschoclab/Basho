/**
 * types.ts
 * ========
 * Shared types for monthly boundary phase modules.
 */

import type { Loan } from "@/engine/types/economy";
import type { FacilitiesBand } from "@/engine/types/narrative";

export type HeyaUpdates = Partial<{
  funds: number;
  runwayBand: "secure" | "comfortable" | "tight" | "critical" | "desperate";
  activeLoans: Loan[];
  facilities: { training: number; recovery: number; nutrition: number };
  facilitiesBand: FacilitiesBand;
}>;
