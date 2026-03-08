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
import { updateMediaFromBout, createDefaultMediaState, resetBashoMediaTracking, snapshotMediaHeatForBasho } from "./media";
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

  // Reset basho-scoped media tracking (streaks, promo watch)
  if (world.mediaState) {
    world.mediaState = resetBashoMediaTracking(world.mediaState);
  }

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

  // Track kinboshi count on winner's economics
  if (result.isKinboshi) {
    if (!winner.economics) {
      winner.economics = { cash: 0, retirementFund: 0, careerKenshoWon: 0, kinboshiCount: 0, totalEarnings: 0, currentBashoEarnings: 0, popularity: 50 };
    }
    winner.economics.kinboshiCount = (winner.economics.kinboshiCount || 0) + 1;
  }

  safeCall(() => injuries.onBoutResolved(world, { match, result, east, west }));
  safeCall(() => rivalries.onBoutResolved(world, { match, result, east, west }));
  safeCall(() => economics.onBoutResolved(world, { match, result, east, west }));
  safeCall(() => scoutingStore.onBoutResolved(world, { match, result, east, west }));

  // Update media from bout (generates headlines, media heat, heya pressure)
  safeCall(() => {
    const w = world as any;
    if (!w.mediaState) w.mediaState = createDefaultMediaState();
    const { state } = updateMediaFromBout({
      state: w.mediaState,
      world,
      result,
      day: match.day,
      bashoName: world.currentBashoName,
      division: east.division,
      rivalries: (world as any).rivalriesState,
    });
    w.mediaState = state;
  });

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
        const match: MatchSchedule = {
          day: 16 + playoffRound - 1,
          eastRikishiId: eastId,
          westRikishiId: westId,
          result,
        };
        playoffMatches.push(match);
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

  safeCall(() => historyIndex.indexBashoResult(world, bashoResult));
  const yushoRikishi = world.rikishi.get(yusho);
  EventBus.bashoEnded(world, basho.bashoName, yusho, yushoRikishi?.shikona ?? yushoRikishi?.name ?? "Unknown");

  // Snapshot media heat for sparkline history
  safeCall(() => {
    const w = world as any;
    if (w.mediaState) {
      w.mediaState = snapshotMediaHeatForBasho(w.mediaState, basho.bashoName);
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
function runPrestigeDecay(world: WorldState): void {
  const lastBasho = world.history[world.history.length - 1];
  if (!lastBasho) return;

  for (const heya of world.heyas.values()) {
    let totalWins = 0;
    let totalLosses = 0;
    let hasYusho = false;
    let hasJunYusho = false;
    let sanshoPrizeCount = 0;
    let sekitoriCount = 0;

    for (const rId of heya.rikishiIds) {
      const r = world.rikishi.get(rId);
      if (!r) continue;
      totalWins += r.currentBashoWins ?? 0;
      totalLosses += r.currentBashoLosses ?? 0;

      if (lastBasho.yusho === rId) hasYusho = true;
      if (lastBasho.junYusho.includes(rId)) hasJunYusho = true;
      if (lastBasho.ginoSho === rId) sanshoPrizeCount++;
      if (lastBasho.kantosho === rId) sanshoPrizeCount++;
      if (lastBasho.shukunsho === rId) sanshoPrizeCount++;

      if (r.division === "makuuchi" || r.division === "juryo") sekitoriCount++;
    }

    const totalBouts = totalWins + totalLosses;
    const winRate = totalBouts > 0 ? totalWins / totalBouts : 0.5;

    const currentIdx = bandIndex(heya.prestigeBand);
    let shift = 0;

    // === Positive prestige gains ===
    if (hasYusho) shift += 2;
    else if (hasJunYusho) shift += 1;
    if (sanshoPrizeCount >= 2) shift += 1;
    else if (sanshoPrizeCount === 1) shift += (winRate >= 0.55 ? 1 : 0);
    if (winRate >= 0.65 && totalBouts >= 10) shift += 1;

    // === Prestige decay — passive erosion for average/poor performance ===
    if (winRate < 0.4 && totalBouts >= 10) shift -= 1;
    if (winRate < 0.3 && totalBouts >= 10) shift -= 1; // double penalty for terrible basho

    // === Elite erosion — must maintain excellence ===
    if (heya.prestigeBand === "elite") {
      if (!hasYusho && !hasJunYusho && winRate < 0.55) shift -= 1;
      if (sekitoriCount === 0) shift -= 1; // no sekitori = severe erosion
    }

    // === Multi-basho stagnation check ===
    // If a stable has been "struggling" or "unknown" for multiple consecutive basho,
    // recovery becomes harder (no free climb without results)
    if (heya.prestigeBand === "unknown" && winRate < 0.5 && !hasYusho) {
      shift = Math.min(shift, 0); // can't climb from "unknown" without a strong result
    }
    if (heya.prestigeBand === "struggling" && winRate < 0.45 && !hasJunYusho && !hasYusho) {
      shift = Math.min(shift, 0); // gate recovery behind results
    }

    // === Small stable fragility ===
    if (heya.rikishiIds.length < 5 && heya.prestigeBand !== "unknown") {
      shift -= 1; // tiny stables slowly lose prestige
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
        summary: `${heya.name}'s prestige ${direction} to "${newBand}" after the basho.${
          shift <= -2 ? " A sharp decline — the sumo world takes notice." : ""
        }`,
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

// ─── 2. GOVERNANCE INSTITUTIONAL REVIEW (§6.3 step 6) ──────────

/**
 * Post-basho governance: institutional sanctions, council reactions,
 * loans/benefactors escalation, succession checks, merger/closure pressure.
 */
function runGovernanceReview(world: WorldState): void {
  for (const heya of world.heyas.values()) {
    const welfareState = heya.welfareState;
    const scandalScore = heya.scandalScore ?? 0;

    // === Financial insolvency check ===
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
        summary: `${heya.name} ended the basho with negative funds and desperate runway. The Association may intervene.`,
        data: { funds: heya.funds, runway: heya.runwayBand }
      });

      // === Loans/benefactors escalation (Constitution §4.4) ===
      // If a stable is insolvent, the Association may provide an emergency loan
      // or a benefactor may step in — but at a cost to autonomy.
      if (heya.funds < -5_000_000) {
        const emergencyLoan = Math.abs(heya.funds) * 0.5; // Cover half the deficit
        heya.funds += emergencyLoan;

        logEngineEvent(world, {
          type: "EMERGENCY_LOAN_ISSUED",
          category: "economy",
          importance: "major",
          scope: "heya",
          heyaId: heya.id,
          title: `Emergency loan for ${heya.name}`,
          summary: `The Association issues an emergency loan to prevent ${heya.name}'s collapse. Increased scrutiny follows.`,
          data: { loanAmount: emergencyLoan, remainingDebt: heya.funds }
        });

        // Loans bring governance scrutiny
        heya.scandalScore = Math.min(100, (heya.scandalScore ?? 0) + 5);
      }
    } else if (heya.funds > 0 && heya.runwayBand !== "desperate") {
      // Clear financial risk indicator when no longer desperate
      heya.riskIndicators.financial = false;
    }

    // === Welfare review escalation ===
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

      // Sanctioned stables face additional prestige erosion
      const currentIdx = bandIndex(heya.prestigeBand);
      if (currentIdx > 0) {
        const newBand = PRESTIGE_ORDER[currentIdx - 1];
        heya.prestigeBand = newBand;
        logEngineEvent(world, {
          type: "PRESTIGE_SHIFT",
          category: "discipline",
          importance: "notable",
          scope: "heya",
          heyaId: heya.id,
          title: `${heya.name} prestige damaged by sanctions`,
          summary: `Ongoing sanctions erode ${heya.name}'s standing in the sumo world.`,
          data: { from: PRESTIGE_ORDER[currentIdx], to: newBand, reason: "sanctions" }
        });
      }
    }

    // === Council scandal reaction ===
    if (scandalScore >= 40) {
      const severityLabel = scandalScore >= 80 ? "severe" : scandalScore >= 60 ? "significant" : "concerning";
      logEngineEvent(world, {
        type: "COUNCIL_SCANDAL_REVIEW",
        category: "discipline",
        importance: scandalScore >= 60 ? "major" : "notable",
        scope: "heya",
        heyaId: heya.id,
        title: `Council reviews ${heya.name}`,
        summary: `The Sumo Association council notes ${severityLabel} conduct issues at ${heya.name}. Score: ${Math.floor(scandalScore)}.`,
        data: { scandalScore: Math.floor(scandalScore), governanceStatus: heya.governanceStatus }
      });
    }

    // === Merger/closure pressure for extremely small stables ===
    if (heya.rikishiIds.length < 3) {
      if (heya.id !== world.playerHeyaId) {
        logEngineEvent(world, {
          type: "CLOSURE_PRESSURE",
          category: "discipline",
          importance: "major",
          scope: "heya",
          heyaId: heya.id,
          title: `${heya.name} under closure pressure`,
          summary: `${heya.name} has fewer than 3 wrestlers — the Association is reviewing viability.`,
          data: { rosterSize: heya.rikishiIds.length }
        });

        // If roster is 0 or 1, mark for eventual closure (NPC only)
        if (heya.rikishiIds.length <= 1) {
          logEngineEvent(world, {
            type: "FORCED_MERGER_CANDIDATE",
            category: "discipline",
            importance: "headline",
            scope: "heya",
            heyaId: heya.id,
            title: `${heya.name} merger imminent`,
            summary: `With only ${heya.rikishiIds.length} wrestler(s), ${heya.name} faces forced merger into another stable.`,
            data: { rosterSize: heya.rikishiIds.length }
          });
        }
      } else {
        // Player stable — warn but don't force closure
        logEngineEvent(world, {
          type: "ROSTER_WARNING",
          category: "career",
          importance: "major",
          scope: "heya",
          heyaId: heya.id,
          title: "Roster critically low",
          summary: `Your stable has fewer than 3 wrestlers. Recruit urgently or face Association review.`,
          data: { rosterSize: heya.rikishiIds.length }
        });
      }
    }

    // === Succession check — aging oyakata ===
    const oyakata = world.oyakata.get(heya.oyakataId);
    if (oyakata && oyakata.age >= 63) {
      logEngineEvent(world, {
        type: "SUCCESSION_UPCOMING",
        category: "career",
        importance: oyakata.age >= 65 ? "major" : "notable",
        scope: "heya",
        heyaId: heya.id,
        title: `${heya.name} succession looming`,
        summary: `Oyakata ${oyakata.name} (age ${oyakata.age}) ${
          oyakata.age >= 65 ? "must retire soon — succession is urgent." : "is approaching mandatory retirement age."
        }`,
        data: { oyakataAge: oyakata.age, oyakataName: oyakata.name }
      });
    }

    // === Post-basho scandal score decay reward for clean basho ===
    if (scandalScore > 0 && heya.governanceStatus === "good_standing") {
      heya.scandalScore = Math.max(0, scandalScore - 2);
    }
  }
}

// ─── 3. AI META DRIFT (A6.1) ───────────────────────────────────

/**
 * AI Meta Drift recognition delays per A6.1:
 * NPC managers observe public outcomes and can adjust strategy,
 * but only after a recognition delay based on manager profile.
 * We seed the eligibility here; actual changes happen in future weekly ticks.
 */
function runAIMetaDrift(world: WorldState): void {
  const lastBasho = world.history[world.history.length - 1];
  if (!lastBasho) return;

  // Compute basho meta: dominant style this basho
  let oshiWins = 0, yotsuWins = 0;
  for (const r of world.rikishi.values()) {
    if ((r.currentBashoWins ?? 0) > (r.currentBashoLosses ?? 0)) {
      if (r.style === "oshi") oshiWins++;
      else if (r.style === "yotsu") yotsuWins++;
    }
  }
  const metaBias: "oshi" | "yotsu" | "neutral" = 
    oshiWins > yotsuWins * 1.3 ? "oshi" : 
    yotsuWins > oshiWins * 1.3 ? "yotsu" : "neutral";

  // Write meta state for NPC AI to consume in future weeks
  (world as any)._postBashoMeta = {
    bashoNumber: lastBasho.bashoNumber,
    metaBias,
    yushoStyle: world.rikishi.get(lastBasho.yusho)?.style ?? "hybrid",
    recognitionEligibleWeek: world.week + 2 // 2-week recognition delay baseline
  };

  if (metaBias !== "neutral") {
    logEngineEvent(world, {
      type: "META_SHIFT_OBSERVED",
      category: "basho",
      importance: "minor",
      scope: "world",
      title: `Meta trend: ${metaBias} style dominance`,
      summary: `${metaBias === "oshi" ? "Pushing" : "Belt"} specialists dominated this basho. NPC managers may adjust.`,
      data: { metaBias, oshiWins, yotsuWins }
    });
  }
}

// ─── 4. RETIREMENTS ────────────────────────────────────────────

/**
 * Process retirements and return vacancy counts per heya.
 */
function runRetirements(world: WorldState): Record<string, number> {
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
    (world as any)._recruitmentWindow = {
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
        rosterSize: playerHeya.rikishiIds.length,
        windowDuration: 4,
        closesAtWeek: world.week + 4
      }
    });
  }

  // Log total NPC recruitment activity
  const totalNPCVacancies = Object.entries(vacanciesByHeyaId)
    .filter(([id]) => id !== playerHeyaId)
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

// ─── 7. CAREER JOURNAL UPDATES (A3.4) ──────────────────────────

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

  const result = updateBanzuke(currentBanzukeList, performanceList, world.ozekiKadoban ?? {}); 
  
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