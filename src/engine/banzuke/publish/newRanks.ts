import type { WorldState } from "@/engine/types/world";
import type { BashoState } from "@/engine/types/basho";
import type { MovementEvent } from "@/engine/types/banzuke";
import { updateBanzuke } from "@/engine/banzuke/banzukeOps";
import { createImpactBuilder } from "@/engine/core/ImpactBuilder";
import { checkShikonaChange, recordShikonaChange } from "@/engine/history/history";
import { getRikishi, getHeya } from "@/engine/core/queries";
import { generateKyujoNarrative } from "@/engine/bout/boutNarrative";
import {
  accumulatePromotionTenure,
  applyTenureDeltas,
  type TenureDelta,
} from "@/engine/legacy/tenure";
import { isSanyakuRank } from "@/constants/engine/rankDisplay";
import type { Rikishi } from "@/engine/types/rikishi";
import type { RetiredRikishiSummary } from "@/engine/types/history";
import { BASHO_CALENDAR } from "@/engine/calendar/calendar";

type Builder = ReturnType<typeof createImpactBuilder>;
type BanzukeResult = ReturnType<typeof updateBanzuke>;

/**
 * Applies the new banzuke ranks to each rikishi: division/rank/side updates,
 * record resets, shikona-change handling, injury-return flags, and the
 * ozeki demotion / reclaim headline events plus kyujo-return narratives.
 */
export function applyNewRanks(
  world: WorldState,
  lastBasho: BashoState,
  result: BanzukeResult,
  eventsByRikishiId: Map<string, MovementEvent>,
  builder: Builder
): void {
  // WS5/WS5b — promotion tenure deltas are accumulated per heya and flushed
  // once at the end: bumpTenure reads pre-resolution tenure, so per-rikishi
  // writes to the same oyakata would overwrite each other.
  const tenureDeltas = new Map<string, TenureDelta>();

  for (const newEntry of result.newBanzuke) {
    const rikishi = getRikishi(world, newEntry.rikishiId);
    if (rikishi) {
      const oldRank = rikishi.rank;
      const oldShikona = rikishi.shikona;

      // Check if shikona should change due to promotion
      const newShikona = checkShikonaChange(world, rikishi, oldRank);

      // Track if rikishi was kyujo due to injury — set return flag for narrative triggers
      const wasKyujoFromInjury = rikishi.isKyujo && rikishi.kyujoReason === "injury";

      // Check if this rikishi had a sanyaku promotion this basho (Gap 5)
      const movementEvent = eventsByRikishiId.get(newEntry.rikishiId);
      const isSanyakuPromotion = movementEvent?.isSanyakuPromotion ?? false;

      // WS5 — rank milestones count toward the sitting oyakata's tenure record.
      if (getHeya(world, rikishi.heyaId)) {
        accumulatePromotionTenure(
          tenureDeltas,
          rikishi,
          newEntry.division,
          newEntry.position.rank,
          isSanyakuPromotion
        );
      }

      if (newShikona) {
        recordShikonaChange(world, builder, rikishi.id, oldShikona, newShikona);
        builder.updateRikishi(newEntry.rikishiId, {
          division: newEntry.division,
          rank: newEntry.position.rank,
          rankNumber: newEntry.position.rankNumber,
          side: newEntry.position.side,
          currentBashoWins: 0,
          currentBashoLosses: 0,
          currentWinStreak: 0,
          currentLossStreak: 0,
          isKyujo: false,
          kyujoReason: undefined,
          interventionUsedThisBasho: false,
          recentlyReturnedFromInjury: wasKyujoFromInjury || undefined,
          sanyakuPromotionThisBasho: isSanyakuPromotion || undefined,
          shikona: newShikona,
          economics: {
            ...(rikishi.economics ?? {
              cash: 0,
              retirementFund: 0,
              careerKenshoWon: 0,
              kinboshiCount: 0,
              totalEarnings: 0,
              currentBashoEarnings: 0,
              popularity: 50,
            }),
            currentBashoEarnings: 0,
          },
        });
      } else {
        builder.updateRikishi(newEntry.rikishiId, {
          division: newEntry.division,
          rank: newEntry.position.rank,
          rankNumber: newEntry.position.rankNumber,
          side: newEntry.position.side,
          currentBashoWins: 0,
          currentBashoLosses: 0,
          currentWinStreak: 0,
          currentLossStreak: 0,
          isKyujo: false,
          kyujoReason: undefined,
          interventionUsedThisBasho: false,
          recentlyReturnedFromInjury: wasKyujoFromInjury || undefined,
          sanyakuPromotionThisBasho: isSanyakuPromotion || undefined,
          economics: {
            ...(rikishi.economics ?? {
              cash: 0,
              retirementFund: 0,
              careerKenshoWon: 0,
              kinboshiCount: 0,
              totalEarnings: 0,
              currentBashoEarnings: 0,
              popularity: 50,
            }),
            currentBashoEarnings: 0,
          },
        });
      }

      checkOzekiRankTransitions(builder, rikishi, newEntry);
      checkOriginFirst(world, builder, rikishi, newEntry, lastBasho);

      // Gap 4/9: Generate return_from_kyujo narrative for returning rikishi
      if (rikishi.isKyujo) {
        const bashosMissed = (rikishi as { consecutiveKyujo?: number }).consecutiveKyujo ?? 1;
        const returnNarrative = generateKyujoNarrative(
          rikishi,
          "return_from_kyujo",
          { bashosMissed },
          `return-kyujo-${newEntry.rikishiId}-${world.seed}-${lastBasho.bashoName}`
        );
        builder.logEvent(
          "BASHO_STATUS",
          "basho",
          {
            rikishiId: newEntry.rikishiId,
            heyaId: rikishi.heyaId,
            shikona: rikishi.shikona,
            status: "kyujo_return",
            bashosMissed,
            narrative: returnNarrative,
          },
          { rikishiId: newEntry.rikishiId, heyaId: rikishi.heyaId }
        );
      }
    }
  }

  applyTenureDeltas(world, builder, tenureDeltas);
}

