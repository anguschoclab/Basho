// MediaBoutService.ts — Bout-triggered media updates.
// Handles updateMediaFromBout and its private helpers:
// applyHeadlineEffects, determineBoutTone, getRankImpact, processStreak.

import type { WorldState } from "../../types/world";
import { MediaState, MediaHeadline, MediaTone, MediaBeat } from "../../types/media";
import { BoutResult, BashoName } from "../../types/basho";
import { Division } from "../../types/banzuke";
import { rngForWorld, SeededRNG } from "../../rng";
import { getRivalryBoutModifiers, RivalriesState } from "../../rivalries";
import { clampInt } from "../../utils/math";
import {
  MAX_MEDIA_HEAT,
  MAX_HEYA_PRESSURE,
  MEDIA_HEAT_HISTORY_SIZE,
  MAX_HEADLINES,
  RANK_IMPACTS,
  STREAK_MILESTONES,
  HIGH_RANK_TONE_PROBABILITY,
  DEFAULT_TONE_PROBABILITY,
  HIGH_RANK_IMPACT_THRESHOLD,
} from "../../../constants/engine/media";

import {
  calculateBoutImpact,
  determineTier,
  calculateHeatBump,
  calculatePressureBump,
} from "./MediaImpactService";
import { generateBoutHeadline, generateStreakHeadline } from "./HeadlineGenerator";
import { createImpactBuilder } from "../../core/ImpactBuilder";
import type { StateImpact } from "../../core/StateImpact";

/**
 * Main entry point for updating media state from a bout.
 * Returns StateImpact describing media updates instead of returning updated state directly.
 */
export function updateMediaFromBout(args: {
  state: MediaState;
  world: WorldState;
  result: BoutResult;
  day?: number;
  bashoName?: BashoName;
  division?: Division;
  rivalries?: RivalriesState;
}): StateImpact {
  const { state, world, result, day, bashoName, division, rivalries } = args;
  const builder = createImpactBuilder("updateMediaFromBout");
  const week = world.week ?? 0;
  const rng = rngForWorld(
    world,
    "media",
    `bout::week${week}::day${day ?? 0}::${result.winnerRikishiId}::${result.loserRikishiId}`
  );

  const winner = world.rikishi.get(result.winnerRikishiId);
  const loser = world.rikishi.get(result.loserRikishiId);

  // 1. Calculate Impact
  let rivalryTension = 0;
  if (rivalries) {
    const mods = getRivalryBoutModifiers({
      state: rivalries,
      aId: result.winnerRikishiId,
      bId: result.loserRikishiId,
    });
    rivalryTension = mods.tension || 0;
  }

  const impact = calculateBoutImpact({
    upset: result.upset,
    rivalryTension,
    winnerRank: winner?.rank,
    loserRank: loser?.rank,
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
    tier,
  });

  const headline: MediaHeadline = {
    id: rng.uuid("MH"),
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
      division,
    },
  };

  // 3. Apply Effects
  let nextState = applyHeadlineEffects(state, world, headline);

  // 4. Log significant headlines
  if (tier === "main_event" || tier === "national") {
    builder.logEvent(
      "BOUT_RESOLVED",
      "training",
      {
        status: "meta_shift",
        incident: title,
        shikona: winner?.shikona,
        winner: winner?.shikona,
        winnerRikishiId: result.winnerRikishiId,
        day: day,
        score: impact,
      },
      { rikishiId: result.winnerRikishiId }
    );
  }

  // 5. Handle Streaks
  const streakResult = processStreak(
    nextState,
    world,
    result.winnerRikishiId,
    result.loserRikishiId,
    day,
    bashoName,
    rng
  );
  if (streakResult.headline) {
    nextState = applyHeadlineEffects(streakResult.state, world, streakResult.headline);
  } else {
    nextState = streakResult.state;
  }

  // Update the mediaState world field
  builder.updateWorldField("mediaState", nextState);

  return builder.build();
}

/**
 * Internal: Apply heat/pressure shifts based on a headline's impact.
 */
