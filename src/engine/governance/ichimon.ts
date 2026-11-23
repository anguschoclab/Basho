/**
 * ichimon.ts — WS-7 clan defection/migration.
 *
 * A heya's clan membership follows the lineage of the elder stock its
 * master holds: a succession that seats an oyakata whose share belongs to
 * another clan CAN realign the stable (the Takanohana-era realignments are
 * the model). Voluntary defection is possible but politically expensive —
 * the clan is a mutual-aid and voting bloc, so leaving costs capital and
 * reputation. The same service drives the player command and the NPC
 * succession path — parity by construction.
 */
import type { WorldState } from "@/engine/types/world";
import type { Id } from "@/engine/types/common";
import type { IchimonName } from "@/engine/types/economy";
import type { StateImpact } from "@/engine/core/StateImpact";
import { createImpactBuilder } from "@/engine/core/ImpactBuilder";
import { getHeya } from "@/engine/core/queries";
import {
  ICHIMON_DEFECTION_CAPITAL_COST,
  ICHIMON_DEFECTION_REPUTATION_COST,
} from "@/constants/engine/governance";

/**
 * Move a heya to a different ichimon. Applies the political cost
 * (capital + reputation) and records a headline ruling.
 */
export function changeHeyaIchimon(
  world: WorldState,
  heyaId: Id,
  target: IchimonName
): StateImpact {
  const builder = createImpactBuilder("changeHeyaIchimon");
  const heya = getHeya(world, heyaId);
  if (!heya || heya.ichimon === target) return builder.build();

  builder.updateHeya(heyaId, {
    ichimon: target,
    politicalCapital: Math.max(0, (heya.politicalCapital ?? 50) - ICHIMON_DEFECTION_CAPITAL_COST),
    reputation: Math.max(0, (heya.reputation ?? 50) - ICHIMON_DEFECTION_REPUTATION_COST),
  });
  builder.logEvent(
    "GOVERNANCE_RULING",
    "discipline",
    {
      incident: "ichimon_defection",
      description: `${heya.name} leaves the ${heya.ichimon ?? "unaffiliated"} fold and joins the ${target} ichimon — a contentious clan realignment.`,
    },
    { heyaId, importance: "headline" }
  );
  return builder.build();
}
