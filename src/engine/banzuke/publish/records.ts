import type { WorldState } from "../../types/world";
import type { BashoState } from "../../types/basho";
import type { BashoPerformance } from "../../banzuke";
import { updateBanzuke } from "../../banzuke";
import { createImpactBuilder } from "../../core/ImpactBuilder";
import { getRikishi } from "../../queries";
import { createEmptyAlmanacRecord } from "../../almanac/narrativeEnrichment";
import { MAX_PROMOTION_HISTORY } from "../../almanac/types";
import type { PromotionHistoryEntry } from "../../almanac/types";

type Builder = ReturnType<typeof createImpactBuilder>;
type BanzukeResult = ReturnType<typeof updateBanzuke>;
type PerfMap = Map<string, BashoPerformance>;

/**
 * Phase 4B: Capture promotion history into each mover's almanacRecord.
 */
export function recordPromotionHistory(
  world: WorldState,
  lastBasho: BashoState,
  result: BanzukeResult,
  builder: Builder
): void {
  const bashoYear = lastBasho.year;
  const bashoName = lastBasho.bashoName;
  for (const evt of result.events) {
    if (evt.kind !== "promotion" && evt.kind !== "demotion") continue;
    const r = getRikishi(world, evt.rikishiId);
    if (!r) continue;

    let record = r.almanacRecord;
    if (!record) {
      record = createEmptyAlmanacRecord(r);
    }

    const entry: PromotionHistoryEntry = {
      year: bashoYear,
      bashoName,
      fromRank: evt.from,
      toRank: evt.to,
      kind: evt.kind,
      isJump: evt.isJumpPromotion ?? false,
      isSanyaku: evt.isSanyakuPromotion ?? false,
      isSekitori: evt.isSekitoriPromotion ?? false,
    };

    const existingHistory = record.promotionHistory ?? [];
    const updatedHistory = [entry, ...existingHistory].slice(0, MAX_PROMOTION_HISTORY);

    builder.updateRikishi(evt.rikishiId, {
      almanacRecord: {
        ...record,
        promotionHistory: updatedHistory,
      },
    });
  }
}

/**
 * Post-update bookkeeping: ozekiKadoban world field, consecutiveStrongSekiwake
 * tracking for ozeki promotion qualification (4.2 — 10+ wins threshold aligns
 * with the 33-win/10-in-last criteria), and the yokozuna vacancy streak.
 */
export function updatePromotionTracking(
  world: WorldState,
  result: BanzukeResult,
  perfMap: PerfMap,
  builder: Builder
): void {
  // Update ozekiKadoban world field
  builder.updateWorldField("ozekiKadoban", result.updatedOzekiKadoban);

  for (const newEntry of result.newBanzuke) {
    const r = getRikishi(world, newEntry.rikishiId);
    if (!r) continue;
    const perf = perfMap.get(newEntry.rikishiId);
    const wins = perf?.wins ?? 0;
    const isSanyaku = r.rank === "sekiwake" || r.rank === "komusubi";
    if (isSanyaku && wins >= 10) {
      builder.updateRikishi(newEntry.rikishiId, {
        consecutiveStrongSekiwake: (r.consecutiveStrongSekiwake ?? 0) + 1,
        sekiwakeThreeBashoWins: perf?.sekiwakeThreeBashoWins ?? 0,
      });
    } else if (isSanyaku && wins < 10) {
      builder.updateRikishi(newEntry.rikishiId, {
        consecutiveStrongSekiwake: 0,
        sekiwakeThreeBashoWins: perf?.sekiwakeThreeBashoWins ?? 0,
      });
    }
  }

  // Update yokozuna vacancy streak: increment if no active yokozuna, reset to 0 otherwise.
  let hasActiveYokozuna = false;
  for (const newEntry of result.newBanzuke) {
    if (newEntry.position.rank === "yokozuna") {
      hasActiveYokozuna = true;
      break;
    }
  }
  const nextVacancyStreak = hasActiveYokozuna ? 0 : (world.yokozunaVacancyStreak ?? 0) + 1;
  builder.updateWorldField("yokozunaVacancyStreak", nextVacancyStreak);
}
