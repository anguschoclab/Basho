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

import { rngFromSeed, rngForWorld } from "./rng";
import { SeededRNG } from "./utils/SeededRNG";
import type { WorldState, BashoName, BoutResult, Id, MatchSchedule, BashoState } from "./types";
import { toRankPosition } from "./types";
import type { BashoPerformance, BanzukeEntry } from "./banzuke";
import { initializeBasho } from "./worldgen";
import { getNextBasho } from "./calendar";
import { resolveBout } from "./bout";
import { EventBus, logEngineEvent } from "./events";
import { advanceOneDay, enterPostBasho, enterInterim, type DailyTickReport } from "./dailyTick";
import { buildAlmanacSnapshot } from "./almanac";
import { autosave } from "./saveload";
import { runSponsorChurn } from "./economics";
import * as schedule from "./schedule";
import * as events from "./events";
import * as injuries from "./injuries";
import * as rivalries from "./rivalries";
import * as economics from "./economics";
import * as governance from "./governance";
import * as welfare from "./welfare";
import * as npcAI from "./npcAI";
import * as scoutingStore from "./scoutingStore";
import * as historyIndex from "./historyIndex";
import * as training from "./training"; 
import * as talentpool from "./talentpool";
import { determineSpecialPrizes, updateBanzuke } from "./banzuke"; 
import { checkRetirement } from "./lifecycle";

// Type guard or helper to access current basho
function getCurrentBasho(world: WorldState): BashoState | undefined {
  return world.currentBasho;
}

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

  return world;
}

export function ensureDaySchedule(world: WorldState, day: number): WorldState {
  const basho = getCurrentBasho(world);
  if (!basho) return world;

  const already = basho.matches.some((m) => m.day === day);
  if (already) return world;

  // Assuming schedule module is updated or compatible hooks exist
  // For now, we stub a basic schedule generator if external one fails
  if (typeof (schedule as any).generateDaySchedule === "function") {
    (schedule as any).generateDaySchedule(world, basho, day, world.seed);
  } else {
      // Basic fallback scheduling
      const rikishiIds = Array.from(world.rikishi.keys());
      // Simple random pairing
      for(let i=0; i<rikishiIds.length; i+=2) {
          if (i+1 < rikishiIds.length) {
              basho.matches.push({
                  day,
                  eastRikishiId: rikishiIds[i],
                  westRikishiId: rikishiIds[i+1]
              });
          }
      }
  }
  return world;
}

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

export function simulateBoutForToday(
  world: WorldState,
  unplayedIndex: number
): { world: WorldState; result?: BoutResult } {
  const basho = getCurrentBasho(world);
  if (!basho) return { world };

  const todays = basho.matches.filter((m) => m.day === basho.day && !m.result);
  const match = todays[unplayedIndex];
  if (!match) return { world };

  const east = world.rikishi.get(match.eastRikishiId);
  const west = world.rikishi.get(match.westRikishiId);
  if (!east || !west) return { world };

  const boutContext = {
      id: `d${basho.day}-b${unplayedIndex}`,
      day: basho.day,
      rikishiEastId: east.id,
      rikishiWestId: west.id,
      division: east.division
  };

  const result = resolveBout(boutContext, east, west, basho);

  applyBoutResult(world, match, result);
  return { world, result };
}

export function applyBoutResult(
  world: WorldState,
  match: MatchSchedule,
  result: BoutResult,
  _opts?: { boutSeed?: string }
): WorldState {
  const basho = getCurrentBasho(world);
  if (!basho) return world;

  match.result = result;

  const east = world.rikishi.get(match.eastRikishiId);
  const west = world.rikishi.get(match.westRikishiId);
  if (!east || !west) return world;

  const winner = result.winner === "east" ? east : west;
  const loser = result.winner === "east" ? west : east;

  // Safe increments handled in resolveBout mostly, but ensures world consistency here
  // Standings update
  const standings = basho.standings;
  const wRec = standings.get(winner.id) || { wins: 0, losses: 0 };
  const lRec = standings.get(loser.id) || { wins: 0, losses: 0 };
  standings.set(winner.id, { wins: wRec.wins + 1, losses: wRec.losses });
  standings.set(loser.id, { wins: lRec.wins, losses: lRec.losses + 1 });

  safeCall(() => (injuries as any).onBoutResolved?.(world, { match, result, east, west }));
  safeCall(() => (rivalries as any).onBoutResolved?.(world, { match, result, east, west }));
  safeCall(() => (economics as any).onBoutResolved?.(world, { match, result, east, west }));
  safeCall(() => (scoutingStore as any).onBoutResolved?.(world, { match, result, east, west }));

  // Emit canonical bout result event
  EventBus.boutResult(world, result.winnerRikishiId, result.loserRikishiId, result.kimarite ?? "unknown", match.day);

  return world;
}

