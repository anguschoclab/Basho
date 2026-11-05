/**
 * snapshot.ts — per-basho Almanac snapshots built from live world state.
 *
 * Unlike `career.ts`/`heyaRecord.ts` (synthetic backfill), `buildAlmanacSnapshot`
 * aggregates real recorded values — makuuchi headcount, recorded wins, injuries —
 * at basho publish time.
 */
import type { WorldState } from "@/engine/types/world";
import type { AlmanacSnapshot } from "@/engine/almanac/types";
import type { MovementEvent } from "@/engine/types/banzuke";
import type { Rank } from "@/engine/types/banzuke";
import { getRikishi } from "@/engine/core/queries";

/**
 * Aggregate the current basho's state into an `AlmanacSnapshot`.
 *
 * @returns `null` when `world.currentBasho` is absent (e.g. called outside an
 *          active basho) — callers must handle the null case.
 */
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
