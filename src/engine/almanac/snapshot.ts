import type { WorldState } from "../types/world";
import type { AlmanacSnapshot } from "./types";
import type { MovementEvent } from "../types/banzuke";
import type { Rank } from "../types/banzuke";
import { getRikishi } from "../queries";

export function buildAlmanacSnapshot(
  world: WorldState,
  movements?: MovementEvent[]
): AlmanacSnapshot | null {
  if (!world.currentBasho) return null;

  const basho = world.currentBasho;

  let makuuchiRikishiCount = 0;
  let totalMakuuchiWins = 0;
  let makuuchiInjuryCount = 0;

  for (const rikishiId of world.activeRikishiIds) {
    const r = getRikishi(world, rikishiId);
    if (!r) continue;
    if (r.division === "makuuchi") {
      makuuchiRikishiCount++;
      totalMakuuchiWins += r.currentBashoWins ?? 0;
      if (r.injured) {
        makuuchiInjuryCount++;
      }
    }
  }

  let totalBouts = 0;
  for (const m of basho.matches) {
    if (m.result) {
      totalBouts++;
    }
  }

  const promotions: AlmanacSnapshot["promotions"] = [];
  const demotions: AlmanacSnapshot["demotions"] = [];
  const retirements: AlmanacSnapshot["retirements"] = [];

  if (movements) {
    for (const evt of movements) {
      const r = getRikishi(world, evt.rikishiId);
      const shikona = r?.shikona ?? "Unknown";
      if (evt.kind === "promotion") {
        promotions.push({
          rikishiId: evt.rikishiId,
          shikona,
          newRank: evt.to as Rank,
        });
      } else if (evt.kind === "demotion") {
        demotions.push({
          rikishiId: evt.rikishiId,
          shikona,
          newRank: evt.to as Rank,
        });
      } else if (evt.kind === "status" && evt.to === "retired") {
        retirements.push({
          rikishiId: evt.rikishiId,
          shikona,
          reason: evt.description,
        });
      }
    }
  }

  return {
    year: basho.year,
    bashoNumber: basho.bashoNumber,
    bashoName: basho.bashoName,
    makuuchiSummary: {
      totalBouts,
      avgWins: totalMakuuchiWins / Math.max(1, makuuchiRikishiCount),
      injuryCount: makuuchiInjuryCount,
    },
    promotions,
    demotions,
    retirements,
  };
}
