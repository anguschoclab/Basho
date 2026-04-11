/**
 * MediaService.ts — Orchestrator for the Media system.
 * Handles state updates, headline generation, and weekly/monthly boundaries.
 */

import { WorldState } from "../../types/world";
import { MediaState, MediaHeadline, MediaTone, MediaBeat, HeadlineTier } from "../../types/media";
import { BoutResult, BashoName } from "../../types/basho";
import type { GovernanceRuling } from "../../types/economy";
import { Division } from "../../types/banzuke";
import { rngForWorld } from "../../rng";
import { Id } from "../../types/common";
import { getRivalryBoutModifiers, RivalriesState } from "../../rivalries";
import { EventBus } from "../../events";
import { BardEngine } from "../../narrative/BardEngine";
import { clampInt } from "../../utils/math";

import {
  calculateBoutImpact,
  determineTier,
  calculateHeatBump,
  calculatePressureBump,
  decayHeat,
  decayPressure
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
  const builder = createImpactBuilder('updateMediaFromBout');
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
    id: rng.uuid('MH'),
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

  // 4. Log significant headlines
  if (tier === 'main_event' || tier === 'national') {
    builder.logEvent(
      'BOUT_RESOLVED',
      'training',
      {
        status: "meta_shift",
        incident: title,
        shikona: winner?.shikona,
        winner: winner?.shikona,
        winnerRikishiId: result.winnerRikishiId,
        day: day,
        score: impact
      },
      { rikishiId: result.winnerRikishiId }
    );
  }

  // 5. Handle Streaks
  const streakResult = processStreak(nextState, world, result.winnerRikishiId, result.loserRikishiId, day, bashoName, rng);
  if (streakResult.headline) {
    nextState = applyHeadlineEffects(streakResult.state, world, streakResult.headline);
  } else {
    nextState = streakResult.state;
  }

  // Update the mediaState world field
  (builder as any).updateWorldField('mediaState', nextState);

  return builder.build();
}

/**
 * Weekly decay and feature generation.
 * Accepts either a plain MediaState (legacy) or an object with { state, world, rivalries }.
 * Always returns { state: MediaState } for destructuring at call sites.
 */
