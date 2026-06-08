import type { Rikishi } from "../../types/rikishi";
import type { BoutContext } from "../boutUtils";
import type { EngineStateV2 } from "../../types/combat-spatial";
import { initPhysicalBody } from "../boutSpatial";

export function initEngineStateV2(bout: BoutContext, east: Rikishi, west: Rikishi): EngineStateV2 {
  void bout; // id/day used in seed; kept for signature clarity
  return {
    tick: 0,
    phase: { tag: "approach" },
    east: initPhysicalBody(east, "east"),
    west: initPhysicalBody(west, "west"),
    tachiaiWinner: "east", // placeholder; set in resolveTachiaiV2
    grappleState: {
      east: { rightHand: "outside", leftHand: "outside", depth: "standard" },
      west: { rightHand: "outside", leftHand: "outside", depth: "standard" },
      gripAdvantage: "neutral",
    },
  };
}
