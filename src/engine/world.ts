/**
 * File Name: src/engine/world.ts
 * Notes:
 * - Orchestrates the game simulation using high-fidelity types.
 * - 'advanceDay' runs bouts for the current day using 'resolveBout' (which handles H2H).
 * - 'endBasho' handles rankings, prizes, and crucially, the LIFECYCLE check (retirements/new recruits).
 * - 'advanceInterim' handles between-basho ticks (AI, scouting, economics).
 * - All lifecycle transitions emit canonical EventBus events.
 * - Almanac snapshots are written at basho end (Constitution A5.1).
 * - FTUE state is updated after first basho completion.
 */

import { rngFromSeed, rngForWorld, SeededRNG } from "./rng";
import type { WorldState } from "./types/world";
import type { BashoName, BoutResult, MatchSchedule, BashoState } from "./types/basho";
import type { Id } from "./types/common";
import { toRankPosition, type Side } from "./types";
import type { BashoPerformance, BanzukeEntry } from "./banzuke";
import * as talentpool from "./systems/generation/TalentPoolService";
import { initializeBasho } from "./systems/generation/WorldFactory";
import { getNextBasho } from "./calendar";
import { resolveBout } from "./bout/boutResolver";
import { stableTieBreak } from "./utils/sort";
import { updateH2H } from "./h2h";
import { EventBus, logEngineEvent } from "./events";
import { advanceOneDay, enterPostBasho, enterInterim, type DailyTickReport } from "./tick/tickDaily";
import { buildAlmanacSnapshot } from "./almanac";
import { autosave } from "./saveload";
import { runSponsorChurn } from "./economics";
import * as schedule from "./schedule";
import * as events from "./events";
import * as injuries from "./systems/health/InjuryService";
import * as rivalries from "./rivalries";
import { 
  updateMediaFromBout, 
  processWeeklyMediaBoundary,
  resetBashoMediaTracking,
  snapshotMediaHeatForBasho
} from "./systems/media/MediaService";
import * as economics from "./economics";
import * as governance from "./governance/GovernanceService";
import { executeMerger, findMergerTarget } from "./mergers";
import { issueBailoutLoanIfNeeded, processMonthlyLoanRepayments } from "./loans";
import { checkNaturalizations } from "./naturalization";
import * as welfare from "./welfare";
import * as npcAI from "./npcAI";
import * as scoutingStore from "./scoutingStore";
import * as historyIndex from "./historyIndex";
import * as training from "./training"; 
import { } from "./systems/generation/CandidateGenerator";
import { determineSpecialPrizes, updateBanzuke } from "./banzuke"; 
import { applyBoutResult } from "./bout/boutResultApplier";
import { checkRetirement } from "./lifecycle";
import { generateOyakata } from "./oyakataPersonalities";
import { getHeyaRoster, getRikishi, getActiveRikishi, getStableRikishi } from "./queries";
import { runPrestigeDecay, updateStatureBand } from "./prestige/prestigeSystem";
import { runGovernanceReview, runRetirements, runAIMetaDrift } from "./governance/governanceReview";
import { onBashoEnded, onRikishiRetired } from "./records";
import { runHistoryUpdates } from "./history";
import { recordOyakataHandover } from "./lineage";
import { runArchivalPruning } from "./archival";
import { safeCall } from "./utils/safe";

export { 
  getActiveRikishi, 
  getStableRikishi, 
  applyBoutResult 
};


// Type guard or helper to access current basho
/**
 * Get current basho.
 *  * @param world - The World.
 *  * @returns The result.
 */
function getCurrentBasho(world: WorldState): BashoState | undefined {
  return world.currentBasho;
}

/**
 * Start basho.
 *  * @param world - The World.
 *  * @param bashoName - The Basho name.
 *  * @returns The result.
 */
export function startBasho(world: WorldState, bashoName?: BashoName): WorldState {
  if (world.cyclePhase === "active_basho") return world;

  const name: BashoName =
    bashoName || world.currentBashoName || "hatsu"; // Default fall back

  // Initialize new basho state
  const basho = initializeBasho(world, name);

  world.currentBasho = basho;
  world.cyclePhase = "active_basho";

  ensureDaySchedule(world, basho.day);
  EventBus.bashoStarted(world, name);

  // Reset basho-scoped media tracking (streaks, promo watch)
  if (world.mediaState) {
    world.mediaState = resetBashoMediaTracking(world.mediaState);
  }
  return world;

}