function applyHeadlineEffects(
  state: MediaState,
  _world: WorldState,
  headline: MediaHeadline
): MediaState {
  const nextHeat = { ...state.mediaHeat };
  const heatBump = calculateHeatBump(headline.impact);
  for (const id of headline.rikishiIds) {
    nextHeat[id] = clampInt((nextHeat[id] ?? 0) + heatBump, 0, MAX_MEDIA_HEAT);
  }

  const nextPressure = { ...state.heyaPressure };
  const pressBump = calculatePressureBump(headline.tone);
  for (const heyaId of headline.heyaIds) {
    nextPressure[heyaId] = clampInt((nextPressure[heyaId] ?? 0) + pressBump, 0, MAX_HEYA_PRESSURE);
  }

  // Update history for each rikishi involved
  const nextHistory = { ...state.mediaHeatHistory };
  const bashoName = headline.bashoName || "Interim";
  for (const id of headline.rikishiIds) {
    const history = [...(nextHistory[id] || [])];
    history.push({ basho: bashoName, heat: nextHeat[id] });
    nextHistory[id] = history.slice(-MEDIA_HEAT_HISTORY_SIZE);
  }

  return {
    ...state,
    mediaHeat: nextHeat,
    heyaPressure: nextPressure,
    headlines: [...state.headlines, headline].slice(-MAX_HEADLINES),
    mediaHeatHistory: nextHistory,
  };
}

/**
 * Internal: Deterministic tone assignment logic.
 */
function determineBoutTone(
  result: BoutResult,
  rivalryTension: number,
  winnerRank: string | undefined,
  loserRank: string | undefined,
  roll: number
): MediaTone {
  if (result.upset) {
    return roll < 0.3 && getRankImpact(loserRank) >= 8 ? "controversy" : "hype";
  }
  if (rivalryTension > 0.1) {
    return roll < 0.5 ? "hype" : "praise";
  }
  if (getRankImpact(winnerRank) >= HIGH_RANK_IMPACT_THRESHOLD) {
    return roll < HIGH_RANK_TONE_PROBABILITY ? "praise" : "neutral";
  }
  return roll < DEFAULT_TONE_PROBABILITY ? "praise" : "neutral";
}

function getRankImpact(rank?: string): number {
  const impacts: Record<string, number> = {
    yokozuna: RANK_IMPACTS.YOKOZUNA,
    ozeki: RANK_IMPACTS.OZEKI,
    sekiwake: RANK_IMPACTS.SEKIWAKE,
    komusubi: RANK_IMPACTS.KOMUSUBI,
  };
  return impacts[rank || ""] || RANK_IMPACTS.DEFAULT;
}

/**
 * Internal: Streak tracking and headline firing.
 */
function processStreak(
  state: MediaState,
  world: WorldState,
  winnerId: string,
  loserId: string,
  _day: number | undefined,
  bashoName: BashoName | undefined,
  rng: SeededRNG
): { state: MediaState; headline: MediaHeadline | null } {
  const nextStreaks = { ...state.bashoStreaks };
  const nextFired = { ...state.streakHeadlinesFired };

  nextStreaks[winnerId] = (nextStreaks[winnerId] ?? 0) + 1;
  nextStreaks[loserId] = 0;

  const streak = nextStreaks[winnerId];
  const milestones = STREAK_MILESTONES;
  const firedList = nextFired[winnerId] ?? [];
  const nextMilestone = milestones.find((m) => streak >= m && !firedList.includes(m));

  if (!nextMilestone) {
    return { state: { ...state, bashoStreaks: nextStreaks }, headline: null };
  }

  nextFired[winnerId] = [...firedList, nextMilestone];
  const rikishi = world.rikishi.get(winnerId);
  const { title, subtitle } = generateStreakHeadline({
    rng,
    shikona: rikishi?.shikona ?? "Unknown",
    streak,
  });

  const headline: MediaHeadline = {
    id: rng.uuid("MH"),
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
    tags: ["basho", "streak", `streak_${streak}`],
  };

  return {
    state: { ...state, bashoStreaks: nextStreaks, streakHeadlinesFired: nextFired },
    headline,
  };
}
