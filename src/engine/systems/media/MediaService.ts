/**
 * MediaService.ts — Orchestrator for the Media system.
 * Handles state updates, headline generation, and weekly/monthly boundaries.
 */

import { WorldState } from "../../types/world";
import { MediaState, MediaHeadline, MediaTone, MediaBeat, HeadlineTier } from "../../types/media";
import { BoutResult, BashoName } from "../../types/basho";
import { Division } from "../../types/banzuke";
import { rngForWorld } from "../../rng";
import { Id } from "../../types/common";
import { getRivalryBoutModifiers, RivalriesState } from "../../rivalries";
import { clampInt } from "../../utils/math";
import { logEngineEvent } from "../../events";
import { 
  calculateBoutImpact, 
  determineTier, 
  calculateHeatBump, 
  calculatePressureBump,
  decayHeat,
  decayPressure
} from "./MediaImpactService";
import { generateBoutHeadline, generateStreakHeadline } from "./HeadlineGenerator";

/**
 * Main entry point for updating media state from a bout.
 */
export function updateMediaFromBout(args: {
  state: MediaState;
  world: WorldState;
  result: BoutResult;
  day?: number;
  bashoName?: BashoName;
  division?: Division;
  rivalries?: RivalriesState;
}): { state: MediaState; headlines: MediaHeadline[] } {
  const { state, world, result, day, bashoName, division, rivalries } = args;
  const week = world.week ?? 0;
  const rng = rngForWorld(world, "media", `bout::week${week}::day${day ?? 0}::${result.winnerRikishiId}::${result.loserRikishiId}`);

  const winner = world.rikishi.get(result.winnerRikishiId);
  const loser = world.rikishi.get(result.loserRikishiId);

  // 1. Calculate Impact
  let rivalryTension = 0;
  if (rivalries) {
    const mods = getRivalryBoutModifiers({ state: rivalries, aId: result.winnerRikishiId, bId: result.loserRikishiId });
    rivalryTension = mods.tension || 0;
  }

  const impact = calculateBoutImpact({
    upset: result.upset,
    rivalryTension,
    winnerRank: winner?.rank,
    loserRank: loser?.rank
  });

  const tier = determineTier(impact);
  const tone = determineBoutTone(result, rivalryTension, winner?.rank, loser?.rank, rng.next());
  const beat: MediaBeat = result.upset ? "upset" : rivalryTension > 0.1 ? "rivalry" : "daily_bout";

  // 2. Generate Headline Text
  const { title, subtitle } = generateBoutHeadline({
    rng,
    world,
    winnerId: result.winnerRikishiId,
    loserId: result.loserRikishiId,
    kimariteName: result.kimariteName,
    upset: result.upset,
    tier
  });

  const headline: MediaHeadline = {
    id: `mh-${week}-${day ?? 0}-${result.winnerRikishiId}-${result.loserRikishiId}-${Math.floor(rng.next() * 1e6)}`,
    week,
    bashoName,
    tier,
    beat,
    tone,
    rikishiIds: [result.winnerRikishiId, result.loserRikishiId],
    heyaIds: [winner?.heyaId, loser?.heyaId].filter(Boolean) as string[],
    title,
    subtitle,
    impact,
    tags: ["basho", "bout", beat],
    bout: {
      winnerId: result.winnerRikishiId,
      loserId: result.loserRikishiId,
      kimarite: result.kimarite,
      upset: result.upset,
      day,
      division
    }
  };

  // 3. Apply Effects
  let nextState = applyHeadlineEffects(state, world, headline);

  // 4. Handle Streaks
  const extraHeadlines: MediaHeadline[] = [];
  const streakResult = processStreak(nextState, world, result.winnerRikishiId, result.loserRikishiId, day, bashoName, rng);
  if (streakResult.headline) {
    nextState = applyHeadlineEffects(streakResult.state, world, streakResult.headline);
    extraHeadlines.push(streakResult.headline);
  } else {
    nextState = streakResult.state;
  }

  return { state: nextState, headlines: [headline, ...extraHeadlines] };
}

/**
 * Weekly decay and feature generation.
 */
export function processWeeklyMediaBoundary(state: MediaState): MediaState {
  const nextHeat: Record<string, number> = {};
  for (const [id, heat] of Object.entries(state.mediaHeat)) {
    const nv = decayHeat(heat as number);
    if (nv > 0) nextHeat[id] = nv;
  }

  const nextPressure: Record<string, number> = {};
  for (const [id, pressure] of Object.entries(state.heyaPressure)) {
    const nv = decayPressure(pressure as number);
    if (nv > 0) nextPressure[id] = nv;
  }

  return { ...state, mediaHeat: nextHeat, heyaPressure: nextPressure };
}

/**
 * Internal: Apply heat/pressure shifts based on a headline's impact.
 */