/**
 * Ensure day schedule.
 *  * @param world - The World.
 *  * @param day - The Day.
 *  * @returns The result.
 */
function ensureDaySchedule(world: WorldState, day: number): WorldState {
  const basho = getCurrentBasho(world);
  if (!basho) return world;

  const already = basho.matches.some((m) => m.day === day);
  if (already) return world;

  // Use generateDaySchedule from the schedule module
  if (typeof schedule.generateDaySchedule === "function") {
    schedule.generateDaySchedule(world, basho, day, world.seed);
  } else {
      // Basic fallback scheduling
      const rikishiIds = Array.from(world.rikishi.keys());
      for(let i=0; i<rikishiIds.length; i+=2) {
          if (i+1 < rikishiIds.length) {
              basho.matches.push({
                  boutId: `fallback-match-${day}-${i}`,
                  day,
                  eastRikishiId: rikishiIds[i],
                  westRikishiId: rikishiIds[i+1]
              });
          }
      }
  }
  return world;
}

/**
 * Advance basho day.
 *  * @param world - The World.
 *  * @returns The result.
 */
export function advanceBashoDay(world: WorldState): WorldState {
  const basho = getCurrentBasho(world);
  if (!basho) return world;

  const nextDay = basho.day + 1;
  basho.day = nextDay;
  // Legacy sync
  basho.currentDay = nextDay;

  if (nextDay <= 15) ensureDaySchedule(world, nextDay);

  EventBus.bashoDay(world, nextDay);
  return world;
}

/**
 * Simulate bout for today.
 *  * @param world - The World.
 *  * @param unplayedIndex - The Unplayed index.
 *  * @returns The result.
 */
export function simulateBoutForToday(
  world: WorldState,
  unplayedIndex: number,
  playerTactic?: import("./types/combat").BoutTactic
): { world: WorldState; result?: BoutResult } {
  const basho = getCurrentBasho(world);
  if (!basho) return { world };

  const todays = basho.matches.filter((m) => m.day === basho.day && !m.result);
  const match = todays[unplayedIndex];
  if (!match) return { world };

  const east = world.rikishi.get(match.eastRikishiId);
  const west = world.rikishi.get(match.westRikishiId);
  if (!east || !west) return { world };

  const playerSide = world.playerHeyaId
    ? (east.heyaId === world.playerHeyaId ? ("east" as Side) : west.heyaId === world.playerHeyaId ? ("west" as Side) : undefined)
    : undefined;

  const boutContext = {
      id: `d${basho.day}-b${unplayedIndex}`,
      day: basho.day,
      rikishiEastId: east.id,
      rikishiWestId: west.id,
      division: east.division,
      playerSide
  };

  const result = resolveBout(boutContext, east, west, basho, playerTactic);

  applyBoutResult(world, match, result);
  return { world, result };
}

// applyBoutResult - removed and moved to src/engine/bout/boutResultApplier.ts

/**
 * End basho.
 *  * @param world - The World.
 *  * @returns The result.
 */