/**
 * Ozeki rank-transition events: demotion sets wasDemotedFromOzeki and emits
 * the headline; reclaim (demoted ozeki restored via 10+ win) clears it.
 */
function checkOzekiRankTransitions(
  builder: Builder,
  rikishi: NonNullable<ReturnType<typeof getRikishi>>,
  newEntry: BanzukeResult["newBanzuke"][number]
): void {
  const oldRank = rikishi.rank;

  // Ozeki demotion detection: set wasDemotedFromOzeki flag
  if (oldRank === "ozeki" && newEntry.position.rank !== "ozeki") {
    builder.updateRikishi(newEntry.rikishiId, {
      wasDemotedFromOzeki: true,
    });
    builder.logEvent(
      "BASHO_STATUS",
      "promotion",
      {
        status: "ozeki_demotion",
        description: `${rikishi.shikona} has been demoted from Ozeki.`,
        rikishiId: newEntry.rikishiId,
        from: oldRank,
        to: newEntry.position.rank,
      },
      { rikishiId: newEntry.rikishiId, heyaId: rikishi.heyaId, importance: "headline" }
    );
  }

  // Ozeki reclaim detection: demoted ozeki restored to ozeki rank (10+ win reclaim)
  if (oldRank !== "ozeki" && newEntry.position.rank === "ozeki" && rikishi.wasDemotedFromOzeki) {
    builder.updateRikishi(newEntry.rikishiId, {
      wasDemotedFromOzeki: false,
    });
    builder.logEvent(
      "BASHO_STATUS",
      "promotion",
      {
        status: "ozeki_reclaim",
        description: `${rikishi.shikona} has reclaimed Ozeki rank after a strong performance at Sekiwake.`,
        rikishiId: newEntry.rikishiId,
        from: oldRank,
        to: "ozeki",
      },
      { rikishiId: newEntry.rikishiId, heyaId: rikishi.heyaId, importance: "headline" }
    );
  }
}

