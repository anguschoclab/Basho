/**
 * MediaService.ts — Orchestrator for the Media system.
 * Handles state updates, headline generation, and weekly/monthly boundaries.
 */

import type { WorldState } from "../../types/world";
import type { RivalryPairState } from "../narrative/RivalryConstants";
import { MediaState, MediaHeadline, MediaTone, MediaBeat, HeadlineTier } from "../../types/media";
import { BoutResult, BashoName } from "../../types/basho";
import type { GovernanceRuling } from "../../types/economy";
import { Division } from "../../types/banzuke";
import { rngForWorld, SeededRNG } from "../../rng";
import { getRivalryBoutModifiers, RivalriesState } from "../../rivalries";
import { BardEngine } from "../../narrative/BardEngine";
import { clampInt } from "../../utils/math";

import {
  calculateBoutImpact,
  determineTier,
  calculateHeatBump,
  calculatePressureBump,
  decayHeat,
  decayPressure,
} from "./MediaImpactService";
import {
  generateBoutHeadline,
  generateStreakHeadline,
  generatePreBashoHeadline,
} from "./HeadlineGenerator";
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
 * Weekly media boundary: decay heat/pressure and rotate headlines.
 * Returns StateImpact describing media boundary updates instead of mutating state directly.
 */
export function processWeeklyMediaBoundary(world: WorldState): StateImpact {
  const builder = createImpactBuilder("processWeeklyMediaBoundary");

  if (!world.mediaState) return builder.build();

  const state = world.mediaState;
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

  builder.updateWorldField("mediaState", {
    ...state,
    mediaHeat: nextHeat,
    heyaPressure: nextPressure,
  });

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
  if (getRankImpact(winnerRank) >= 8) {
    return roll < 0.6 ? "praise" : "neutral";
  }
  return roll < 0.2 ? "praise" : "neutral";
}

function getRankImpact(rank?: string): number {
  switch (rank) {
    case "yokozuna":
      return 10;
    case "ozeki":
      return 8;
    case "sekiwake":
      return 6;
    case "komusubi":
      return 5;
    default:
      return 3;
  }
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
  const milestones = [5, 8, 10, 12, 15];
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
    mediaHeatHistory: nextHistory,
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
    absenceAnnouncements: [],
  };
}

/**
 * Generates a headline for a governance or welfare event using the BardEngine.
 * Returns StateImpact describing headline generation instead of mutating state directly.
 */
export function generateGovernanceHeadline(args: {
  world: WorldState;
  heyaId: string;
  templatePath: string; // e.g., 'institutional.welfare.watch_headline'
  severity?: HeadlineTier;
}): StateImpact {
  const { world, heyaId, templatePath, severity = "local" } = args;
  const builder = createImpactBuilder("generateGovernanceHeadline");

  if (!world.mediaState || !world.mediaState.headlines) return builder.build();

  const heya = world.heyas.get(heyaId);
  const context = {
    heyaname: heya?.name ?? "Heya",
    heya: heya?.name ?? "Heya",
  };

  const week = world.week ?? 0;
  const rng = rngForWorld(world, "media", `gov::${heyaId}::${templatePath}::${week}`);

  // Resolve title from archive
  const { text: title } = BardEngine.resolve(rng, templatePath, context);

  const headline: MediaHeadline = {
    id: rng.uuid("MH"),
    week,
    tier: severity,
    beat: templatePath.includes("welfare") ? "discipline" : "controversy",
    tone: severity === "main_event" || severity === "national" ? "controversy" : "neutral",
    rikishiIds: [],
    heyaIds: [heyaId],
    title,
    subtitle: "", // Optional for now
    impact: severity === "main_event" ? 60 : severity === "national" ? 40 : 20,
    tags: ["governance", "institutional"],
  };

  // Update media state with new headline
  const updatedHeadlines = [...world.mediaState.headlines, headline];
  if (updatedHeadlines.length > 250) updatedHeadlines.shift();

  builder.updateWorldField("mediaState", {
    ...world.mediaState,
    headlines: updatedHeadlines,
    heyaPressure: {
      ...world.mediaState.heyaPressure,
      [heyaId]: Math.min(100, (world.mediaState.heyaPressure[heyaId] ?? 0) + headline.impact / 2),
    },
  });

  console.log(`MediaService: Generated Governance Headline: ${title}`);

  return builder.build();
}

/**
 * Handles a media event choice and applies its effects.
 * Returns StateImpact describing event handling instead of mutating state directly.
 * Note: governanceLog updates are handled separately as it's not a supported world field in ImpactBuilder.
 */