export function endBasho(world: WorldState): WorldState {
  const basho = getCurrentBasho(world);
  if (!basho) return world;

  const table: Array<{id: string, wins: number, losses: number}> = [];
  for (const [id, rec] of basho.standings.entries()) {
    table.push({ id, wins: rec.wins, losses: rec.losses });
  }
  table.sort((a, b) => b.wins - a.wins || a.losses - b.losses || stableTieBreak(a.id, b.id));

  if (table.length === 0) return world;

  const bestWins = table[0].wins;
  const topCandidates = table.reduce<Id[]>((acc, t) => {
    if (t.wins === bestWins) acc.push(t.id);
    return acc;
  }, []);
  
  let yusho = topCandidates[0];
  const playoffMatches: MatchSchedule[] = [];
  
  // === PLAYOFF RESOLUTION ===
  if (topCandidates.length > 1) {
    // Run single-elimination playoff bouts between tied rikishi
    let remaining = [...topCandidates];
    let playoffRound = 1;
    
    while (remaining.length > 1) {
      const nextRound: string[] = [];
      
      for (let i = 0; i < remaining.length; i += 2) {
        if (i + 1 >= remaining.length) {
          // Bye — odd one advances
          nextRound.push(remaining[i]);
          continue;
        }
        
        const eastId = remaining[i];
        const westId = remaining[i + 1];
        const east = world.rikishi.get(eastId);
        const west = world.rikishi.get(westId);
        
        if (!east || !west) {
          nextRound.push(eastId);
          continue;
        }
        
        const boutCtx = {
          id: `playoff-r${playoffRound}-${i}`,
          day: 16 + playoffRound - 1, // Day 16+
          rikishiEastId: eastId,
          rikishiWestId: westId,
        };
        
        const result = resolveBout(boutCtx, east, west, basho);
        const m: MatchSchedule = { 
          boutId: `result-match-${world.week}-${i}`,
          day: world.calendar?.currentDay ?? 1, 
          eastRikishiId: eastId, 
          westRikishiId: westId, 
          result: result 
        };
        playoffMatches.push(m);
        nextRound.push(result.winnerRikishiId);
      }
      
      remaining = nextRound;
      playoffRound++;
    }
    
    yusho = remaining[0];
  }

  const runnerWins = bestWins - 1;
  const junYusho = table
    .filter(t => (t.wins === bestWins && t.id !== yusho) || t.wins === runnerWins)
    .map(t => t.id);

  const awards = determineSpecialPrizes(
    basho.matches, 
    world.rikishi,
    yusho
  );

  const bashoResult = {
    year: basho.year,
    bashoNumber: basho.bashoNumber,
    bashoName: basho.bashoName,
    yusho,
    junYusho,
    ginoSho: awards.ginoSho,
    kantosho: awards.kantosho,
    shukunsho: awards.shukunsho,
    playoffMatches: playoffMatches.length > 0 ? playoffMatches : undefined,
    prizes: {
      yushoAmount: 10_000_000,
      junYushoAmount: 2_000_000,
      specialPrizes: 2_000_000
    }
  };

  // --- APPLY SPECIAL PRIZES (Constitution & User Spec) ---
  const SANSHO_PRIZE_AMOUNT = 2_000_000;
  const processAward = (rikishiId: string | undefined, type: 'Shukun' | 'Kanto' | 'Gino') => {
    if (!rikishiId) return;
    const r = world.rikishi.get(rikishiId);
    if (!r) return;
    
    // Ensure achievements.specialPrizes exists
    if (!r.stats) {
      r.stats = { 
        strength: 50, technique: 50, speed: 50, weight: 150, stamina: 50, mental: 50, adaptability: 50, balance: 50, 
        achievements: { 
          kinboshiEarned: 0, 
          ginboshiEarned: 0, 
          kinboshiConceded: 0, 
          ginboshiConceded: 0,
          specialPrizes: { shukunSho: 0, kantoSho: 0, ginoSho: 0 }
        }
      };
    }
    if (!r.stats.achievements) {
      r.stats.achievements = { 
        kinboshiEarned: 0, 
        ginboshiEarned: 0, 
        kinboshiConceded: 0, 
        ginboshiConceded: 0,
        specialPrizes: { shukunSho: 0, kantoSho: 0, ginoSho: 0 }
      };
    }
    if (!r.stats.achievements.specialPrizes) {
      r.stats.achievements.specialPrizes = { shukunSho: 0, kantoSho: 0, ginoSho: 0 };
    }

    // Increment stat
    if (type === 'Shukun') r.stats.achievements.specialPrizes.shukunSho++;
    else if (type === 'Kanto') r.stats.achievements.specialPrizes.kantoSho++;
    else if (type === 'Gino') r.stats.achievements.specialPrizes.ginoSho++;

    // Emit event
    EventBus.specialPrizesAwarded(world, r.id, r.heyaId, type, SANSHO_PRIZE_AMOUNT);

    // Treasury Injection
    const heya = world.heyas.get(r.heyaId);
    if (heya) {
      heya.funds += SANSHO_PRIZE_AMOUNT;
    }
  };

  processAward(awards.shukunsho, 'Shukun');
  processAward(awards.kantosho, 'Kanto');
  processAward(awards.ginoSho, 'Gino');

  world.history.push(bashoResult);

  // --- ALMANAC SNAPSHOT (Constitution A5.1) ---
  safeCall(() => {
    const snapshot = buildAlmanacSnapshot(world);
    if (snapshot) {
      if (!world.almanacSnapshots) world.almanacSnapshots = [];
      world.almanacSnapshots.push(snapshot);
    }
  });

  safeCall(() => historyIndex.indexBashoResult(world, bashoResult));
  const yushoRikishi = world.rikishi.get(yusho);
  EventBus.bashoEnded(world, basho.bashoName, yusho, yushoRikishi?.shikona ?? yushoRikishi?.name ?? "Unknown");

  // Snapshot media heat for sparkline history
  safeCall(() => {
    if (world.mediaState) {
      world.mediaState = snapshotMediaHeatForBasho(world.mediaState, basho.bashoName);
    }
  });

  enterPostBasho(world);

  // --- FTUE UPDATE (Constitution A8) ---
  if (world.ftue?.isActive) {
    world.ftue.bashoCompleted += 1;
    if (world.ftue.bashoCompleted >= 1) {
      world.ftue.isActive = false;
    }
  }

  // --- POST-BASHO RESOLUTION PIPELINE (Constitution A3.4 / §6.3) ---
  runPostBashoResolution(world);

  // Autosave at basho-end boundary (Constitution §6)
  safeCall(() => { autosave(world); });

  return world;
}

