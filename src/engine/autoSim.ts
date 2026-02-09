// Auto-Sim and Observer Mode System
// Per Constitution §7: Auto-Sim "Watch the World" Mode
// Canon fixes applied:
// - No Math.random(): all randomness is seeded or removed
// - Inter-basho time is fixed at 6 weeks
// - Day schedule seeding is per-day (not same seed reused)
// - Auto-sim loop is boundary-aware (weekly/monthly hooks) via deterministic time advancement helpers
// - Extra “flat random injury” during basho removed (injuries should come from simulateBout / combat engine)
// - StopConditions are implemented where possible; unsupported ones safely no-op without lying
// - Promotions/demotions are NOT done via naive static mapping; this module now exposes a deterministic hook
//   to let your real banzuke system apply rank changes (required for canon compliance)
import { rngFromSeed } from "./rng";
import { SeededRNG } from "./utils/SeededRNG";
import type { WorldState, BashoName, BoutResult } from "./types";
import { simulateBout } from "./bout";
import { getNextBasho, BASHO_CALENDAR } from "./calendar";
import {
  advanceWeeks,
  processWeeklyBoundary,
  processMonthlyBoundary,
  type TimeState
} from "./timeBoundary";
import { RANK_HIERARCHY } from "./banzuke";
import { initializeBasho, generateDaySchedule } from "./worldgen";

// === AUTO-SIM CONFIGURATION ===

export type SimDuration =
  | { type: "days"; count: number }
  | { type: "weeks"; count: number }
  | { type: "months"; count: number }
  | { type: "basho"; count: number }
  | { type: "years"; count: number }
  | { type: "untilEvent"; eventType: StopCondition };

export type StopCondition =
  | "yokozunaPromotion"
  | "ozekiPromotion"
  | "yusho"
  | "stableInsolvency"
  | "majorInjury"
  | "scandal"
  | "retirementOfStar"
  | "never";

export type VerbosityLevel = "minimal" | "standard" | "detailed";

export interface AutoSimConfig {
  duration: SimDuration;
  stopConditions: StopCondition[];
  verbosity: VerbosityLevel;
  delegationPolicy: "conservative" | "balanced" | "aggressive";
  observerMode: boolean; // true = no player stable, pure world sim
  playerHeyaId?: string;
}

/**
 * Canon-compliant banzuke integration point:
 * Your real banzuke system should apply promotions/demotions deterministically.
 * This module will call the hook if present and use its reported events.
 */
export interface BanzukeUpdateHookResult {
  promotions: PromotionEvent[];
  demotions: DemotionEvent[];
}
export type BanzukeUpdateHook = (args: {
  world: WorldState;
  bashoName: BashoName;
  year: number;
  standings: Map<string, { wins: number; losses: number }>;
  seed: string;
}) => BanzukeUpdateHookResult;

export interface AutoSimResult {
  startYear: number;
  endYear: number;
  bashoSimulated: number;
  daysSimulated: number;
  stoppedBy: StopCondition | "completed";
  chronicle: ChronicleReport;
  finalWorld: WorldState;
}

export interface ChronicleReport {
  topChampions: ChampionEntry[];
  biggestScandals: string[];
  greatestRivalries: RivalryEntry[];
  eraLabels: string[];
  recordsBroken: RecordEntry[];
  highlights: string[];
}

export interface ChampionEntry {
  rikishiId: string;
  shikona: string;
  yushoCount: number;
  bestRank: string;
}

export interface RivalryEntry {
  eastId: string;
  westId: string;
  eastName: string;
  westName: string;
  meetingCount: number;
  description: string;
}

export interface RecordEntry {
  type: string;
  holder: string;
  value: string;
  brokenOn: string;
}

// === BASHO SIMULATION ===

export interface BashoSimResult {
  bashoName: BashoName;
  year: number;
  yushoWinner: { id: string; shikona: string; wins: number; losses: number };
  junYusho: string[];
  standings: Map<string, { wins: number; losses: number }>;
  keyBouts: BoutResult[];
  injuries: string[]; // injuries detected during basho (from simulateBout / world state changes)
  promotions: PromotionEvent[];
  demotions: DemotionEvent[];
}

