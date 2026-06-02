import type { WorldState } from "../types/world";
import type { AlmanacSnapshot } from "./types";

export function buildAlmanacSnapshot(world: WorldState): AlmanacSnapshot | null {
  if (!world.currentBasho) return null;

  const basho = world.currentBasho;

  let makuuchiRikishiCount = 0;
  let totalMakuuchiWins = 0;
  let makuuchiInjuryCount = 0;

  for (const rikishiId of world.activeRikishiIds) {
    const r = world.rikishi.get(rikishiId);
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

  return {
    year: basho.year,
    bashoNumber: basho.bashoNumber,
    bashoName: basho.bashoName,
    makuuchiSummary: {
      totalBouts,
      avgWins: totalMakuuchiWins / Math.max(1, makuuchiRikishiCount),
      injuryCount: makuuchiInjuryCount,
    },
    promotions: [],
    demotions: [],
    retirements: [],
  };
}