// ═══════════════════════════════════════════════════════════════════
// POST-BASHO RESOLUTION PIPELINE (Constitution A3.4 / §6.3)
// ═══════════════════════════════════════════════════════════════════

/**
 * runPostBashoResolution
 * Authoritative post-basho pipeline per Constitution A3.4 & §6.3:
 *  1. Prestige decay & recalculation (with Constitution erosion curves)
 *  2. Governance institutional review (council reactions, loans, mergers, succession)
 *  3. AI meta drift seeding (A6.1 — recognition delay)
 *  4. Lifecycle management (retirements)
 *  5. Recruitment windows (NPC vacancy filling + player notification + window state)
 *  6. Sponsor churn (Addendum D — satisfaction-based churn)
 *  7. Records/streaks/career journal updates
 */
function runPostBashoResolution(world: WorldState): void {
  // === 1. PRESTIGE DECAY & RECALCULATION ===
  runPrestigeDecay(world);

  // === 2. GOVERNANCE INSTITUTIONAL REVIEW ===
  runGovernanceReview(world);

  // === 3. AI META DRIFT SEEDING (A6.1) ===
  safeCall(() => runAIMetaDrift(world));

  // === 4. LIFECYCLE MANAGEMENT (retirements) ===
  const vacanciesByHeyaId = runRetirements(world);

  // === 5. RECRUITMENT WINDOWS (NPC stables fill vacancies) ===
  runRecruitmentWindow(world, vacanciesByHeyaId);

  // === 6. SPONSOR CHURN (Constitution Addendum D) ===
  safeCall(() => { runSponsorChurn(world); });

  // === 7. RECORDS/STREAKS/CAREER JOURNAL UPDATES ===
  runCareerJournalUpdates(world);
  onBashoEnded(world);
  runHistoryUpdates(world);

  // === 7.1 ARCHIVAL PRUNING (Year-end) ===
  if (world.calendar.month === 11) { // November is the last basho
    runArchivalPruning(world);
  }

  // === 8. FUTURE NATURALIZATION ===
  checkNaturalizations(world);
}

// ─── 1. PRESTIGE DECAY (Constitution A3.4) ─────────────────────

const PRESTIGE_ORDER: import("./types").PrestigeBand[] = ["unknown", "struggling", "modest", "respected", "elite"];
const bandIndex = (b: import("./types").PrestigeBand) => PRESTIGE_ORDER.indexOf(b);

/**
 * Prestige decay per A3.4:
 * - Elite stables must maintain performance or erode
 * - Multi-basho stagnation accelerates decay
 * - Yūshō/sanshō provide upward shifts
 * - Small stables face extra fragility
 */
// runPrestigeDecay moved to prestigeSystem.ts

/**
 * Update stature band based on roster rank composition.
 */
// updateStatureBand moved to prestigeSystem.ts

// runGovernanceReview, runRetirements, runAIMetaDrift moved to governanceReview.ts

// runAIMetaDrift moved to governanceReview.ts

// runRetirements moved to governanceReview.ts

// ─── 5. RECRUITMENT WINDOWS (Constitution A3.4) ────────────────

/**
 * Recruitment window — per Constitution, recruitment occurs at:
 *   1) Post-basho review (here)
 *   2) Mid-interim (week 3) — handled in dailyTick weekly gate
 *
 * NPC stables auto-fill from talent pool.
 * Player gets a recruitment window event with duration tracking.
 */