export interface PromotionEvent {
  rikishiId: string;
  from: string;
  to: string;
  description: string;
}

export interface DemotionEvent {
  rikishiId: string;
  from: string;
  to: string;
  description: string;
}

export function simulateEntireBasho(
  world: WorldState,
  bashoName: BashoName,
  seed: string,
  opts?: {
    banzukeUpdateHook?: BanzukeUpdateHook;
  }
): BashoSimResult {
  // NOTE: rng is used ONLY for deterministic things that are not already part of simulateBout.
  // Avoid introducing parallel RNG paths that can desync save/load.
  const rng = rngFromSeed(seed, "autoSim", "root");

  const basho = initializeBasho(world, bashoName);

  const standings = new Map<string, { wins: number; losses: number }>();
  const keyBouts: BoutResult[] = [];
  const injuries: string[] = [];

  // Initialize standings (sekitori only)
  for (const [id, rikishi] of world.rikishi) {
    if (rikishi.division === "makuuchi" || rikishi.division === "juryo") {
      standings.set(id, { wins: 0, losses: 0 });
      rikishi.currentBashoWins = 0;
      rikishi.currentBashoLosses = 0;
    }
  }

  // Simulate all 15 days
  for (let day = 1; day <= 15; day++) {
    // IMPORTANT: per-day seed so schedule generation cannot accidentally repeat
    const daySeed = `${seed}-day${day}`;
    generateDaySchedule(world, basho, day, daySeed);

    const dayMatches = basho.matches.filter((m) => m.day === day && !m.result);

    for (let boutIndex = 0; boutIndex < dayMatches.length; boutIndex++) {
      const match = dayMatches[boutIndex];
      const east = world.rikishi.get(match.eastRikishiId);
      const west = world.rikishi.get(match.westRikishiId);

      if (!east || !west) continue;
      if (east.injured || west.injured) continue;

      // Deterministic bout seed
      const boutSeed = `${seed}-d${day}-b${boutIndex}`;
      const result = simulateBout(east, west, boutSeed);
      match.result = result;

      // Update records (sekitori standings)
      const winner = result.winner === "east" ? east : west;
      const loser = result.winner === "east" ? west : east;

      winner.currentBashoWins++;
      winner.careerWins++;
      loser.currentBashoLosses++;
      loser.careerLosses++;

      const winnerStanding = standings.get(winner.id);
      const loserStanding = standings.get(loser.id);

      if (winnerStanding) {
        standings.set(winner.id, {
          wins: winnerStanding.wins + 1,
          losses: winnerStanding.losses
        });
      }
      if (loserStanding) {
        standings.set(loser.id, {
          wins: loserStanding.wins,
          losses: loserStanding.losses + 1
        });
      }

      // Track key bouts (upsets, high-rank, senshuraku)
      const eastTier = RANK_HIERARCHY[east.rank]?.tier ?? 999;
      const westTier = RANK_HIERARCHY[west.rank]?.tier ?? 999;

      if (result.upset || day === 15 || eastTier <= 2 || westTier <= 2) {
        keyBouts.push(result);
      }

      // Injury tracking should come from simulateBout / combat engine effects.
      // If simulateBout mutates rikishi.injured, record names deterministically here.
      if (east.injured) injuries.push(east.shikona);
      if (west.injured) injuries.push(west.shikona);

      // Defensive: avoid duplicate entries
      // (keeps chronicle nicer; does not affect sim outcome)
      if (injuries.length > 1) {
        // tiny deterministic cleanup; does not call RNG
        const uniq = new Set(injuries);
        injuries.length = 0;
        for (const n of uniq) injuries.push(n);
      }

      // (rng referenced to prevent “unused variable” warnings in some TS configs)
      void rng;
    }
  }

  // Determine yusho winner
  const sortedStandings = Array.from(standings.entries())
    .map(([id, record]) => ({
      id,
      rikishi: world.rikishi.get(id) || null,
      wins: record.wins,
      losses: record.losses
    }))
    .filter((s) => !!s.rikishi)
    .sort((a, b) => b.wins - a.wins || a.losses - b.losses);

  const yushoEntry = sortedStandings[0];
  const yushoWinner = {
    id: yushoEntry?.id || "",
    shikona: yushoEntry?.rikishi?.shikona || "Unknown",
    wins: yushoEntry?.wins ?? 0,
    losses: yushoEntry?.losses ?? 0
  };

  // Jun-yusho group: whoever matches 2nd-place wins (excluding champion)
  const second = sortedStandings[1];
  const junYushoTargetWins = second ? second.wins : -1;
  const junYusho = sortedStandings
    .filter((s) => s.id !== yushoEntry?.id && s.wins === junYushoTargetWins)
    .map((s) => s.rikishi!.shikona);

  // Promotions/demotions must be applied by the real banzuke system
  let promotions: PromotionEvent[] = [];
  let demotions: DemotionEvent[] = [];

  if (opts?.banzukeUpdateHook) {
    const hookSeed = `${seed}-banzuke`;
    const hookResult = opts.banzukeUpdateHook({
      world,
      bashoName,
      year: world.year,
      standings,
      seed: hookSeed
    });
    promotions = hookResult.promotions;
    demotions = hookResult.demotions;
  }

  return {
    bashoName,
    year: world.year,
    yushoWinner,
    junYusho,
    standings,
    keyBouts,
    injuries,
    promotions,
    demotions
  };
}

