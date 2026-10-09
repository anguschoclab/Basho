/**
 * resolution/stakes.ts
 * ====================
 * World-side stakes application: title-stakes flags, rivalry update,
 * global kimarite tallies (era drift), and kensho banner/envelope award.
 */

import type { BoutContext } from "../boutPhysics";
import type { Rikishi } from "../../types/rikishi";
import type { BashoState, BoutResult } from "../../types/basho";
import type { WorldState } from "../../types/world";
import { createImpactBuilder, type ImpactBuilder } from "../../core/ImpactBuilder";
import { RivalryService } from "../../systems/narrative/RivalryService";
import { RNGRegistry } from "../../core/RNGRegistry";
import {
  calculateKenshoEnvelopes,
  assignKenshoBanners,
  determineBoutImportance,
} from "../../systems/economy/KenshoService";
import { isYushoContention, isPlayoffScenario } from "../boutContention";
import {
  KENSHO_BASE_COUNT_LOW,
  KENSHO_BASE_COUNT_MID,
  KENSHO_BASE_COUNT_HIGH,
  KENSHO_BASE_COUNT_PEAK,
  KENSHO_RNG_MIN,
  KENSHO_RNG_RANGE,
} from "../../../constants/engine/physics";

/** 5. Kensho (Prize Banners) — banner draw + envelope payout to the winner. */
function applyKensho(
  world: WorldState,
  result: BoutResult,
  winner: Rikishi,
  importance: "low" | "mid" | "high" | "peak"
) {
  const kenshoRng = RNGRegistry.getSystemRNG(world, "kensho", `kensho-${result.boutId}`);

  if (!world.sponsorPool) return;

  // Base banner count: random based on importance
  const baseCountMap = {
    low: KENSHO_BASE_COUNT_LOW,
    mid: KENSHO_BASE_COUNT_MID,
    high: KENSHO_BASE_COUNT_HIGH,
    peak: KENSHO_BASE_COUNT_PEAK,
  };
  const bannerCount = Math.floor(
    baseCountMap[importance] * (KENSHO_RNG_MIN + kenshoRng.next() * KENSHO_RNG_RANGE)
  );

  const banners = assignKenshoBanners(
    result.boutId,
    bannerCount,
    importance,
    world.sponsorPool,
    kenshoRng
  );
  (result as BoutResult & { kenshoBanners?: unknown[] }).kenshoBanners = banners;

  const awardFact = result.awardFact ?? undefined;
  result.kenshoEnvelopes = calculateKenshoEnvelopes(world, winner, banners, awardFact, kenshoRng);
}

/**
 * 4/5. Title stakes, rivalry update, global kimarite stats, and kensho.
 * Mutates `result` (isYushoRace/isTitleStakes, banners, envelopes) and
 * merges the rivalry impact into `builder`.
 */
export function applyStakesAndKensho(
  world: WorldState | undefined,
  east: Rikishi,
  west: Rikishi,
  winner: Rikishi,
  result: BoutResult,
  bout: BoutContext,
  basho: BashoState,
  builder: ImpactBuilder
) {
  let rivalryImpact = createImpactBuilder("rivalry").build();
  if (world) {
    // Title-stakes flags must be set BEFORE onBoutResolved — the rivalry
    // service reads them to pick heat-gain constants and the title_stakes
    // trigger. Previously they were only assigned in the kensho block below.
    const yushoContention = isYushoContention(east, west, basho);
    const playoff = isPlayoffScenario(east, west, basho);
    const importance = determineBoutImportance(
      east.rank,
      west.rank,
      bout.day,
      yushoContention,
      playoff
    );
    result.isYushoRace = yushoContention;
    result.isTitleStakes = playoff || yushoContention;

    rivalryImpact = RivalryService.onBoutResolved(world, {
      result,
      day: bout.day,
    });

    // E4: Track global kimarite stats for Era Drift
    if (result.kimarite && result.kimarite !== "fusensho") {
      const stats = { ...(world.globalKimariteStats || {}) };
      stats[result.kimarite] = (stats[result.kimarite] || 0) + 1;
      builder.updateWorldField("globalKimariteStats", stats);
      // All-time accumulator — same counts, but never reset by era drift.
      const allTime = { ...(world.allTimeKimariteStats || {}) };
      allTime[result.kimarite] = (allTime[result.kimarite] || 0) + 1;
      builder.updateWorldField("allTimeKimariteStats", allTime);
    }

    applyKensho(world, result, winner, importance);
  }

  // Merge rivalry impact into main builder
  builder.merge(rivalryImpact);
}