export function handleMediaEvent(world: WorldState, eventId: string, choice: string): StateImpact {
  const builder = createImpactBuilder("handleMediaEvent");

  if (!world.mediaState) return builder.build();

  // Find the event in the governance log or media state
  const eventIndex = world.governanceLog?.findIndex((r) => r.id === eventId);
  if (eventIndex !== undefined && eventIndex >= 0 && world.governanceLog) {
    // Update the ruling with the player's choice via ImpactBuilder
    const ruling = world.governanceLog[eventIndex] as GovernanceRuling;
    const updatedRuling: GovernanceRuling = {
      ...ruling,
      playerChoice: choice,
      playerResponse: `Player chose: ${choice}`,
    };

    // Replace the ruling in governanceLog by updating the entire array
    const updatedGovernanceLog = [...world.governanceLog];
    updatedGovernanceLog[eventIndex] = updatedRuling;
    builder.updateWorldField("governanceLog", updatedGovernanceLog);
  }

  // Apply choice effects to media state
  // Different choices could affect heat/pressure differently
  const updatedMediaHeat = { ...world.mediaState.mediaHeat };
  const updatedHeyaPressure = { ...world.mediaState.heyaPressure };

  if (choice === "apologize") {
    // Apologizing reduces heat but may hurt reputation
    for (const [id, heat] of Object.entries(world.mediaState.mediaHeat)) {
      updatedMediaHeat[id] = Math.max(0, (heat as number) - 5);
    }
  } else if (choice === "deny") {
    // Denying may increase pressure
    for (const [id, pressure] of Object.entries(world.mediaState.heyaPressure)) {
      updatedHeyaPressure[id] = Math.min(100, (pressure as number) + 5);
    }
  } else if (choice === "ignore") {
    // Ignoring has no immediate effect but may cause decay
    // Natural decay will happen in weekly boundary
  }

  builder.updateWorldField("mediaState", {
    ...world.mediaState,
    mediaHeat: updatedMediaHeat,
    heyaPressure: updatedHeyaPressure,
  });

  return builder.build();
}

/**
 * Evaluates active scandals and applies ongoing pressure/heat effects.
 * Called every week during the media tick to keep scandal dynamics alive.
 * Returns StateImpact describing scandal evaluation instead of mutating state directly.
 */
export function evaluateScandals(world: WorldState): StateImpact {
  const builder = createImpactBuilder("evaluateScandals");

  if (!world.mediaState) return builder.build();

  // Scandal pressure: stables with high scandalScore get persistent heyaPressure bumps
  const updatedHeyaPressure = { ...world.mediaState.heyaPressure };

  for (const heya of world.heyas.values()) {
    if (!heya.scandalScore || heya.scandalScore <= 0) continue;
    const pressBump = Math.floor(heya.scandalScore / 10); // 0-3 per week
    if (pressBump > 0) {
      updatedHeyaPressure[heya.id] = Math.min(100, (updatedHeyaPressure[heya.id] ?? 0) + pressBump);
    }
  }

  builder.updateWorldField("mediaState", {
    ...world.mediaState,
    heyaPressure: updatedHeyaPressure,
  });

  return builder.build();
}

/**
 * Trigger pre-basho journalism hype.
 * (P0-D: Pre-Basho Journalism)
 */
export function triggerPreBashoJournalism(world: WorldState): StateImpact {
  const builder = createImpactBuilder("triggerPreBashoJournalism");
  const rng = rngForWorld(world, "media", `pre_basho_${world.year}_${world.currentBasho?.name}`);
  const week = world.week ?? 0;
  const headlines: MediaHeadline[] = [];

  // A. Rivalry Watch
  const rivalriesState = world.rivalriesState;
  if (rivalriesState?.pairs) {
    const hotPair = Object.values(rivalriesState.pairs).sort(
      (a: RivalryPairState, b: RivalryPairState) => b.heat - a.heat
    )[0];

    if (hotPair && hotPair.heat > 30) {
      const rA = world.rikishi.get(hotPair.aId);
      const rB = world.rikishi.get(hotPair.bId);
      const { title, subtitle } = generatePreBashoHeadline({
        rng,
        kind: "rivalryWatch",
        ctx: { SHIKONA1: rA?.shikona || "Champion", SHIKONA2: rB?.shikona || "Rival" },
      });
      headlines.push({
        id: rng.uuid("MH"),
        week,
        tier: "high",
        beat: "rivalry",
        tone: "dramatic",
        rikishiIds: [hotPair.aId, hotPair.bId],
        title,
        subtitle,
        tags: ["pre_basho", "rivalry"],
      });
    }
  }

  // B. Promotion Race
  const ozekiRikishi = Array.from(world.rikishi.values())
    .filter((r) => r.rank === "ozeki" && (r.consecutiveStrongOzeki ?? 0) >= 1)
    .sort((a, b) => (b.consecutiveStrongOzeki ?? 0) - (a.consecutiveStrongOzeki ?? 0));

  if (ozekiRikishi.length > 0) {
    const r = ozekiRikishi[0];
    const { title, subtitle } = generatePreBashoHeadline({
      rng,
      kind: "promotionRace",
      ctx: { SHIKONA: r.shikona },
    });
    headlines.push({
      id: rng.uuid("MH"),
      week,
      tier: "main_event",
      beat: "promotion",
      tone: "praise",
      rikishiIds: [r.id],
      title,
      subtitle,
      tags: ["pre_basho", "ozeki_watch"],
    });
  }

  // C. Update Media State
  const currentHeadlines = world.mediaState?.headlines || [];
  builder.updateWorldField("mediaState", {
    ...world.mediaState,
    headlines: [...currentHeadlines, ...headlines].slice(-50),
  });

  // D. Emit Management Decision Event for UI Overlay (D1)
  builder.addEvent({
    id: rng.uuid("EV"),
    type: "MANAGEMENT_DECISION",
    category: "narrative",
    title: "Media Day",
    summary: "The press has arrived at the heya. It's time to address the public.",
    tags: ["pre_basho", "press_conference", "blocking"],
    phase: "pre_basho",
    year: world.year,
    week,
  });

  builder.logEvent("PRE_BASHO_JOURNALISM", "media", {
    headlines,
    year: world.year,
    week,
  });

  return builder.build();
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

  const weeklyGazette = topHeadlines.map((h) => h.title).filter(Boolean);

  return { topHeadlines, hotRikishi, hotHeya, weeklyGazette };
}