// === FULL AUTO-SIM ===

export function runAutoSim(
  world: WorldState,
  config: AutoSimConfig,
  opts?: {
    banzukeUpdateHook?: BanzukeUpdateHook;
  }
): AutoSimResult {
  const startYear = world.year;

  let bashoSimulated = 0;
  let daysSimulated = 0;
  let stoppedBy: StopCondition | "completed" = "completed";

  const chronicle: ChronicleReport = {
    topChampions: [],
    biggestScandals: [],
    greatestRivalries: [],
    eraLabels: [],
    recordsBroken: [],
    highlights: []
  };

  // Track champions
  const championCounts = new Map<string, number>();

  // Determine simulation cap
  const targetBasho = computeTargetBasho(config.duration);

  // Main simulation loop
  while (bashoSimulated < targetBasho) {
    const bashoName = world.currentBashoName || "hatsu";
    const bashoSeed = `${world.seed}-basho-${world.year}-${bashoName}`;

    // Simulate the basho (deterministic)
    const bashoResult = simulateEntireBasho(world, bashoName, bashoSeed, {
      banzukeUpdateHook: opts?.banzukeUpdateHook
    });

    bashoSimulated++;
    daysSimulated += 15;

    // Track champion counts
    if (bashoResult.yushoWinner.id) {
      const prevCount = championCounts.get(bashoResult.yushoWinner.id) || 0;
      championCounts.set(bashoResult.yushoWinner.id, prevCount + 1);
    }

    // Chronicle highlight (deterministic ordering: per basho)
    if (config.verbosity !== "minimal") {
      chronicle.highlights.push(
        `${titleCase(bashoName)} ${world.year}: ${bashoResult.yushoWinner.shikona} wins with ${bashoResult.yushoWinner.wins}-${bashoResult.yushoWinner.losses}`
      );
    }

    // Stop conditions check
    for (const condition of config.stopConditions) {
      if (checkStopCondition(condition, bashoResult, world, config, chronicle)) {
        stoppedBy = condition;
        break;
      }
    }
    if (stoppedBy !== "completed") break;

    // Advance to next basho
    const nextBasho = getNextBasho(bashoName);
    const isNewYear = nextBasho === "hatsu";

    // Canon: inter-basho time is fixed 6 weeks
    const interBashoWeeks = 6;

    // Boundary-aware deterministic time advancement
    const timeState: TimeState = {
      year: world.year,
      month: BASHO_CALENDAR[bashoName].month,
      week: 3,
      dayIndexGlobal: daysSimulated,
      weekIndexGlobal: Math.floor(daysSimulated / 7),
      phase: "interbasho"
    };

    advanceInterBashoDeterministic(world, interBashoWeeks, timeState, `${bashoSeed}-inter`);

    // Update world state
    world.currentBashoName = nextBasho;
    if (isNewYear) {
      world.year++;
    }

    // Store history (deterministic)
    world.history.push({
      year: bashoResult.year,
      bashoNumber: getBashoNumber(bashoName),
      bashoName,
      yusho: bashoResult.yushoWinner.id,
      junYusho: bashoResult.junYusho,
      prizes: {
        yushoAmount: 10_000_000,
        junYushoAmount: 2_000_000,
        specialPrizes: 2_000_000
      }
    });

    // If duration is "untilEvent", keep going until an event fires or cap reached.
    if (config.duration.type === "untilEvent") {
      const eventCondition = config.duration.eventType;
      if (checkStopCondition(eventCondition, bashoResult, world, config, chronicle)) {
        stoppedBy = eventCondition;
        break;
      }
    }
  }

  // Build chronicle top champions
  chronicle.topChampions = Array.from(championCounts.entries())
    .map(([id, count]) => {
      const rikishi = world.rikishi.get(id);
      return {
        rikishiId: id,
        shikona: rikishi?.shikona || "Unknown",
        yushoCount: count,
        bestRank: rikishi?.rank || "unknown"
      };
    })
    .sort((a, b) => b.yushoCount - a.yushoCount)
    .slice(0, 10);

  // Era labels (simple heuristic; deterministic)
  if (bashoSimulated >= 6) {
    const topChamp = chronicle.topChampions[0];
    if (topChamp && topChamp.yushoCount >= 3) {
      chronicle.eraLabels.push(`The ${topChamp.shikona} Era (${startYear}-${world.year})`);
    }
  }

  return {
    startYear,
    endYear: world.year,
    bashoSimulated,
    daysSimulated,
    stoppedBy,
    chronicle,
    finalWorld: world
  };
}