export function endBasho(world: WorldState): WorldState {
  const basho = getCurrentBasho(world);
  if (!basho) return world;

  const table = Array.from(basho.standings.entries())
    .map(([id, rec]) => ({ id, wins: rec.wins, losses: rec.losses }))
    .sort((a, b) => b.wins - a.wins || a.losses - b.losses);

  if (table.length === 0) return world;

  const bestWins = table[0].wins;
  const topCandidates = table.filter(t => t.wins === bestWins).map(t => t.id);
  
  let yusho = topCandidates[0];
  const playoffMatches: MatchSchedule[] = [];
  
  if (topCandidates.length > 1) {
      yusho = topCandidates[0]; 
  }

  const runnerWins = bestWins - 1;
  const junYusho = table
    .filter(t => (t.wins === bestWins && t.id !== yusho) || t.wins === runnerWins)
    .map(t => t.id);

  const awards = determineSpecialPrizes(
    basho.matches, 
    world.rikishi as any,
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

  world.history.push(bashoResult);

  // --- ALMANAC SNAPSHOT (Constitution A5.1) ---
  safeCall(() => {
    const snapshot = buildAlmanacSnapshot(world);
    if (snapshot) {
      if (!world.almanacSnapshots) world.almanacSnapshots = [];
      world.almanacSnapshots.push(snapshot);
    }
  });

  safeCall(() => (historyIndex as any).indexBashoResult?.(world, bashoResult));
  const yushoRikishi = world.rikishi.get(yusho);
  EventBus.bashoEnded(world, basho.bashoName, yusho, yushoRikishi?.shikona ?? yushoRikishi?.name ?? "Unknown");

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
 *  1. Prestige decay & recalculation
 *  2. Governance institutional review
 *  3. Lifecycle management (retirements)
 *  4. Recruitment windows (NPC vacancy filling)
 *  5. Sponsor churn
 *  6. Records/streaks/career journal updates
 */
function runPostBashoResolution(world: WorldState): void {
  const basho = getCurrentBasho(world);

  // === 1. PRESTIGE DECAY & RECALCULATION ===
  runPrestigeDecay(world);

  // === 2. GOVERNANCE INSTITUTIONAL REVIEW ===
  runGovernanceReview(world);

  // === 3. LIFECYCLE MANAGEMENT (retirements) ===
  const vacanciesByHeyaId = runRetirements(world);

  // === 4. RECRUITMENT WINDOWS (NPC stables fill vacancies) ===
  runRecruitmentWindow(world, vacanciesByHeyaId);

  // === 5. SPONSOR CHURN (Constitution Addendum D) ===
  safeCall(() => { runSponsorChurn(world); });

  // === 6. RECORDS/STREAKS/CAREER JOURNAL UPDATES ===
  runCareerJournalUpdates(world);
}

/**
 * Prestige decay — stables that didn't perform well see prestige erode.
 * Yūshō winners and strong performers gain prestige.
 * Per A3.4: "prestige shifts" happen post-basho.
 */
function runPrestigeDecay(world: WorldState): void {
  const lastBasho = world.history[world.history.length - 1];
  if (!lastBasho) return;

  const PRESTIGE_ORDER: import("./types").PrestigeBand[] = ["unknown", "struggling", "modest", "respected", "elite"];
  const bandIndex = (b: import("./types").PrestigeBand) => PRESTIGE_ORDER.indexOf(b);

  for (const heya of world.heyas.values()) {
    // Compute heya performance this basho
    let totalWins = 0;
    let totalLosses = 0;
    let hasYusho = false;
    let hasJunYusho = false;
    let hasSanshoPrize = false;

    for (const rId of heya.rikishiIds) {
      const r = world.rikishi.get(rId);
      if (!r) continue;
      totalWins += r.currentBashoWins ?? 0;
      totalLosses += r.currentBashoLosses ?? 0;

      if (lastBasho.yusho === rId) hasYusho = true;
      if (lastBasho.junYusho.includes(rId)) hasJunYusho = true;
      if (lastBasho.ginoSho === rId || lastBasho.kantosho === rId || lastBasho.shukunsho === rId) {
        hasSanshoPrize = true;
      }
    }

    const totalBouts = totalWins + totalLosses;
    const winRate = totalBouts > 0 ? totalWins / totalBouts : 0.5;

    const currentIdx = bandIndex(heya.prestigeBand);
    let shift = 0;

    // Positive prestige
    if (hasYusho) shift += 2;
    else if (hasJunYusho) shift += 1;
    if (hasSanshoPrize) shift += 1;
    if (winRate >= 0.65 && totalBouts >= 10) shift += 1;

    // Prestige decay — passive erosion for average/poor performance
    if (winRate < 0.4 && totalBouts >= 10) shift -= 1;
    if (winRate < 0.3 && totalBouts >= 10) shift -= 1;

    // Natural decay for elite stables — must maintain performance
    if (heya.prestigeBand === "elite" && !hasYusho && !hasJunYusho && winRate < 0.55) {
      shift -= 1;
    }

    // Apply clamped shift
    const newIdx = Math.max(0, Math.min(PRESTIGE_ORDER.length - 1, currentIdx + shift));
    const newBand = PRESTIGE_ORDER[newIdx];

    if (newBand !== heya.prestigeBand) {
      const direction = newIdx > currentIdx ? "rose" : "fell";
      logEngineEvent(world, {
        type: "PRESTIGE_SHIFT",
        category: "milestone",
        importance: Math.abs(shift) >= 2 ? "major" : "notable",
        scope: "heya",
        heyaId: heya.id,
        title: `${heya.name} prestige ${direction}`,
        summary: `${heya.name}'s prestige ${direction} to "${newBand}" after the basho.`,
        data: { from: heya.prestigeBand, to: newBand, winRate: Math.round(winRate * 100), shift }
      });
      heya.prestigeBand = newBand;
    }

    // Also update stature band based on roster composition
    updateStatureBand(world, heya);

    // Reputation drift aligned with prestige
    const reputationDelta = shift * 5;
    heya.reputation = Math.max(0, Math.min(100, (heya.reputation ?? 50) + reputationDelta));
  }
}

/**
 * Update stature band based on roster rank composition.
 */
function updateStatureBand(world: WorldState, heya: import("./types").Heya): void {
  let maxRankWeight = 0;
  let rosterScore = 0;
  const RANK_WEIGHT: Record<string, number> = {
    yokozuna: 100, ozeki: 80, sekiwake: 60, komusubi: 50,
    maegashira: 30, juryo: 15, makushita: 8, sandanme: 4,
    jonidan: 2, jonokuchi: 1
  };

  for (const rId of heya.rikishiIds) {
    const r = world.rikishi.get(rId);
    if (!r) continue;
    const w = RANK_WEIGHT[r.rank] ?? 5;
    rosterScore += w;
    if (w > maxRankWeight) maxRankWeight = w;
  }

  const avgScore = heya.rikishiIds.length > 0 ? rosterScore / heya.rikishiIds.length : 0;

  if (maxRankWeight >= 100 && avgScore >= 40) heya.statureBand = "legendary";
  else if (maxRankWeight >= 60 && avgScore >= 30) heya.statureBand = "powerful";
  else if (avgScore >= 20) heya.statureBand = "established";
  else if (avgScore >= 10) heya.statureBand = "rebuilding";
  else if (heya.rikishiIds.length >= 3) heya.statureBand = "fragile";
  else heya.statureBand = "new";
}

/**
 * Governance institutional review — post-basho sanctions, warnings, reviews.
 * Per §6.3 step 6: "Governance review pass (sanction triggers, merger/closure pressures)"
 */
function runGovernanceReview(world: WorldState): void {
  for (const heya of world.heyas.values()) {
    const welfareState = heya.welfareState;
    const scandalScore = heya.scandalScore ?? 0;

    // Financial insolvency check
    if (heya.funds < 0 && heya.runwayBand === "desperate") {
      heya.riskIndicators.financial = true;
      governance.reportScandal(world, heya.id, "minor", "Financial insolvency at basho end");
      logEngineEvent(world, {
        type: "INSOLVENCY_WARNING",
        category: "economy",
        importance: "headline",
        scope: "heya",
        heyaId: heya.id,
        title: `${heya.name} facing insolvency`,
        summary: `${heya.name} ended the basho with negative funds and desperate runway.`,
        data: { funds: heya.funds, runway: heya.runwayBand }
      });
    }

    // Welfare review escalation
    if (welfareState && welfareState.complianceState === "sanctioned") {
      logEngineEvent(world, {
        type: "POST_BASHO_WELFARE_REVIEW",
        category: "welfare",
        importance: "major",
        scope: "heya",
        heyaId: heya.id,
        title: `${heya.name} welfare review`,
        summary: `Post-basho institutional review: ${heya.name} remains under sanctions for welfare violations.`,
        data: { complianceState: welfareState.complianceState, welfareRisk: welfareState.welfareRisk }
      });
    }

    // Merger/closure pressure for extremely small stables
    if (heya.rikishiIds.length < 3 && heya.id !== world.playerHeyaId) {
      logEngineEvent(world, {
        type: "CLOSURE_PRESSURE",
        category: "discipline",
        importance: "major",
        scope: "heya",
        heyaId: heya.id,
        title: `${heya.name} under closure pressure`,
        summary: `${heya.name} has fewer than 3 wrestlers — the association is reviewing viability.`,
        data: { rosterSize: heya.rikishiIds.length }
      });
    }

    // Post-basho scandal score review: slight additional decay reward for clean basho
    if (scandalScore > 0 && heya.governanceStatus === "good_standing") {
      heya.scandalScore = Math.max(0, scandalScore - 2);
    }
  }
}

/**
 * Process retirements and return vacancy counts per heya.
 */
function runRetirements(world: WorldState): Record<string, number> {
  console.log("Processing End of Basho Lifecycle...");
  const vacanciesByHeyaId: Record<string, number> = {};

  for (const [id, r] of world.rikishi) {
    const reason = checkRetirement(r as any, world.year, world.seed);
    if (reason) {
      EventBus.retirement(world, id, r.heyaId, r.shikona ?? r.name ?? id, reason);
      vacanciesByHeyaId[r.heyaId] = (vacanciesByHeyaId[r.heyaId] || 0) + 1;

      world.rikishi.delete(id);
      const heya = world.heyas.get(r.heyaId);
      if (heya) {
        heya.rikishiIds = heya.rikishiIds.filter(rid => rid !== id);
      }
    }
  }

  return vacanciesByHeyaId;
}

/**
 * Recruitment window — NPC stables fill vacancies from talent pool.
 * Player heya gets notified of available recruits but doesn't auto-fill.
 * Per A3.4: "recruitment windows fire (player + NPC)"
 */
function runRecruitmentWindow(world: WorldState, vacanciesByHeyaId: Record<string, number>): void {
  // NPC stables auto-fill from talent pool
  safeCall(() => (talentpool as any).fillVacanciesForNPC?.(world, vacanciesByHeyaId));

  // Emit recruitment window event for player
  const playerVacancies = world.playerHeyaId ? (vacanciesByHeyaId[world.playerHeyaId] ?? 0) : 0;
  const playerHeya = world.playerHeyaId ? world.heyas.get(world.playerHeyaId) : null;

  if (playerHeya) {
    logEngineEvent(world, {
      type: "RECRUITMENT_WINDOW_OPEN",
      category: "career",
      importance: playerVacancies > 0 ? "major" : "notable",
      scope: "heya",
      heyaId: playerHeya.id,
      title: "Recruitment window open",
      summary: playerVacancies > 0
        ? `${playerVacancies} spot(s) opened due to retirements. Visit Talent Pools to recruit.`
        : "The post-basho recruitment window is open. Scout and sign new talent.",
      data: { vacancies: playerVacancies, rosterSize: playerHeya.rikishiIds.length }
    });
  }

  // Log total NPC recruitment activity
  const totalNPCVacancies = Object.entries(vacanciesByHeyaId)
    .filter(([id]) => id !== world.playerHeyaId)
    .reduce((sum, [, v]) => sum + v, 0);

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

/**
 * Update career records, streaks, and HoF eligibility.
 * Per A3.4: "records/streaks/HoF eligibility recompute (post-lock only)"
 */
function runCareerJournalUpdates(world: WorldState): void {
  const lastBasho = world.history[world.history.length - 1];
  if (!lastBasho) return;

  for (const r of world.rikishi.values()) {
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

  const result = updateBanzuke(currentBanzukeList, performanceList, {}); 

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

function safeCall(fn: () => void) {
  try {
    fn();
  } catch {
    // Intentionally swallow
  }
}