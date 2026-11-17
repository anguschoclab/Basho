// MediaBoutService.ts — Bout-triggered media updates.
// Handles updateMediaFromBout and its private helpers:
// applyHeadlineEffects, determineBoutTone, getRankImpact, processStreak.

import type { WorldState } from "@/engine/types/world";
import { MediaState, MediaHeadline, MediaTone, MediaBeat } from "@/engine/types/media";
import { BoutResult, BashoName, MatchSchedule } from "@/engine/types/basho";
import { Division } from "@/engine/types/banzuke";
import { rngForWorld, SeededRNG } from "@/engine/core/rng";
import { getRivalryBoutModifiers } from "@/engine/narrative/RivalryHeatService";
import { RivalriesState } from "@/constants/engine/rivalry";
import { clampInt } from "@/engine/utils/math";
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
  STREAK_IMPACT_BASE,
  STREAK_IMPACT_MULTIPLIER,
  STREAK_MAIN_EVENT_THRESHOLD,
  TITLED_RANKS,
  DAY_RECAP_SANYAKU_UPSET_THRESHOLD,
  DAY_RECAP_IMPACT_KINBOSHI,
  DAY_RECAP_IMPACT_LEADER_CHANGE,
  DAY_RECAP_IMPACT_UPSET_DAY,
} from "@/constants/engine/media";
import {
  RIVALRY_TENSION_BEAT_THRESHOLD,
  CONTROVERSY_PROBABILITY_THRESHOLD,
  CONTROVERSY_RANK_IMPACT_THRESHOLD,
  RIVALRY_TENSION_HYPE_THRESHOLD,
  HYPE_PROBABILITY_THRESHOLD,
} from "@/constants/engine/mediaImpact";

import {
  calculateBoutImpact,
  determineTier,
  calculateHeatBump,
  calculatePressureBump,
} from "@/engine/media/MediaImpactService";
import {
  generateBoutHeadline,
  generateRecapHeadline,
  generateStreakHeadline,
} from "@/engine/media/HeadlineGenerator";
import { createDefaultMediaState } from "@/engine/media/MediaStateService";
import { createImpactBuilder } from "@/engine/core/ImpactBuilder";
import type { StateImpact } from "@/engine/core/StateImpact";
import { getRikishi } from "@/engine/core/queries";

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
  // The headline-count salt keeps MH ids unique when the same bout label is
  // minted twice in one day (re-simulated bout, identical playoff pairing).
  const rng = rngForWorld(
    world,
    "media",
    `bout::${result.boutId}::week${week}::day${day ?? 0}::${result.winnerRikishiId}::${result.loserRikishiId}::${state.headlines.length}`
  );

  const winner = getRikishi(world, result.winnerRikishiId);
  const loser = getRikishi(world, result.loserRikishiId);

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
  const beat: MediaBeat = result.upset
    ? "upset"
    : rivalryTension > RIVALRY_TENSION_BEAT_THRESHOLD
      ? "rivalry"
      : "daily_bout";

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
      "MEDIA_RESPONSE",
      "media",
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
    return roll < CONTROVERSY_PROBABILITY_THRESHOLD &&
      getRankImpact(loserRank) >= CONTROVERSY_RANK_IMPACT_THRESHOLD
      ? "controversy"
      : "hype";
  }
  if (rivalryTension > RIVALRY_TENSION_HYPE_THRESHOLD) {
    return roll < HYPE_PROBABILITY_THRESHOLD ? "hype" : "praise";
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
  const rikishi = getRikishi(world, winnerId);
  const { title, subtitle } = generateStreakHeadline({
    rng,
    shikona: rikishi?.shikona ?? "Unknown",
    streak,
  });

  const headline: MediaHeadline = {
    id: rng.uuid("MH"),
    week: world.week,
    bashoName,
    tier: streak >= STREAK_MAIN_EVENT_THRESHOLD ? "main_event" : "national",
    beat: "streak",
    tone: streak >= STREAK_MAIN_EVENT_THRESHOLD ? "hype" : "praise",
    rikishiIds: [winnerId],
    heyaIds: rikishi?.heyaId ? [rikishi.heyaId] : [],
    title,
    subtitle,
    impact: STREAK_IMPACT_BASE + streak * STREAK_IMPACT_MULTIPLIER,
    tags: ["basho", "streak", `streak_${streak}`],
  };

  return {
    state: { ...state, bashoStreaks: nextStreaks, streakHeadlinesFired: nextFired },
    headline,
  };
}

// ── W K: Day-recap headlines ─────────────────────────────────────────────────

type RecapKind = "kinboshi" | "leaderChange" | "upsetDay";

interface RecapCandidate {
  kind: RecapKind;
  rikishiIds: string[];
  ctx: Record<string, string | number>;
}

/**
 * Scans the just-resolved day's results and emits at most ONE recap headline,
 * in priority order: first kinboshi > leader change > day of upsets.
 * Called from advanceBashoDay before day++ so `basho.day` is the resolved day.
 */