// === STOP CONDITIONS ===

function checkStopCondition(
  condition: StopCondition,
  bashoResult: BashoSimResult,
  world: WorldState,
  config: AutoSimConfig,
  chronicle: ChronicleReport
): boolean {
  // Observer mode: do not evaluate player-stable-specific conditions unless playerHeyaId is present
  const hasPlayer = !config.observerMode && !!config.playerHeyaId;

  switch (condition) {
    case "yokozunaPromotion":
      return bashoResult.promotions.some((p) => p.to === "yokozuna");

    case "ozekiPromotion":
      return bashoResult.promotions.some((p) => p.to === "ozeki");

    case "yusho": {
      if (!hasPlayer) return false;
      const winner = world.rikishi.get(bashoResult.yushoWinner.id);
      return winner?.heyaId === config.playerHeyaId;
    }

    case "stableInsolvency": {
      if (!hasPlayer) return false;
      const heya = world.heyas.get(config.playerHeyaId!);
      return heya?.runwayBand === "desperate";
    }

    case "majorInjury": {
      if (!hasPlayer) return false;
      const heya = world.heyas.get(config.playerHeyaId!);
      if (!heya) return false;

      // Canon systems may represent injury severity differently; this is a conservative check.
      // If your injury system tracks "major", prefer that.
      return bashoResult.injuries.some((name) =>
        heya.rikishiIds.some((id) => world.rikishi.get(id)?.shikona === name)
      );
    }

    case "scandal": {
      // Only trigger if your world has a deterministic scandal/event feed.
      // Supported shapes (any one is enough):
      // - world.scandals: Array<{ severity: "minor"|"major"; summary: string; year:number; bashoName?:BashoName }>
      // - world.eventLog: Array<{ type: string; severity?: string; summary?: string; ... }>
      const anyWorld: any = world as any;

      const scandals: any[] = Array.isArray(anyWorld.scandals) ? anyWorld.scandals : [];
      const eventLog: any[] = Array.isArray(anyWorld.eventLog) ? anyWorld.eventLog : [];

      const hasMajorScandal =
        scandals.some((s) => s?.severity === "major" && s?.year === world.year) ||
        eventLog.some((e) => e?.type === "scandal" && (e?.severity === "major" || e?.severity === 2));

      if (hasMajorScandal) {
        // Optional: add to chronicle if present
        if (config.verbosity !== "minimal") {
          const summary =
            scandals.find((s) => s?.severity === "major" && s?.year === world.year)?.summary ||
            eventLog.find((e) => e?.type === "scandal")?.summary ||
            `Major scandal in ${titleCase(bashoResult.bashoName)} ${world.year}`;
          chronicle.biggestScandals.push(String(summary));
        }
        return true;
      }
      return false;
    }

    case "retirementOfStar": {
      // Only trigger if your world has deterministic retirements.
      // Supported shapes:
      // - world.retirements: Array<{ rikishiId: string; year:number; bashoName?:BashoName }>
      // - world.eventLog entries with type "retirement"
      const anyWorld: any = world as any;
      const retirements: any[] = Array.isArray(anyWorld.retirements) ? anyWorld.retirements : [];
      const eventLog: any[] = Array.isArray(anyWorld.eventLog) ? anyWorld.eventLog : [];

      const retiredIds = new Set<string>();
      for (const r of retirements) {
        if (r?.year === world.year) retiredIds.add(String(r.rikishiId));
      }
      for (const e of eventLog) {
        if (e?.type === "retirement" && e?.year === world.year) retiredIds.add(String(e.rikishiId));
      }

      if (retiredIds.size === 0) return false;

      // Define "star" conservatively as sanyaku or better at time of retirement, if info is present
      for (const id of retiredIds) {
        const rikishi = world.rikishi.get(id);
        if (!rikishi) continue;
        const tier = RANK_HIERARCHY[rikishi.rank]?.tier ?? 999;
        if (tier <= 4) return true; // yokozuna/ozeki/sekiwake/komusubi
      }
      return false;
    }

    case "never":
      return false;

    default:
      return false;
  }
}

