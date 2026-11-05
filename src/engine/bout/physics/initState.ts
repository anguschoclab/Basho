import type { Rikishi } from "@/engine/types/rikishi";
import type { BoutContext } from "@/engine/bout/boutUtils";
import type { EngineStateV2 } from "@/engine/types/combat-spatial";
import { initPhysicalBody } from "@/engine/bout/boutSpatial";

/**
 * Build the initial `EngineStateV2` for a physics-driven bout: both wrestlers
 * placed at the shikiri-sen in `approach` phase. `tachiaiWinner` is a
 * placeholder — the real winner is set by `resolveTachiaiV2` after the clash.
 */
export function initEngineStateV2(bout: BoutContext, east: Rikishi, west: Rikishi): EngineStateV2 {
  void bout; // id/day used in seed; kept for signature clarity
  return {
    tick: 0,
    phase: { tag: "approach" },
    east: initPhysicalBody(east, "east"),
    west: initPhysicalBody(west, "west"),
    tachiaiWinner: "east", // placeholder; set in resolveTachiaiV2
    momentumScore: 0,
    prevDominantSide: null,
    inBoutInjury: null,
    grappleState: {
      east: { rightHand: "outside", leftHand: "outside", depth: "standard" },
      west: { rightHand: "outside", leftHand: "outside", depth: "standard" },
      gripAdvantage: "neutral",
    },
  };
}