function runRecruitmentWindow(world: WorldState, vacanciesByHeyaId: Record<string, number>): void {
  // NPC stables auto-fill from talent pool
  safeCall(() => talentpool.fillVacanciesForNPC(world, vacanciesByHeyaId));

  // Track recruitment window state for player
  const playerHeyaId = world.playerHeyaId;
  const playerHeya = playerHeyaId ? world.heyas.get(playerHeyaId) : null;
  const playerVacancies = playerHeyaId ? (vacanciesByHeyaId[playerHeyaId] ?? 0) : 0;

  if (playerHeya) {
    // Set recruitment window state on world (consumed by UI and dailyTick)
    world._recruitmentWindow = {
      openedAtWeek: world.week,
      closesAtWeek: world.week + 4, // 4-week window per Constitution
      vacancies: playerVacancies,
      isOpen: true,
      phase: "post_basho"
    };

    logEngineEvent(world, {
      type: "RECRUITMENT_WINDOW_OPEN",
      category: "career",
      importance: playerVacancies > 0 ? "major" : "notable",
      scope: "heya",
      heyaId: playerHeya.id,
      title: "Recruitment window open",
      summary: playerVacancies > 0
        ? `${playerVacancies} spot(s) opened due to retirements. You have 4 weeks to recruit from the talent pools.`
        : "The post-basho recruitment window is open for 4 weeks. Scout and sign new talent.",
      data: {
        vacancies: playerVacancies,
        rosterSize: getStableRikishi(world, playerHeya.id).length,
        windowDuration: 4,
        closesAtWeek: world.week + 4
      }
    });
  }

  // Log total NPC recruitment activity
  let totalNPCVacancies = 0;
  for (const id in vacanciesByHeyaId) {
    if (id !== playerHeyaId) {
      totalNPCVacancies += vacanciesByHeyaId[id];
    }
  }

  if (totalNPCVacancies > 0) {
    logEngineEvent(world, {
      type: "NPC_RECRUITMENT_SUMMARY",
      category: "career",
      importance: "minor",
      scope: "world",
      title: "NPC stables recruit",
      summary: `${totalNPCVacancies} recruit(s) signed across rival stables during the post-basho window.`,
      data: { totalVacanciesFilled: totalNPCVacancies }
    });
  }
}

// ─── 7. CAREER JOURNAL UPDATES (A3.4) ──────────────────────────

/**
 * Update career records, streaks, and HoF eligibility.
 * Per A3.4: "records/streaks/HoF eligibility recompute (post-lock only)"
 */
function runCareerJournalUpdates(world: WorldState): void {
  const lastBasho = world.history[world.history.length - 1];
  if (!lastBasho) return;

  for (const r of getActiveRikishi(world)) {
    // Update career totals from basho records
    r.careerWins = (r.careerWins ?? 0) + (r.currentBashoWins ?? 0);
    r.careerLosses = (r.careerLosses ?? 0) + (r.currentBashoLosses ?? 0);

    // Update career record helper
    r.careerRecord = {
      wins: r.careerWins,
      losses: r.careerLosses,
      yusho: (r.careerRecord?.yusho ?? 0) + (lastBasho.yusho === r.id ? 1 : 0)
    };

    // Momentum update based on basho performance
    const bw = r.currentBashoWins ?? 0;
    const bl = r.currentBashoLosses ?? 0;
    if (bw + bl > 0) {
      const winRate = bw / (bw + bl);
      if (winRate >= 0.7) r.momentum = Math.min(5, (r.momentum ?? 0) + 2);
      else if (winRate >= 0.55) r.momentum = Math.min(5, (r.momentum ?? 0) + 1);
      else if (winRate < 0.35) r.momentum = Math.max(-5, (r.momentum ?? 0) - 2);
      else if (winRate < 0.45) r.momentum = Math.max(-5, (r.momentum ?? 0) - 1);
    }

    // HoF eligibility flag (yokozuna with 500+ wins)
    if (r.rank === "yokozuna" && r.careerWins >= 500) {
      logEngineEvent(world, {
        type: "HOF_ELIGIBLE",
        category: "milestone",
        importance: "headline",
        scope: "rikishi",
        rikishiId: r.id,
        heyaId: r.heyaId,
        title: `${r.shikona ?? r.name} eligible for Hall of Fame`,
        summary: `With ${r.careerWins} career wins, ${r.shikona ?? r.name} has reached Hall of Fame eligibility.`,
        data: { careerWins: r.careerWins }
      });
    }

    // Milestone events
    if (r.careerWins === 100 || r.careerWins === 200 || r.careerWins === 300 || r.careerWins === 500) {
      logEngineEvent(world, {
        type: "CAREER_WINS_MILESTONE",
        category: "milestone",
        importance: r.careerWins >= 300 ? "major" : "notable",
        scope: "rikishi",
        rikishiId: r.id,
        heyaId: r.heyaId,
        title: `${r.shikona ?? r.name} reaches ${r.careerWins} career wins`,
        summary: `A distinguished milestone for ${r.shikona ?? r.name}.`,
        data: { careerWins: r.careerWins }
      });
    }
  }
}