// === DETERMINISTIC TIME ADVANCEMENT HELPERS ===

function advanceInterBashoDeterministic(
  world: WorldState,
  weeks: number,
  timeState: TimeState,
  seed: string
): void {
  // Always seed here even if the boundary processors use RNG internally
  // (they should derive their RNG from world seed + time indices).
  // We do not consume RNG here; we only ensure callers pass a deterministic seed around.
  void seed;

  // Advance whole weeks using existing engine function
  advanceWeeks(world, weeks, timeState);

  // Ensure weekly/monthly boundary processors run deterministically after advancement.
  // If your engine expects these processors to run *during* week progression,
  // move these calls into advanceWeeks() instead; this is a safe fallback.
  for (let i = 0; i < weeks; i++) {
    // Create a deterministic seed string for this week
    const weekSeed = `${seed}-week-${timeState.year}-${timeState.week + i}`;
    processWeeklyBoundary(world, weekSeed);

    // Heuristic: run monthly boundary when month changes or each 4 weeks.
    // If your TimeState exposes a precise calendar day, replace this with your canonical trigger.
    if ((timeState.week + i + 1) % 4 === 0) {
      const monthSeed = `${seed}-month-${timeState.year}-${timeState.month}`;
      processMonthlyBoundary(world, monthSeed);
    }
  }
}

// === DURATION / UTILITIES ===

function computeTargetBasho(duration: SimDuration): number {
  switch (duration.type) {
    case "days":
      return Math.max(0, Math.ceil(duration.count / 15));
    case "weeks":
      // ~3 weeks per basho day block is not canon; canon is basho + fixed 6-week inter-basho.
      // But duration targeting is user-facing and approximate; keep deterministic.
      return Math.max(0, Math.ceil(duration.count / 9)); // (3-week basho + 6-week inter) ~= 9 weeks per cycle
    case "months":
      return Math.max(0, Math.ceil(duration.count / 2)); // 6 basho/year => ~2 months per basho
    case "basho":
      return Math.max(0, Math.floor(duration.count));
    case "years":
      return Math.max(0, Math.floor(duration.count) * 6);
    case "untilEvent":
      return 600; // hard cap (100 years) to prevent infinite runs
  }
}

function titleCase(name: string): string {
  return name.charAt(0).toUpperCase() + name.slice(1);
}

function getBashoNumber(name: BashoName): 1 | 2 | 3 | 4 | 5 | 6 {
  const numbers: Record<BashoName, 1 | 2 | 3 | 4 | 5 | 6> = {
    hatsu: 1,
    haru: 2,
    natsu: 3,
    nagoya: 4,
    aki: 5,
    kyushu: 6
  };
  return numbers[name];
}