export function processWeeklyMediaBoundary(
  input: MediaState | { state: MediaState; world?: WorldState; rivalries?: RivalriesState }
): { state: MediaState } {
  const state = 'state' in input ? input.state : input;
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

  return { state: { ...state, mediaHeat: nextHeat, heyaPressure: nextPressure } };
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

  // Update history for each rikishi involved
  const nextHistory = { ...state.mediaHeatHistory };
  const bashoName = headline.bashoName || "Interim";
  for (const id of headline.rikishiIds) {
    const history = [...(nextHistory[id] || [])];
    history.push({ basho: bashoName, heat: nextHeat[id] });
    nextHistory[id] = history.slice(-10); // Keep last 10 snapshots
  }

  return {
    ...state,
    mediaHeat: nextHeat,
    heyaPressure: nextPressure,
    headlines: [...state.headlines, headline].slice(-250), // Maintain cap
    mediaHeatHistory: nextHistory
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
    id: rng.uuid('MH'),
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
  const nextHistory = { ...state.mediaHeatHistory };

  for (const [id, heat] of Object.entries(state.mediaHeat)) {
    const history = [...(nextHistory[id] || [])];
    // Avoid duplicate snapshots for the same basho if called multiple times
    const lastEntry = history[history.length - 1];
    if (lastEntry && lastEntry.basho === bashoName) {
      history[history.length - 1] = { ...lastEntry, heat };
    } else {
      history.push({ basho: bashoName, heat });
    }
    nextHistory[id] = history.slice(-10); // Keep last 10 snapshots
  }

  return {
    ...state,
    mediaHeatHistory: nextHistory
  };
}

/**
 * Creates a default media state.
 */
export function createDefaultMediaState(): MediaState {
  return {
    version: "1.0.0",
    headlines: [],
    mediaHeat: {},
    mediaHeatHistory: {},
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
 * Generates a headline for a governance or welfare event using the BardEngine.
 */
export function generateGovernanceHeadline(args: {
  world: WorldState;
  heyaId: string;
  templatePath: string; // e.g., 'institutional.welfare.watch_headline'
  severity?: HeadlineTier;
}): void {
  const { world, heyaId, templatePath, severity = 'local' } = args;
  if (!world.mediaState || !world.mediaState.headlines) return;

  const heya = world.heyas.get(heyaId);
  const context = {
    heyaname: heya?.name ?? 'Heya',
    heya: heya?.name ?? 'Heya'
  };

  const week = world.week ?? 0;
  const rng = rngForWorld(world, "media", `gov::${heyaId}::${templatePath}::${week}`);
  
  // Resolve title from archive
  const { text: title } = BardEngine.resolve(rng, templatePath, context);

  const headline: MediaHeadline = {
    id: rng.uuid('MH'),
    week,
    tier: severity,
    beat: templatePath.includes('welfare') ? 'discipline' : 'media',
    tone: severity === 'main_event' || severity === 'national' ? 'controversy' : 'neutral',
    rikishiIds: [],
    heyaIds: [heyaId],
    title,
    subtitle: "", // Optional for now
    impact: severity === 'main_event' ? 60 : severity === 'national' ? 40 : 20,
    tags: ["governance", "institutional"],
  };

  // Log to media state
  world.mediaState.headlines.push(headline);
  if (world.mediaState.headlines.length > 250) world.mediaState.headlines.shift();

  // Apply visual pressure
  world.mediaState.heyaPressure[heyaId] = Math.min(100, (world.mediaState.heyaPressure[heyaId] ?? 0) + (headline.impact / 2));

  console.log(`MediaService: Generated Governance Headline: ${title}`);
}

/**
 * Handles a media event choice and applies its effects.
 */
export function handleMediaEvent(world: WorldState, eventId: string, choice: string): void {
  if (!world.mediaState) return;

  // Find the event in the governance log or media state
  const eventIndex = world.governanceLog?.findIndex(r => r.id === eventId);
  if (eventIndex !== undefined && eventIndex >= 0 && world.governanceLog) {
    // Update the ruling with the player's choice
    const ruling = world.governanceLog[eventIndex] as GovernanceRuling;
    ruling.playerChoice = choice;
    ruling.playerResponse = `Player chose: ${choice}`;
  }

  // Apply choice effects to media state
  // Different choices could affect heat/pressure differently
  if (choice === "apologize") {
    // Apologizing reduces heat but may hurt reputation
    for (const [id, heat] of Object.entries(world.mediaState.mediaHeat)) {
      world.mediaState.mediaHeat[id] = Math.max(0, (heat as number) - 5);
    }
  } else if (choice === "deny") {
    // Denying may increase pressure
    for (const [id, pressure] of Object.entries(world.mediaState.heyaPressure)) {
      world.mediaState.heyaPressure[id] = Math.min(100, (pressure as number) + 5);
    }
  } else if (choice === "ignore") {
    // Ignoring has no immediate effect but may cause decay
    // Natural decay will happen in weekly boundary
  }
}

/**
 * Evaluates active scandals and applies ongoing pressure/heat effects.
 * Called every week during the media tick to keep scandal dynamics alive.
 */
export function evaluateScandals(world: WorldState): void {
  if (!world.mediaState) return;
  // Scandal pressure: stables with high scandalScore get persistent heyaPressure bumps
  for (const heya of world.heyas.values()) {
    if (!heya.scandalScore || heya.scandalScore <= 0) continue;
    const pressBump = Math.floor(heya.scandalScore / 10); // 0-3 per week
    if (pressBump > 0) {
      world.mediaState.heyaPressure[heya.id] = Math.min(
        100,
        (world.mediaState.heyaPressure[heya.id] ?? 0) + pressBump
      );
    }
  }
}

/**
 * Builds a summarized media digest object for display in the UI.
 */
export function buildMediaDigest(world: WorldState): {
  topHeadlines: MediaHeadline[];
  hotRikishi: Array<{ id: string; name: string; heat: number }>;
  hotHeya: Array<{ id: string; name: string; pressure: number }>;
  weeklyGazette: string[];
} {
  const mediaState = world.mediaState;
  if (!mediaState) {
    return { topHeadlines: [], hotRikishi: [], hotHeya: [], weeklyGazette: [] };
  }

  const topHeadlines = [...mediaState.headlines]
    .sort((a, b) => (b.impact as number) - (a.impact as number))
    .slice(0, 5);

  const hotRikishi = Object.entries(mediaState.mediaHeat)
    .map(([id, heat]) => {
      const r = world.rikishi.get(id);
      return { id, name: r?.shikona ?? r?.name ?? id, heat: heat as number };
    })
    .sort((a, b) => b.heat - a.heat)
    .slice(0, 5);

  const hotHeya = Object.entries(mediaState.heyaPressure)
    .map(([id, pressure]) => {
      const h = world.heyas.get(id);
      return { id, name: h?.name ?? id, pressure: pressure as number };
    })
    .sort((a, b) => b.pressure - a.pressure)
    .slice(0, 5);

  const weeklyGazette = topHeadlines.map(h => h.title).filter(Boolean);

  return { topHeadlines, hotRikishi, hotHeya, weeklyGazette };
}
