import type { WorldState } from "../types/world";
import type { BashoState } from "../types/basho";
import { toRankPosition } from "../types/index";
import type { BashoPerformance, BanzukeEntry } from "../banzuke";
import { getNextBasho } from "../calendar";
import { enterInterim } from "../tick/tickDaily";
import { updateBanzuke, generateKeshoForPromotions } from "../banzuke";
import { createImpactBuilder } from "../core/ImpactBuilder";
import type { StateImpact } from "../core/StateImpact";
import { checkShikonaChange, recordShikonaChange } from "../history";
import { getRikishi } from "../queries";
import {
  YOKOZUNA_VACANCY_STREAK_THRESHOLD,
  YOKOZUNA_VACANCY_PRESTIGE_WINS,
} from "../../constants/engine/governanceExtended";
import { warn } from "../utils/Logger";
import { isKachiKoshi } from "./banzukeHelpers";
import { BASHO_CALENDAR } from "../calendar";
import { generateBanzukeMovementNarrative } from "./banzukeMovementNarrative";
import { generateKyujoNarrative } from "../bout/boutNarrative";
import { KihakuService } from "../systems/governance/KihakuService";
import { createEmptyAlmanacRecord } from "../almanac/narrativeEnrichment";
import { MAX_PROMOTION_HISTORY } from "../almanac/types";
import type { PromotionHistoryEntry } from "../almanac/types";

/**
 * Helper to retrieve the current basho state from the world.
 *
 * @param world - The current world state
 * @returns The current BashoState or undefined if no basho is active
 */
function getCurrentBasho(world: WorldState): BashoState | undefined {
  return world.currentBasho;
}

/**
 * Publishes the final results of a basho and updates the banzuke for the next one.
 * Handles promotions (including Yokozuna criteria), career history updates,
 * and council warnings for underperforming Yokozuna.
 *
 * @param world - The current world state
 * @returns A StateImpact object containing all world and rikishi updates
 */