/** Has this rikishi ever held a makuuchi spot (any prior bouts or snapshots)? */
function everReachedMakuuchi(r: Rikishi): boolean {
  if (r.division === "makuuchi") return true;
  const makuuchiBouts =
    (r.divisionRecords?.makuuchi?.wins ?? 0) + (r.divisionRecords?.makuuchi?.losses ?? 0);
  if (makuuchiBouts > 0) return true;
  return (r.careerHistory ?? []).some((s) => s.division === "makuuchi");
}

/** Has this rikishi ever held a san'yaku rank? */
function everReachedSanyaku(r: Rikishi): boolean {
  if (isSanyakuRank(r.rank)) return true;
  return (r.careerHistory ?? []).some((s) => isSanyakuRank(s.rank));
}

/**
 * Scans active + historical rikishi for a same-origin precedent at the level
 * ("makuuchi" | "sanyaku"). Excludes the promotee himself.
 */
function hasOriginPrecedent(
  world: WorldState,
  origin: string,
  selfId: string,
  level: "makuuchi" | "sanyaku"
): boolean {
  const reached = (entry: Rikishi | RetiredRikishiSummary): boolean => {
    if (entry.origin !== origin) return false;
    const summary = entry as RetiredRikishiSummary;
    if (summary.isSummary === true) {
      return level === "makuuchi"
        ? summary.peakDivision === "makuuchi"
        : isSanyakuRank(summary.peakRank);
    }
    const r = entry as Rikishi;
    return level === "makuuchi" ? everReachedMakuuchi(r) : everReachedSanyaku(r);
  };

  for (const [id, r] of world.rikishi) {
    if (id === selfId) continue;
    if (reached(r)) return true;
  }
  for (const [, r] of world.historicalRikishi ?? []) {
    if (reached(r)) return true;
  }
  return false;
}

/**
 * Origin-first milestones: when a rikishi reaches makuuchi or san'yaku and
 * nobody from his origin has ever been there, flag firstFromOriginThisBasho
 * and record an origin_first milestone. The flag lives until the next
 * publish, same lifecycle as sanyakuPromotionThisBasho.
 */
function checkOriginFirst(
  world: WorldState,
  builder: Builder,
  rikishi: Rikishi,
  newEntry: BanzukeResult["newBanzuke"][number],
  lastBasho: BashoState
): void {
  if (!rikishi.origin) return;

  const level: "makuuchi" | "sanyaku" | null =
    newEntry.division === "makuuchi" && !everReachedMakuuchi(rikishi)
      ? "makuuchi"
      : isSanyakuRank(newEntry.position.rank) && !everReachedSanyaku(rikishi)
        ? "sanyaku"
        : null;
  if (!level) return;

  if (hasOriginPrecedent(world, rikishi.origin, rikishi.id, level)) return;

  const levelLabel = level === "makuuchi" ? "the top division" : "san'yaku";
  const milestone = {
    id: `origin-first-${rikishi.id}-${lastBasho.bashoName}-${world.year}`,
    type: "origin_first" as const,
    title: `First rikishi from ${rikishi.origin} to reach ${levelLabel}`,
    description: `${rikishi.shikona} is the first rikishi from ${rikishi.origin} to earn a spot in ${levelLabel}.`,
    date: { year: world.year, month: BASHO_CALENDAR[lastBasho.bashoName]?.month ?? 0 },
  };
  builder.updateRikishi(rikishi.id, {
    firstFromOriginThisBasho: true,
    milestones: [...(rikishi.milestones ?? []), milestone],
  });
  builder.logEvent(
    "LIFECYCLE_EVENT",
    "milestone",
    {
      status: "origin_first",
      rikishiId: rikishi.id,
      shikona: rikishi.shikona,
      origin: rikishi.origin,
      level,
      description: milestone.description,
    },
    { rikishiId: rikishi.id, heyaId: rikishi.heyaId, importance: "headline" }
  );
}