function applyHeadlineEffects(state: MediaState, world: WorldState, headline: MediaHeadline): MediaState {
  const nextHeat = { ...state.mediaHeat };
  const heatBump = calculateHeatBump(headline.impact);
  for (const id of headline.rikishiIds) {
    nextHeat[id] = clampInt((nextHeat[id] ?? 0) + heatBump, 0, 100);
  }

  const nextPressure = { ...state.heyaPressure };
  const pressBump = calculatePressureBump(headline.tone);
  for (const heyaId of headline.heyaIds) {
    nextPressure[heyaId] = clampInt((nextPressure[heyaId] ?? 0) + pressBump, 0, 100);
  }

  return {
    ...state,
    mediaHeat: nextHeat,
    heyaPressure: nextPressure,
    headlines: [...state.headlines, headline].slice(-250) // Maintain cap
  };
}

/**
 * Internal: Deterministic tone assignment logic.
 */
function determineBoutTone(result: BoutResult, rivalryTension: number, winnerRank: string | undefined, loserRank: string | undefined, roll: number): MediaTone {
  if (result.upset) {
    return roll < 0.3 && (getRankImpact(loserRank) >= 8) ? "controversy" : "hype";
  }
  if (rivalryTension > 0.1) {
    return roll < 0.5 ? "hype" : "praise";
  }
  if (getRankImpact(winnerRank) >= 8) {
    return roll < 0.6 ? "praise" : "neutral";
  }
  return roll < 0.2 ? "praise" : "neutral";
}

function getRankImpact(rank?: string): number {
  switch (rank) {
    case "yokozuna": return 10;
    case "ozeki": return 8;
    case "sekiwake": return 6;
    case "komusubi": return 5;
    default: return 3;
  }
}

/**
 * Internal: Streak tracking and headline firing.
 */
function processStreak(state: MediaState, world: WorldState, winnerId: string, loserId: string, day: number | undefined, bashoName: BashoName | undefined, rng: any): { state: MediaState; headline: MediaHeadline | null } {
  const nextStreaks = { ...state.bashoStreaks };
  const nextFired = { ...state.streakHeadlinesFired };

  nextStreaks[winnerId] = (nextStreaks[winnerId] ?? 0) + 1;
  nextStreaks[loserId] = 0;

  const streak = nextStreaks[winnerId];
  const milestones = [5, 8, 10, 12, 15];
  const firedList = nextFired[winnerId] ?? [];
  const nextMilestone = milestones.find(m => streak >= m && !firedList.includes(m));

  if (!nextMilestone) {
    return { state: { ...state, bashoStreaks: nextStreaks }, headline: null };
  }

  nextFired[winnerId] = [...firedList, nextMilestone];
  const rikishi = world.rikishi.get(winnerId);
  const { title, subtitle } = generateStreakHeadline({ 
    rng, 
    shikona: rikishi?.shikona ?? "Unknown", 
    streak 
  });

  const headline: MediaHeadline = {
    id: `mh-streak-${world.week}-${day ?? 0}-${winnerId}-${streak}`,
    week: world.week,
    bashoName,
    tier: streak >= 10 ? "main_event" : "national",
    beat: "streak",
    tone: streak >= 10 ? "hype" : "praise",
    rikishiIds: [winnerId],
    heyaIds: rikishi?.heyaId ? [rikishi.heyaId] : [],
    title,
    subtitle,
    impact: 35 + streak * 4,
    tags: ["basho", "streak", `streak_${streak}`]
  };

  return { state: { ...state, bashoStreaks: nextStreaks, streakHeadlinesFired: nextFired }, headline };
}
/**
 * Reset basho-scoped tracking state.
 */
export function resetBashoMediaTracking(state: MediaState): MediaState {
  return {
    ...state,
    bashoStreaks: {},
    streakHeadlinesFired: {},
    promoWatchFired: {},
    retirementWatchFired: {},
    titleRaceDayFired: {},
    injuryWithdrawalFired: {},
  };
}

/**
 * Snapshot current media heat values for history.
 */
export function snapshotMediaHeatForBasho(state: MediaState, bashoName: string): MediaState {
  console.log(`MediaService: Snapshotting heat for ${bashoName}`);
  return state; // Placeholder for now, to be implemented as needed
}

/**
 * Creates a default media state.
 */
export function createDefaultMediaState(): MediaState {
  return {
    version: "1.0.0",
    headlines: [],
    mediaHeat: {},
    heyaPressure: {},
    bashoStreaks: {},
    streakHeadlinesFired: {},
    promoWatchFired: {},
    retirementWatchFired: {},
    titleRaceDayFired: {},
    injuryWithdrawalFired: {},
  };
}

/**
 * Generates a headline for a governance event (scandal, review, etc).
 */
export function generateGovernanceHeadline(world: WorldState, heyaId: string, severity: string, reason: string): void {
  const heya = world.heyas.get(heyaId);
  const shikona = heya?.name ?? "Heya";
  console.log(`MediaService: Governance headline for ${shikona}: ${severity} - ${reason}`);
  // Implementation will be expanded when headline templates are fully migrated.
}