export function publishBanzukeUpdate(world: WorldState): StateImpact {
  const builder = createImpactBuilder("publishBanzukeUpdate");

  if (world.cyclePhase !== "post_basho") return builder.build();

  const lastBasho = getCurrentBasho(world);
  if (!lastBasho) return builder.build();

  // Standings can be Map or Object depending on the simulation path; normalize here
  const standings = lastBasho.standings;
  if (!standings) {
    warn("No standings found in lastBasho", "BanzukePublisher");
    return builder.build();
  }

  const standingEntries = Array.from(standings.entries());

  const currentBanzukeList: BanzukeEntry[] = [];
  for (const rikishiId of world.activeRikishiIds) {
    const r = getRikishi(world, rikishiId);
    if (!r) continue;
    currentBanzukeList.push({
      rikishiId: r.id,
      division: r.division,
      position: toRankPosition({ rank: r.rank, rankNumber: r.rankNumber, side: r.side }),
    });
  }

  const performanceList: BashoPerformance[] = [];
  for (const [id, stats_any] of standingEntries) {
    const stats = stats_any as { wins: number; losses: number; absences: number };
    const history = world.history[world.history.length - 1];
    const isYusho = history.yusho === id;
    const isJunYusho = history.junYusho.includes(id);
    const rikishi = getRikishi(world, id);

    let prizePoints = 0;
    if (history.ginoSho === id) prizePoints += 1;
    if (history.shukunsho === id) prizePoints += 1;
    if (history.kantosho === id) prizePoints += 1;

    // Yokozuna promotion logic based on real sumo criteria
    // Standard: 2 consecutive yusho OR 1 yusho + 1 jun-yusho (13+ wins both)
    let promoteToYokozuna = false;
    let consecutiveStrongOzeki = rikishi?.consecutiveStrongOzeki || 0;

    if (rikishi?.rank === "ozeki") {
      const currentWins = stats.wins;
      const cHistory = rikishi.careerHistory || [];
      const prevBasho = cHistory[cHistory.length - 1];

      const wonPrevious = prevBasho?.isYusho === true;
      const wasJunYushoPrevious = prevBasho?.isJunYusho === true;
      const lastWins = prevBasho?.wins || 0;

      // Promotion Case 1: 2 Consecutive Yusho
      if (isYusho && wonPrevious) {
        promoteToYokozuna = true;
      }
      // Promotion Case 2: 1 Yusho + 1 Jun-Yusho (13+ wins both)
      else if (
        (isYusho && wasJunYushoPrevious && lastWins >= 13) ||
        (isJunYusho && wonPrevious && currentWins >= 13)
      ) {
        promoteToYokozuna = true;
      }
      // Promotion Case 3: 3 consecutive 12+ wins + at least one yusho
      else if ((rikishi.consecutiveStrongOzeki || 0) >= 2 && (isYusho || wonPrevious)) {
        promoteToYokozuna = true;
      }
      // Promotion Case 4: Prestige Promotion (If world has 0 Yokozuna, 13+ win Yusho is enough)
      else if (stats.wins >= 13) {
        let hasActiveYokozuna = false;
        for (const r of world.rikishi.values()) {
          if (r.rank === "yokozuna" && !r.isRetired) {
            hasActiveYokozuna = true;
            break;
          }
        }
        if (!hasActiveYokozuna && isYusho) {
          promoteToYokozuna = true;
        }
      }
      // Promotion Case 5: Vacancy-streak prestige promotion
      // After YOKOZUNA_VACANCY_STREAK_THRESHOLD basho with no yokozuna,
      // relax criteria: 12+ win yusho is sufficient.
      else if (
        (world.yokozunaVacancyStreak ?? 0) >= YOKOZUNA_VACANCY_STREAK_THRESHOLD &&
        stats.wins >= YOKOZUNA_VACANCY_PRESTIGE_WINS &&
        isYusho
      ) {
        promoteToYokozuna = true;
      }

      // Track consecutive strong performances (12+) for borderline cases
      if (currentWins >= 12) {
        consecutiveStrongOzeki = (rikishi.consecutiveStrongOzeki || 0) + 1;
      } else {
        consecutiveStrongOzeki = 0;
      }

      // Narrative: Yokozuna Watch
      if (isYusho && !promoteToYokozuna) {
        builder.logEvent(
          "BASHO_STATUS",
          "promotion",
          {
            status: "yokozuna_watch",
            description: `${rikishi.shikona} is on Yokozuna promotion watch following a strong performance.`,
          },
          { rikishiId: id, heyaId: rikishi.heyaId }
        );
      }
    }

    // Yokozuna make-koshi and kyujo tracking for retirement pressure
    // Real sumo: Yokozuna with consecutive losing records face retirement pressure
    let consecutiveMakeKoshi = rikishi?.consecutiveMakeKoshi ?? 0;
    let consecutiveKyujo = rikishi?.consecutiveKyujo ?? 0;
    let pressureScore = rikishi?.pressureScore ?? 0;
    let councilWarnings = rikishi?.councilWarnings ?? 0;
    let statsUpdate: Partial<import("../types/rikishi").RikishiStats> = {};

    if (rikishi?.rank === "yokozuna") {
      const isMakeKoshi = stats.wins < 8; // Official make-koshi
      const isKyujo = stats.absences >= 15; // Full tournament miss
      const subPar = stats.wins < 10; // Fails to meet "Yokozuna standard"

      if (isMakeKoshi || isKyujo) {
        consecutiveMakeKoshi = (rikishi.consecutiveMakeKoshi ?? 0) + 1;
      } else {
        consecutiveMakeKoshi = 0;
      }

      if (isKyujo) {
        consecutiveKyujo = (rikishi.consecutiveKyujo ?? 0) + 1;
      } else {
        consecutiveKyujo = 0;
      }

      // Council Recommendation / Warning Logic
      if (subPar || isKyujo) {
        pressureScore = (rikishi.pressureScore ?? 0) + 1;

        // Every 2 "sub-par" performances = 1 Council Warning
        if (pressureScore % 2 === 0) {
          councilWarnings = (rikishi.councilWarnings ?? 0) + 1;

          // Apply Stat Debuff: 10% reduction in Mental and Technique (Dignity loss)
          const currentMental = rikishi.stats.mental ?? 50;
          const currentTechnique = rikishi.stats.technique ?? 50;
          statsUpdate = {
            mental: currentMental * 0.9,
            technique: currentTechnique * 0.9,
          };

          builder.logEvent(
            "GOVERNANCE_RULING",
            "discipline",
            {
              incident: "yokozuna_deliberation",
              description: `The Yokozuna Deliberation Council issues a formal warning to Yokozuna ${rikishi.shikona} following disappointing results.`,
            },
            { rikishiId: id, heyaId: rikishi.heyaId }
          );
        }
      }
    }

    // Consecutive kachi-koshi tracking for ALL rikishi (not just yokozuna)
    let consecutiveKachiKoshi = rikishi?.consecutiveKachiKoshi ?? 0;
    if (rikishi) {
      const isKachi = isKachiKoshi(stats.wins, stats.losses, rikishi.rank);
      const isFullAbsence = stats.absences >= 15;
      if (isKachi && !isFullAbsence) {
        consecutiveKachiKoshi = (rikishi.consecutiveKachiKoshi ?? 0) + 1;
      } else {
        consecutiveKachiKoshi = 0;
      }
    }

    // Update rikishi with promotion tracking fields and append careerHistory
    if (rikishi) {
      const historyEntry = {
        id: `${lastBasho.bashoName}-${world.year}-${id}`,
        bashoId: `${lastBasho.bashoName}-${world.year}`,
        year: world.year,
        month: BASHO_CALENDAR[lastBasho.bashoName]?.month ?? 0,
        bashoName: lastBasho.bashoName,
        rank: rikishi.rank,
        division: rikishi.division,
        rankNumber: rikishi.rankNumber ?? 1,
        side: rikishi.side,
        wins: stats.wins,
        losses: stats.losses,
        absences: stats.absences ?? 0,
        isYusho,
        isJunYusho,
        specialPrizes: {
          shukunsho: history.shukunsho === id,
          kantosho: history.kantosho === id,
          ginosho: history.ginoSho === id,
        },
        weight: rikishi.weight,
        momentum: rikishi.momentum,
      };
      const updatedHistory = [...(rikishi.careerHistory || []), historyEntry];
      // Keep last 6 basha only — promotion logic only needs recent history

      // Track absentFinalDay: if rikishi has any absences and didn't complete all 15 bouts
      const totalBouts = stats.wins + stats.losses;
      const absentFinalDay = stats.absences > 0 && totalBouts < 15;

      // Calculate kihaku isen (fighting spirit) score using KihakuService
      const kihakuInput = KihakuService.extractFromBasho(
        id,
        lastBasho,
        stats.wins,
        absentFinalDay
      );
      const kihakuIsenScore = KihakuService.calculateScore(kihakuInput);

      builder.updateRikishi(id, {
        consecutiveStrongOzeki,
        consecutiveMakeKoshi,
        consecutiveKachiKoshi,
        consecutiveKyujo,
        pressureScore,
        councilWarnings,
        stats: statsUpdate as import("../types/rikishi").RikishiStats,
        careerHistory: updatedHistory.slice(-6),
        absentFinalDay,
        kihakuIsenScore,
      });
    }

    // Enrich performance with bout metrics (7.1) + SOS (4.3)
    const boutMetrics = lastBasho.boutMetrics?.[id];
    const avgBoutDuration = boutMetrics && boutMetrics.boutDurations.length > 0
      ? boutMetrics.boutDurations.reduce((a: number, b: number) => a + b, 0) / boutMetrics.boutDurations.length
      : undefined;
    const opponentAvgTier = boutMetrics && boutMetrics.opponentTiers.length > 0
      ? boutMetrics.opponentTiers.reduce((a: number, b: number) => a + b, 0) / boutMetrics.opponentTiers.length
      : undefined;

    // Ozeki promotion detection (4.2): sekiwake/komusubi with 3 consecutive 11+ win basho
    const isSanyakuForOzeki = rikishi?.rank === "sekiwake" || rikishi?.rank === "komusubi";
    const promoteToOzeki = isSanyakuForOzeki
      && stats.wins >= 11
      && (rikishi?.consecutiveStrongSekiwake ?? 0) >= 2;

    performanceList.push({
      rikishiId: id,
      wins: stats.wins,
      losses: stats.losses,
      absences: stats.absences ?? 0,
      yusho: isYusho,
      junYusho: isJunYusho,
      specialPrizes: prizePoints,
      promoteToYokozuna,
      promoteToOzeki,
      kimariteUsed: boutMetrics?.kimariteUsed,
      upsetCount: boutMetrics?.upsetCount,
      avgBoutDuration,
      edgeCrisisSurvived: boutMetrics?.edgeCrisisSurvived,
      comebackWins: boutMetrics?.comebackWins,
      opponentAvgTier,
    });
  }

  const perfMap = new Map(performanceList.map((p) => [p.rikishiId, p]));
  const result = updateBanzuke(
    currentBanzukeList,
    perfMap,
    world,
    world.ozekiKadoban ?? {},
    world.heyas
  );

  // Generate kesho-mawashi for promoted rikishi and apply impacts
  const keshoImpacts = generateKeshoForPromotions(world, result.events);
  builder.merge(keshoImpacts);

  // Ozeki promotion narrative (4.2): log narrative events for new ozeki promotions
  for (const evt of result.events) {
    if (evt.kind !== "promotion") continue;
    const newEntry = result.newBanzuke.find((e) => e.rikishiId === evt.rikishiId);
    if (!newEntry || newEntry.position.rank !== "ozeki") continue;
    const promotedRikishi = getRikishi(world, evt.rikishiId);
    if (!promotedRikishi) continue;
    const perf = perfMap.get(evt.rikishiId);
    builder.logEvent(
      "BASHO_STATUS",
      "promotion",
      {
        status: "ozeki_promotion",
        description: `${promotedRikishi.shikona} has been promoted to Ozeki — a new pillar of the sumo world.`,
        rikishiId: evt.rikishiId,
        wins: perf?.wins ?? 0,
        losses: perf?.losses ?? 0,
        yusho: perf?.yusho ?? false,
        from: evt.from,
      },
      { rikishiId: evt.rikishiId, heyaId: promotedRikishi.heyaId, importance: "headline" }
    );
  }

  // Banzuke movement narrative (4.1): generate narrative lines for notable promotions/demotions
  const movementNarratives = generateBanzukeMovementNarrative(
    result.events,
    world,
    `${world.seed}-${lastBasho.bashoName}-banzuke`
  );
  for (const narrative of movementNarratives) {
    const narrativeRikishi = getRikishi(world, narrative.rikishiId);
    // Phase 6: Enrich BASHO_STATUS event data with MovementEvent fields
    const movementEvt = result.events.find((e) => e.rikishiId === narrative.rikishiId);
    builder.logEvent(
      "BASHO_STATUS",
      "promotion",
      {
        status: "banzuke_movement",
        description: narrative.text,
        rikishiId: narrative.rikishiId,
        from: movementEvt?.from,
        to: movementEvt?.to,
        kind: movementEvt?.kind,
        isJumpPromotion: movementEvt?.isJumpPromotion,
        isSanyakuPromotion: movementEvt?.isSanyakuPromotion,
        isSekitoriPromotion: movementEvt?.isSekitoriPromotion,
      },
      { rikishiId: narrative.rikishiId, heyaId: narrativeRikishi?.heyaId, importance: "notable" }
    );
  }

  // Phase 4B: Capture promotion history into almanacRecord
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

  // Update ozekiKadoban world field
  builder.updateWorldField("ozekiKadoban", result.updatedOzekiKadoban);

  // Track consecutiveStrongSekiwake for ozeki promotion qualification (4.2)
  for (const newEntry of result.newBanzuke) {
    const r = getRikishi(world, newEntry.rikishiId);
    if (!r) continue;
    const perf = perfMap.get(newEntry.rikishiId);
    const wins = perf?.wins ?? 0;
    const isSanyaku = r.rank === "sekiwake" || r.rank === "komusubi";
    if (isSanyaku && wins >= 11) {
      builder.updateRikishi(newEntry.rikishiId, {
        consecutiveStrongSekiwake: (r.consecutiveStrongSekiwake ?? 0) + 1,
      });
    } else if (isSanyaku && wins < 11) {
      builder.updateRikishi(newEntry.rikishiId, {
        consecutiveStrongSekiwake: 0,
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
      const movementEvent = result.events.find((e) => e.rikishiId === newEntry.rikishiId);
      const isSanyakuPromotion = movementEvent?.isSanyakuPromotion ?? false;

      if (newShikona) {
        recordShikonaChange(world, rikishi.id, oldShikona, newShikona);
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
          recentlyReturnedFromInjury: wasKyujoFromInjury || undefined,
          sanyakuPromotionThisBasho: isSanyakuPromotion || undefined,
          shikona: newShikona,
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
          recentlyReturnedFromInjury: wasKyujoFromInjury || undefined,
          sanyakuPromotionThisBasho: isSanyakuPromotion || undefined,
        });
      }

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

  const next = getNextBasho(lastBasho.bashoName);

  builder.updateWorldField("currentBashoName", next);
  builder.updateWorldField("currentBasho", undefined);

  const interimWorld = enterInterim({
    ...world,
    currentBashoName: next,
    currentBasho: undefined,
  });

  builder.updateWorldField("cyclePhase", interimWorld.cyclePhase);
  builder.updateWorldField("_interimDaysRemaining", interimWorld._interimDaysRemaining);

  return builder.build();
}
