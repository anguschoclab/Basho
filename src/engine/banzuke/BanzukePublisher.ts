import type { WorldState } from "../types/world";
import type { BashoState } from "../types/basho";
import { toRankPosition } from "../types/index";
import type { BashoPerformance, BanzukeEntry } from "../banzuke";
import { getNextBasho } from "../calendar";
import { enterInterim } from "../tick/tickDaily";
import { updateBanzuke, generateKeshoForPromotions } from "../banzuke";
import { createImpactBuilder } from "../core/ImpactBuilder";
import { resolveImpacts } from "../core/ImpactResolver";
import type { StateImpact } from "../core/StateImpact";
import { checkShikonaChange, recordShikonaChange } from "../history";
import type { Rikishi } from "../types/rikishi";

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
    console.warn("publishBanzukeUpdate: No standings found in lastBasho!");
    return builder.build();
  }

  const standingEntries = Array.from(standings.entries());

  const currentBanzukeList: BanzukeEntry[] = [];
  for (const rikishiId of world.activeRikishiIds) {
    const r = world.rikishi.get(rikishiId);
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
    const rikishi = world.rikishi.get(id);

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
      // Promotion Case 3: 3 consecutive 13+ wins + at least one yusho
      else if ((rikishi.consecutiveStrongOzeki || 0) >= 3 && (isYusho || wonPrevious)) {
        promoteToYokozuna = true;
      }
      // Promotion Case 4: Prestige Promotion (If world has 0 Yokozuna, 13+ win Yusho is enough)
      else if (stats.wins >= 13) {
        // ⚡ Bolt Optimization: Use early-exit loop instead of Array.from().filter().length to avoid O(N) allocations
        let hasActiveYokozuna = false;
        for (const r of world.rikishi.values()) {
          if (r.rank === "yokozuna" && !r.isRetired) {
            hasActiveYokozuna = true;
            break;
          }
        }
        if (!hasActiveYokozuna && (isYusho || (rikishi.consecutiveStrongOzeki || 0) >= 3)) {
          promoteToYokozuna = true;
        }
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
    let consecutiveMakeKoshi = rikishi?.consecutiveMakeKoshi || 0;
    let consecutiveKyujo = rikishi?.consecutiveKyujo || 0;
    let pressureScore = rikishi?.pressureScore || 0;
    let councilWarnings = rikishi?.councilWarnings || 0;
    let statsUpdate: Partial<import("../types/rikishi").RikishiStats> = {};

    if (rikishi?.rank === "yokozuna") {
      const isMakeKoshi = stats.wins < 8; // Official make-koshi
      const isKyujo = stats.absences >= 15; // Full tournament miss
      const subPar = stats.wins < 10; // Fails to meet "Yokozuna standard"

      if (isMakeKoshi || isKyujo) {
        consecutiveMakeKoshi = (rikishi.consecutiveMakeKoshi || 0) + 1;
      } else {
        consecutiveMakeKoshi = 0;
      }

      if (isKyujo) {
        consecutiveKyujo = (rikishi.consecutiveKyujo || 0) + 1;
      } else {
        consecutiveKyujo = 0;
      }

      // Council Recommendation / Warning Logic
      if (subPar || isKyujo) {
        pressureScore = (rikishi.pressureScore || 0) + 1;

        // Every 2 "sub-par" performances = 1 Council Warning
        if (pressureScore % 2 === 0) {
          councilWarnings = (rikishi.councilWarnings || 0) + 1;

          // Apply Stat Debuff: 10% reduction in Mental and Technique (Dignity loss)
          const currentMental = rikishi.stats.mental || 50;
          const currentTechnique = rikishi.stats.technique || 50;
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

    // Update rikishi with promotion tracking fields and append careerHistory
    if (rikishi) {
      const historyEntry = {
        id: `${lastBasho.bashoName}-${world.year}-${id}`,
        bashoId: `${lastBasho.bashoName}-${world.year}`,
        year: world.year,
        month: 0,
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
      // Keep last 6 basho only — promotion logic only needs recent history
      builder.updateRikishi(id, {
        consecutiveStrongOzeki,
        consecutiveMakeKoshi,
        consecutiveKyujo,
        pressureScore,
        councilWarnings,
        stats: statsUpdate,
        careerHistory: updatedHistory.slice(-6) as any,
      });
    }

    performanceList.push({
      rikishiId: id,
      wins: stats.wins,
      losses: stats.losses,
      absences: 0,
      yusho: isYusho,
      junYusho: isJunYusho,
      specialPrizes: prizePoints,
      promoteToYokozuna,
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
  const worldWithKesho = resolveImpacts(world, [keshoImpacts]);
  Object.assign(world, worldWithKesho);

  // Update ozekiKadoban world field
  builder.updateWorldField("ozekiKadoban", result.updatedOzekiKadoban);

  for (const newEntry of result.newBanzuke) {
    const rikishi = world.rikishi.get(newEntry.rikishiId);
    if (rikishi) {
      const oldRank = rikishi.rank;
      const oldShikona = rikishi.shikona;

      // Check if shikona should change due to promotion
      const newShikona = checkShikonaChange(world, rikishi, oldRank);

      if (newShikona) {
        recordShikonaChange(world, rikishi.id, oldShikona, newShikona);
        builder.updateRikishi(newEntry.rikishiId, {
          division: newEntry.division,
          rank: newEntry.position.rank,
          rankNumber: newEntry.position.rankNumber,
          side: newEntry.position.side,
          currentBashoWins: 0,
          currentBashoLosses: 0,
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
        });
      }
    }
  }

  const next = getNextBasho(lastBasho.bashoName);
  const nextYear = next === "hatsu" ? world.year + 1 : world.year;

  builder.updateWorldField("year", nextYear);
  builder.updateWorldField("currentBashoName", next);
  builder.updateWorldField("currentBasho", undefined);

  const interimWorld = enterInterim({
    ...world,
    year: nextYear,
    currentBashoName: next,
    currentBasho: undefined,
  });

  builder.updateWorldField("cyclePhase", interimWorld.cyclePhase);
  builder.updateWorldField("_interimDaysRemaining", interimWorld._interimDaysRemaining);

  return builder.build();
}