export function generateDayRecapHeadline(world: WorldState): StateImpact | null {
  const basho = world.currentBasho;
  if (!basho) return null;
  const day = basho.day;
  const todayResults: BoutResult[] = [];
  for (const m of basho.matches) {
    if (m.day === day && m.result) todayResults.push(m.result);
  }
  if (todayResults.length === 0) return null;

  const candidate =
    recapKinboshi(world, basho, todayResults, day) ??
    recapLeaderChange(world, basho, day) ??
    recapSanyakuUpsetDay(world, todayResults, day);
  if (!candidate) return null;

  const state = world.mediaState ?? createDefaultMediaState();
  const rng = rngForWorld(world, "media", `recap::${basho.id ?? basho.bashoName}::day${day}`);
  const { title, subtitle } = generateRecapHeadline({
    rng,
    kind: candidate.kind,
    ctx: candidate.ctx,
  });

  const tier: MediaHeadline["tier"] = candidate.kind === "kinboshi" ? "main_event" : "national";
  const impact =
    candidate.kind === "kinboshi"
      ? DAY_RECAP_IMPACT_KINBOSHI
      : candidate.kind === "leaderChange"
        ? DAY_RECAP_IMPACT_LEADER_CHANGE
        : DAY_RECAP_IMPACT_UPSET_DAY;

  const heyaIds = new Set<string>();
  for (const id of candidate.rikishiIds) {
    const heyaId = getRikishi(world, id)?.heyaId;
    if (heyaId) heyaIds.add(heyaId);
  }

  const headline: MediaHeadline = {
    id: rng.uuid("MH"),
    week: world.week ?? 0,
    bashoName: basho.bashoName,
    tier,
    beat: candidate.kind === "leaderChange" ? "title_race" : "upset",
    tone: candidate.kind === "upsetDay" ? "controversy" : "hype",
    rikishiIds: candidate.rikishiIds,
    heyaIds: [...heyaIds],
    title,
    subtitle,
    impact,
    tags: ["basho", "day_recap", candidate.kind],
  };

  const builder = createImpactBuilder("generateDayRecapHeadline");
  builder.updateWorldField("mediaState", applyHeadlineEffects(state, world, headline));
  builder.logEvent(
    "MEDIA_RESPONSE",
    "media",
    { status: "meta_shift", incident: title, day, score: impact },
    { rikishiId: candidate.rikishiIds[0] }
  );
  return builder.build();
}

/** First-kinboshi recap — fires only on the basho's first gold star. */
function recapKinboshi(
  world: WorldState,
  basho: { matches: MatchSchedule[] },
  todayResults: BoutResult[],
  day: number
): RecapCandidate | null {
  const kinboshi = todayResults.find((r) => r.isKinboshi);
  if (!kinboshi) return null;
  const earlierKinboshi = basho.matches.some((m) => m.day < day && m.result?.isKinboshi);
  if (earlierKinboshi) return null;
  return {
    kind: "kinboshi",
    rikishiIds: [kinboshi.winnerRikishiId, kinboshi.loserRikishiId],
    ctx: {
      winner: getRikishi(world, kinboshi.winnerRikishiId)?.shikona ?? "Unknown",
      loser: getRikishi(world, kinboshi.loserRikishiId)?.shikona ?? "Unknown",
      day,
    },
  };
}

/** Leader-change recap — a new sole makuuchi leader emerged today. */
function recapLeaderChange(
  world: WorldState,
  basho: { matches: MatchSchedule[] },
  day: number
): RecapCandidate | null {
  const winsNow = new Map<string, number>();
  const winsBefore = new Map<string, number>();
  for (const m of basho.matches) {
    if (!m.result) continue;
    const winner = getRikishi(world, m.result.winnerRikishiId);
    if (winner?.division !== "makuuchi") continue;
    winsNow.set(winner.id, (winsNow.get(winner.id) ?? 0) + 1);
    if (m.day < day) winsBefore.set(winner.id, (winsBefore.get(winner.id) ?? 0) + 1);
  }
  const leaderNow = soleLeader(winsNow);
  if (!leaderNow || leaderNow === soleLeader(winsBefore)) return null;
  return {
    kind: "leaderChange",
    rikishiIds: [leaderNow],
    ctx: {
      leader: getRikishi(world, leaderNow)?.shikona ?? "Unknown",
      day,
      basho: world.currentBasho?.bashoName ?? "basho",
    },
  };
}

function soleLeader(wins: Map<string, number>): string | null {
  let max = 0;
  let leader: string | null = null;
  let tied = false;
  for (const [id, w] of wins) {
    if (w > max) {
      max = w;
      leader = id;
      tied = false;
    } else if (w === max) {
      tied = true;
    }
  }
  return leader !== null && !tied ? leader : null;
}

/** Day-of-upsets recap — ≥2 san'yaku-ranked losers fell to lower ranks. */
function recapSanyakuUpsetDay(
  world: WorldState,
  todayResults: BoutResult[],
  day: number
): RecapCandidate | null {
  const rikishiIds: string[] = [];
  let count = 0;
  for (const r of todayResults) {
    if (!r.upset) continue;
    const loser = getRikishi(world, r.loserRikishiId);
    if (!loser || loser.division !== "makuuchi" || !TITLED_RANKS.has(loser.rank)) continue;
    count++;
    rikishiIds.push(r.winnerRikishiId, r.loserRikishiId);
  }
  if (count < DAY_RECAP_SANYAKU_UPSET_THRESHOLD) return null;
  return { kind: "upsetDay", rikishiIds, ctx: { count, day } };
}