/**
 * Publish banzuke update.
 *  * @param world - The World.
 *  * @returns The result.
 */
export function publishBanzukeUpdate(world: WorldState): WorldState {
  if (world.cyclePhase !== "post_basho") return world;

  const lastBasho = getCurrentBasho(world);
  if (!lastBasho) return world;

  const currentBanzukeList: BanzukeEntry[] = [];
  for (const r of world.rikishi.values()) {
    currentBanzukeList.push({
      rikishiId: r.id,
      division: r.division,
      position: toRankPosition({ rank: r.rank, rankNumber: r.rankNumber, side: r.side })
    });
  }

  const performanceList: BashoPerformance[] = [];
  for (const [id, stats] of lastBasho.standings.entries()) {
    const history = world.history[world.history.length - 1];
    const isYusho = history.yusho === id;
    const isJunYusho = history.junYusho.includes(id);

    let prizePoints = 0;
    if (history.ginoSho === id) prizePoints += 1;
    if (history.shukunsho === id) prizePoints += 1;
    if (history.kantosho === id) prizePoints += 1;

    performanceList.push({
      rikishiId: id,
      wins: stats.wins,
      losses: stats.losses,
      absences: 0, 
      yusho: isYusho,
      junYusho: isJunYusho,
      specialPrizes: prizePoints
    });
  }

  const perfMap = new Map(performanceList.map(p => [p.rikishiId, p]));
  const result = updateBanzuke(currentBanzukeList, perfMap, world.ozekiKadoban ?? {}, world.heyas);
  
  // Persist updated kadoban state
  world.ozekiKadoban = result.updatedOzekiKadoban;

  for (const newEntry of result.newBanzuke) {
    const rikishi = world.rikishi.get(newEntry.rikishiId);
    if (rikishi) {
      rikishi.division = newEntry.division;
      rikishi.rank = newEntry.position.rank;
      rikishi.rankNumber = newEntry.position.rankNumber;
      rikishi.side = newEntry.position.side;
      
      rikishi.currentBashoWins = 0;
      rikishi.currentBashoLosses = 0;
    }
  }

  const next = getNextBasho(lastBasho.bashoName);
  const nextYear = next === "hatsu" ? world.year + 1 : world.year;

  world.year = nextYear;
  world.currentBashoName = next;
  world.currentBasho = undefined;
  enterInterim(world);

  return world;
}

/**
 * Advance interim.
 *  * @param world - The World.
 *  * @param weeks - The Weeks.
 *  * @returns The result.
 */
export function advanceInterim(world: WorldState, weeks: number = 1): WorldState {
  if (world.cyclePhase !== "interim" && world.cyclePhase !== "pre_basho" && world.cyclePhase !== "post_basho") return world;

  // Convert weeks to days and run through the daily tick pipeline
  const days = Math.max(1, Math.trunc(weeks)) * 7;

  for (let i = 0; i < days; i++) {
    advanceOneDay(world);
    // Stop if we've transitioned into active_basho (UI should handle this)
    if ((world.cyclePhase as string) === "active_basho") break;
  }

  return world;
}

/**
 * Advance a single day in the interim period.
 * Used by UI for granular day-by-day control.
 */
export function advanceDay(world: WorldState): DailyTickReport | null {
  if (world.cyclePhase === "active_basho") return null;
  return advanceOneDay(world);
}

// redundant safeCall removed
// --- CANONICAL SELECTORS ---

export function getPlayerOyakata(world: WorldState) {
    if (!world.playerHeyaId) return undefined;
    const heya = world.heyas.get(world.playerHeyaId);
    if (!heya) return undefined;
    return world.oyakata.get(heya.oyakataId);
}

export function getPlayerStable(world: WorldState) {
    if (!world.playerHeyaId) return undefined;
    return world.heyas.get(world.playerHeyaId);
}

// getStableRikishi moved to queries.ts

export function getRikishiBashoStats(world: WorldState, rikishiId: string) {
    if (!world.basho?.leaderboard) {
        return { wins: 0, losses: 0, absences: 0 };
    }
    const stats = world.basho.leaderboard[rikishiId];
    if (!stats) {
        return { wins: 0, losses: 0, absences: 0 };
    }
    return {
        wins: stats.wins || 0,
        losses: stats.losses || 0,
        absences: stats.absences || 0
    };
}
