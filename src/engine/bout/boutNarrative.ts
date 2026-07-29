import { rngFromSeed } from "../rng";
import type { Rikishi } from "../types/rikishi";
import type { BoutResult, BashoName, BoutLogEntry } from "../types/basho";
import type { WorldState } from "../types/world";
import type { Stance } from "../types/combat";
import { BardEngine } from "../bard/BardEngine";
import { BloodlineService } from "../systems/legacy/BloodlineService";
import { buildNarrativeContext, type VoiceStyle } from "../bard/narrativeContext";
import { RivalryService } from "../systems/narrative/RivalryService";
import {
  INTENSITY_DRAMATIC,
  INTENSITY_UNDERSTATED,
  INTENSITY_FORMAL,
  RITUAL_SALT_CHANCE_UNDERSTATED,
  INJURY_MENTION_CHANCE,
  WEIGHT_DIFF_THRESHOLD,
  HEIGHT_DIFF_THRESHOLD,
  STYLE_DESC_CHANCE,
  AGE_DIFF_THRESHOLD,
  H2H_STREAK_THRESHOLD,
  CAREER_WIN_MILESTONES,
  BASHO_DAYS,
  WINLESS_MENTION_MIN_DAY,
  FIRST_WIN_MENTION_MIN_DAY,
  LEADERBOARD_MIN_LEADER_WINS,
  TRAIT_MODIFIER_CHANCE,
  INTERVIEW_CHANCE,
  STRESS_TERSE_THRESHOLD,
  MEDIA_SAVVY_POLISHED_THRESHOLD,
  BIRTHDAY_WINDOW_DAYS,
  CAREER_BOUT_MILESTONES,
  MOMENTUM_NARRATIVE_THRESHOLD,
} from "../../constants/engine/generation";
import { BASHO_CALENDAR } from "../calendar";
import { isKachiKoshi, isMakeKoshi } from "../banzuke/banzukeHelpers";
import { isYushoContention, isPlayoffScenario } from "./boutContention";

function countMakuuchiTournaments(history: { division?: string }[] | undefined): number {
  if (!history) return 0;
  let count = 0;
  for (const s of history) {
    if (s.division === "makuuchi") count++;
  }
  return count;
}

const FOCUS_BIAS_TO_STYLE: Record<string, string> = {
  power: "oshi",
  technique: "yotsu",
  speed: "speedster",
  balanced: "hybrid",
};

function focusBiasToStyleKey(focusBias: string): string | undefined {
  return FOCUS_BIAS_TO_STYLE[focusBias];
}

export type PbpPhase =
  | "opening"
  | "pre_bout"
  | "entrance"
  | "ritual"
  | "tactical"
  | "tachiai"
  | "engagement"
  | "clinch"
  | "momentum"
  | "momentum_shift"
  | "edge_crisis"
  | "fatigue"
  | "bout_injury"
  | "grip_transition"
  | "bout_timeout"
  | "counter_tactic"
  | "finish"
  | "post_bout"
  | "replay"
  | "interview"
  | "mono_ii"
  | "award"
  | "ceremony"
  | "closing"
  | "kyujo";

export type PbpVoice = "dramatic" | "formal" | "understated";

export type PbpTag =
  | "crowd_roar"
  | "gasps"
  | "upset"
  | "kinboshi"
  | "ginboshi"
  | "kensho"
  | "yusho_race"
  | "close_call"
  | "dominant"
  | "dynasty"
  | "drama"
  | "henka"
  | "rivalry"
  | "grudge_match"
  | "injury"
  | "comeback"
  | "milestone"
  | "winless"
  | "birthday"
  | "hometown"
  | "veteran"
  | "rookie"
  | "kadoban"
  | "career_high"
  | "career_phase"
  | "consecutive_kachi"
  | "kachi_koshi"
  | "make_koshi"
  | "first_win"
  | "streak"
  | "title_stakes"
  | "senshuraku"
  | "tournament_context"
  | "weight_diff"
  | "age_diff"
  | "mono_ii"
  | "interview"
  | "body_type"
  | "debut"
  | "heya_style"
  | "archetype_counter"
  | "archetype_evolution"
  | "counter"
  | "momentum_shift"
  | "ozeki_demotion"
  | "son_of_stablemaster"
  | "justice_done"
  | "schedule_delay"
  | "ydc_accountability"
  | "post_basho_press"
  | "playoff"
  | "lower_division";

export type PbpLine = {
  text: string;
  id: string;
  /** Optional phase metadata used by the narrative modal for styling */
  phase?: PbpPhase;
  /** Optional tags rendered as small icons under the line */
  tags?: PbpTag[];
  /** Voice style used for this line */
  voice?: PbpVoice;
};

function getIntensity(voiceStyle: VoiceStyle): number {
  if (voiceStyle === "dramatic") return INTENSITY_DRAMATIC;
  if (voiceStyle === "understated") return INTENSITY_UNDERSTATED;
  return INTENSITY_FORMAL;
}

/**
 * Unified bout narrative generator. Consumes raw physics frames and maps them
 * to the Bard Engine for narrative generation, producing a single rich
 * PbpLine[] array with phase, voice, and tag metadata.
 */
export function generateBoutNarrative(
  result: BoutResult,
  east: Rikishi,
  west: Rikishi,
  bashoName: BashoName | undefined,
  day: number,
  seed: string,
  world: WorldState
): void {
  const lines: PbpLine[] = [];
  const rng = rngFromSeed(seed, "narrative", "bout");
  const ctx = buildNarrativeContext(east, west, result, bashoName, day, rng);
  const intensity = getIntensity(ctx.voiceStyle);

  const push = (text: string, phase: PbpPhase, tags: PbpTag[] = []) => {
    if (text && !text.includes("[MISSING:")) {
      lines.push({
        text,
        id: `${result.boutId}-${phase}-${lines.length}`,
        phase,
        tags,
        voice: ctx.voiceStyle,
      });
    }
  };

  // 1. Venue opening line
  const openingRng = rngFromSeed(seed, "pbp", "opening");
  const openingRes = BardEngine.resolve(openingRng, `world.venues.${ctx.location}.entrance`, {
    east: east.shikona,
    west: west.shikona,
    eastRikishiId: east.id,
    westRikishiId: west.id,
    day: day,
    intensity,
  });
  push(openingRes.text, "opening");

  // 2. Dynasty Narrative
  const eastAncestor = BloodlineService.checkDynastyNarrative(east, world);
  const westAncestor = BloodlineService.checkDynastyNarrative(west, world);
  if (eastAncestor || westAncestor) {
    const dynastyRng = rngFromSeed(seed, "pbp", "dynasty");
    const rikishiWithDynasty = eastAncestor ? east : west;
    const ancestor = eastAncestor || westAncestor;
    if (ancestor) {
      push(
        BardEngine.resolve(dynastyRng, "dynasty.bout_opening", {
          RIKISHI: rikishiWithDynasty.shikona,
          ANCESTOR: ancestor,
        }).text,
        "opening",
        ["dynasty"]
      );
    }
  }

  // 3. Drama-aware opening line (reads from result.dramaticContext)
  if (result.dramaticContext && result.dramaticContext.score > 0) {
    const dramaRng = rngFromSeed(seed, "pbp", "drama");
    const dramaPath = `combat.phases.drama.${result.dramaticContext.label}` as const;
    const dramaRes = BardEngine.resolve(dramaRng, dramaPath, {
      east: east.shikona,
      west: west.shikona,
      eastRikishiId: east.id,
      westRikishiId: west.id,
    });
    push(dramaRes.text, "opening", ["drama"]);
  }

  // 3a. Rivalry context (h2h history)
  const rivalryState = RivalryService.ensureRivalriesState(world);
  const rivalryKey = RivalryService.makeRivalryKey(east.id, west.id);
  const pair = rivalryState.pairs[rivalryKey];
  const isGrudgeMatch = pair && pair.heat > 70;
  const rivalryTags: PbpTag[] = isGrudgeMatch ? ["rivalry", "grudge_match"] : ["rivalry"];
  if (!pair || pair.meetings < 1) {
    const h2hRng = rngFromSeed(seed, "pbp", "h2h-first");
    push(
      BardEngine.resolve(h2hRng, "h2h.first_meeting", {
        P1: east.shikona,
        P2: west.shikona,
        eastRikishiId: east.id,
        westRikishiId: west.id,
      }).text,
      "opening",
      rivalryTags
    );
  } else {
    const aIsEast = pair.aId === east.id;
    const eastWins = aIsEast ? pair.aWins : pair.bWins;
    const westWins = aIsEast ? pair.bWins : pair.aWins;
    const total = pair.meetings;
    const diff = Math.abs(eastWins - westWins);
    const h2hRng = rngFromSeed(seed, "pbp", "h2h-context");

    if (diff >= 3 && total >= 2) {
      const eastDominates = eastWins > westWins;
      push(
        BardEngine.resolve(h2hRng, "h2h.domination", {
          P1: eastDominates ? east.shikona : west.shikona,
          P2: eastDominates ? west.shikona : east.shikona,
          WINS: eastDominates ? eastWins : westWins,
          LOSSES: eastDominates ? westWins : eastWins,
          TOTAL: total,
          eastRikishiId: east.id,
          westRikishiId: west.id,
        }).text,
        "opening",
        rivalryTags
      );
    } else if (diff <= 1 && total >= 2) {
      push(
        BardEngine.resolve(h2hRng, "h2h.deadlock", {
          WINS: Math.max(eastWins, westWins),
          LOSSES: Math.min(eastWins, westWins),
          eastRikishiId: east.id,
          westRikishiId: west.id,
        }).text,
        "opening",
        ["drama"]
      );
    }

    // Recent bout callback
    if (pair.lastKimarite && pair.lastWinnerId) {
      const lastWinnerIsEast = pair.lastWinnerId === east.id;
      push(
        BardEngine.resolve(h2hRng, "h2h.recent", {
          WINNER: lastWinnerIsEast ? east.shikona : west.shikona,
          LOSER: lastWinnerIsEast ? west.shikona : east.shikona,
          KIMARITE: pair.lastKimarite,
          DAY: pair.lastMetWeek ?? 1,
          eastRikishiId: east.id,
          westRikishiId: west.id,
        }).text,
        "opening",
        rivalryTags
      );
    }

    // H2H winless (one rikishi has 0 wins in 3+ meetings)
    if (total >= 3 && (eastWins === 0 || westWins === 0)) {
      const dominantRikishi = eastWins > westWins ? east : west;
      const winlessRikishi = eastWins > westWins ? west : east;
      push(
        BardEngine.resolve(h2hRng, "h2h.winless", {
          P1: dominantRikishi.shikona,
          P2: winlessRikishi.shikona,
          TOTAL: total,
          eastRikishiId: east.id,
          westRikishiId: west.id,
        }).text,
        "opening",
        rivalryTags
      );
    }

    // Career wins parallel (both have same career wins)
    if (east.careerWins !== undefined && west.careerWins !== undefined && east.careerWins === west.careerWins) {
      push(
        BardEngine.resolve(h2hRng, "h2h.career_parallel", {
          P1: east.shikona,
          P2: west.shikona,
          WINS: east.careerWins,
          eastRikishiId: east.id,
          westRikishiId: west.id,
        }).text,
        "opening",
        ["milestone"]
      );
    }
  }

  // 3b. In-basho win streak callout
  const eastStreak = east.currentBashoWins ?? 0;
  const westStreak = west.currentBashoWins ?? 0;
  const maxStreak = Math.max(eastStreak, westStreak);
  if (maxStreak >= 5) {
    const streakRikishi = eastStreak >= westStreak ? east : west;
    const streakRng = rngFromSeed(seed, "pbp", "streak");
    let streakPath: string;
    if (maxStreak >= 12) streakPath = "media.streaks.legendary";
    else if (maxStreak >= 8) streakPath = "media.streaks.hot";
    else streakPath = "media.streaks.notable";
    push(
      BardEngine.resolve(streakRng, streakPath, {
        SHIKONA: streakRikishi.shikona,
        STREAK: maxStreak,
        rikishiId: streakRikishi.id,
      }).text,
      "opening",
      ["dominant"]
    );
  }

  // ── PRE-BOUT CONTEXT ──────────────────────────────────────────
  // NHK-style pre-bout commentary: records, storylines, physical comparisons, H2H streaks,
  // injury mentions, career milestones, hometown angles, age narratives, kadoban.

  const preBoutRng = rngFromSeed(seed, "pbp", "pre-bout");
  const winnerRikishi = result.winner === "east" ? east : west;
  const loserRikishi = result.winner === "east" ? west : east;

  // 3a-pre. Current basho records
  const eastWins = east.currentBashoWins ?? 0;
  const eastLosses = east.currentBashoLosses ?? 0;
  const westWins = west.currentBashoWins ?? 0;
  const westLosses = west.currentBashoLosses ?? 0;

  if (day > 1 && (eastWins > 0 || eastLosses > 0) && (westWins > 0 || westLosses > 0)) {
    const eastWinning = eastWins > eastLosses;
    const westWinning = westWins > westLosses;
    let recordPath: string;
    if (eastWins === westWins && eastLosses === westLosses) {
      if (eastWins >= 7 && day >= 10) {
        recordPath = "pre_bout.records.championship_elimination";
      } else {
        recordPath = "pre_bout.records.both_even";
      }
    } else if (eastWinning && westWinning) {
      recordPath = "pre_bout.records.both_contending";
    } else if (!eastWinning && !westWinning) {
      recordPath = "pre_bout.records.both_struggling";
    } else {
      recordPath = "pre_bout.records.one_struggling";
    }
    push(
      BardEngine.resolve(preBoutRng, recordPath, {
        EAST_NAME: east.shikona,
        WEST_NAME: west.shikona,
        EAST_WINS: eastWins.toString(),
        EAST_LOSSES: eastLosses.toString(),
        WEST_WINS: westWins.toString(),
        WEST_LOSSES: westLosses.toString(),
        DAY: day.toString(),
        eastRikishiId: east.id,
        westRikishiId: west.id,
      }).text,
      "pre_bout",
      []
    );
  }

  // 3a-pre2. Previous basho record
  const eastPrevBasho = east.careerHistory?.[east.careerHistory.length - 1];
  const westPrevBasho = west.careerHistory?.[west.careerHistory.length - 1];
  if (eastPrevBasho && westPrevBasho) {
    const eastRelevant = eastPrevBasho.isYusho || eastPrevBasho.absences >= 15 || eastPrevBasho.wins >= 10;
    const westRelevant = westPrevBasho.isYusho || westPrevBasho.absences >= 15 || westPrevBasho.wins >= 10;
    if (eastRelevant && westRelevant) {
      push(
        BardEngine.resolve(preBoutRng, "pre_bout.previous_basho.both_relevant", {
          EAST_NAME: east.shikona,
          WEST_NAME: west.shikona,
          EAST_PREV_WINS: eastPrevBasho.wins.toString(),
          EAST_PREV_LOSSES: eastPrevBasho.losses.toString(),
          WEST_PREV_WINS: westPrevBasho.wins.toString(),
          WEST_PREV_LOSSES: westPrevBasho.losses.toString(),
          eastRikishiId: east.id,
          westRikishiId: west.id,
        }).text,
        "pre_bout",
        []
      );
    } else if (eastRelevant || westRelevant) {
      const r = eastRelevant ? east : west;
      const prev = eastRelevant ? eastPrevBasho : westPrevBasho;
      let prevPath: string;
      if (prev.absences >= 15) {
        prevPath = "pre_bout.previous_basho.kyujo";
      } else if (prev.isYusho) {
        prevPath = "pre_bout.previous_basho.yusho";
      } else {
        prevPath = "pre_bout.previous_basho.standard";
      }
      push(
        BardEngine.resolve(preBoutRng, prevPath, {
          NAME: r.shikona,
          PREV_WINS: prev.wins.toString(),
          PREV_LOSSES: prev.losses.toString(),
          rikishiId: r.id,
        }).text,
        "pre_bout",
        []
      );
    }
  } else if (eastPrevBasho || westPrevBasho) {
    const r = eastPrevBasho ? east : west;
    const prev = eastPrevBasho ?? westPrevBasho!;
    let prevPath: string;
    if (prev.absences >= 15) {
      prevPath = "pre_bout.previous_basho.kyujo";
    } else if (prev.isYusho) {
      prevPath = "pre_bout.previous_basho.yusho";
    } else {
      prevPath = "pre_bout.previous_basho.standard";
    }
    push(
      BardEngine.resolve(preBoutRng, prevPath, {
        NAME: r.shikona,
        PREV_WINS: prev.wins.toString(),
        PREV_LOSSES: prev.losses.toString(),
        rikishiId: r.id,
      }).text,
      "pre_bout",
      []
    );
  }

  // 3a-pre3. Career-high rank detection
  for (const r of [east, west]) {
    if (!r.careerHistory || r.careerHistory.length === 0) continue;
    const currentRankNumber = r.rankNumber ?? 99;
    const isCareerHigh = r.careerHistory.every(s => s.rankNumber >= currentRankNumber);
    if (isCareerHigh) {
      let careerHighPath: string;
      const isSanyaku = currentRankNumber <= 4;
      if (isSanyaku) {
        careerHighPath = "pre_bout.career_high.sanyaku";
      } else if (r.division === "juryo") {
        careerHighPath = "pre_bout.career_high.juryo";
      } else {
        careerHighPath = "pre_bout.career_high.makuuchi";
      }
      push(
        BardEngine.resolve(preBoutRng, careerHighPath, {
          NAME: r.shikona,
          RANK_NUMBER: currentRankNumber.toString(),
          rikishiId: r.id,
        }).text,
        "pre_bout",
        ["career_high"]
      );
    }
  }

  // 3a-pre4. Storyline context: kachi-koshi chase, make-koshi avoidance, rookie, tournament count
  for (const r of [east, west]) {
    const rWins = r.currentBashoWins ?? 0;
    const rLosses = r.currentBashoLosses ?? 0;
    const threshold = 8;
    const needed = threshold - rWins;
    if (needed > 0 && needed <= 2 && rLosses < threshold && day < BASHO_DAYS) {
      push(
        BardEngine.resolve(preBoutRng, "pre_bout.storylines.kachi_chase", {
          NAME: r.shikona,
          NEEDED: needed.toString(),
          PLURAL: needed > 1 ? "s" : "",
          rikishiId: r.id,
        }).text,
        "pre_bout",
        ["kachi_koshi"]
      );
    }
    if (rLosses === threshold - 1 && rWins < threshold && day < BASHO_DAYS) {
      push(
        BardEngine.resolve(preBoutRng, "pre_bout.storylines.make_koshi_avoidance", {
          NAME: r.shikona,
          rikishiId: r.id,
        }).text,
        "pre_bout",
        ["make_koshi"]
      );
    }
  }

  // Rookie / tournament count
  for (const r of [east, west]) {
    if (!r.careerHistory) continue;
    const makuuchiCount = countMakuuchiTournaments(r.careerHistory);
    if (makuuchiCount === 0 && r.backstory) {
      push(
        BardEngine.resolve(preBoutRng, "pre_bout.debut_backstory", {
          SHIKONA: r.shikona,
          BACKSTORY: r.backstory,
          rikishiId: r.id,
        }).text,
        "pre_bout",
        ["rookie", "debut"]
      );
    } else if (makuuchiCount === 1) {
      push(
        BardEngine.resolve(preBoutRng, "pre_bout.storylines.rookie", {
          NAME: r.shikona,
          COUNT: makuuchiCount.toString(),
          rikishiId: r.id,
        }).text,
        "pre_bout",
        ["rookie"]
      );
    } else if (makuuchiCount > 1 && makuuchiCount <= 3) {
      push(
        BardEngine.resolve(preBoutRng, "pre_bout.storylines.rookie", {
          NAME: r.shikona,
          COUNT: makuuchiCount.toString(),
          rikishiId: r.id,
        }).text,
        "pre_bout",
        ["rookie"]
      );
    } else if (makuuchiCount >= 15) {
      push(
        BardEngine.resolve(preBoutRng, "pre_bout.storylines.tournament_count", {
          NAME: r.shikona,
          COUNT: makuuchiCount.toString(),
          rikishiId: r.id,
        }).text,
        "pre_bout",
        ["veteran"]
      );
    }
  }

  // 3c. True H2H consecutive streak (from rikishi.h2h records)
  const eastH2h = east.h2h[west.id];
  if (eastH2h && Math.abs(eastH2h.streak) >= H2H_STREAK_THRESHOLD) {
    const isEastStreak = eastH2h.streak > 0;
    const streakRikishi = isEastStreak ? east : west;
    const streakOpponent = isEastStreak ? west : east;
    push(
      BardEngine.resolve(preBoutRng, "pre_bout.h2h_streak", {
        P1: streakRikishi.shikona,
        P2: streakOpponent.shikona,
        STREAK: Math.abs(eastH2h.streak).toString(),
        eastRikishiId: east.id,
        westRikishiId: west.id,
      }).text,
      "pre_bout",
      ["rivalry"]
    );
  }

  // 3d. Injury mention (probabilistic, with sub-path selection)
  if (east.injured || west.injured) {
    const injuredRikishi = east.injured ? east : west;
    if (preBoutRng.next() < INJURY_MENTION_CHANCE) {
      const injuryStatus = injuredRikishi.injuryStatus;
      const currentInjury = injuredRikishi.currentInjury;
      const severity = injuryStatus?.severity ?? currentInjury?.severity;
      const area = injuryStatus?.location ?? currentInjury?.area ?? "leg";
      let injuryPath = "pre_bout.injury.generic";
      if (severity === "minor") {
        injuryPath = "pre_bout.injury.nagging";
      } else if (severity === "moderate" || severity === "serious") {
        injuryPath = "pre_bout.injury.struggling";
      } else if (area && area !== "leg") {
        injuryPath = "pre_bout.injury.specific_area";
      }
      push(
        BardEngine.resolve(preBoutRng, injuryPath, {
          SHIKONA: injuredRikishi.shikona,
          AREA: area,
          rikishiId: injuredRikishi.id,
        }).text,
        "pre_bout",
        ["injury"]
      );
    }
  }

  // 3d-2. Injury recovery narrative (6.3): rikishi returning from injury
  for (const r of [east, west]) {
    if (r.recentlyReturnedFromInjury && !r.injured) {
      push(
        BardEngine.resolve(preBoutRng, "pre_bout.injury_return", {
          SHIKONA: r.shikona,
          rikishiId: r.id,
        }).text,
        "pre_bout",
        ["comeback", "injury"]
      );

      // Also generate the kyujo return narrative line
      const kyujoReturnLines = generateKyujoNarrative(
        r,
        "return_from_kyujo",
        { bashosMissed: 1 },
        `return-kyujo-${r.id}-${world.year}-${world.currentBashoName ?? ""}`
      );
      for (const line of kyujoReturnLines) {
        push(line.text, "pre_bout", ["comeback", "injury"]);
      }
    }
  }

  // 3d-3. Ozeki demotion comeback narrative
  for (const r of [east, west]) {
    if (r.wasDemotedFromOzeki) {
      push(
        BardEngine.resolve(preBoutRng, "pre_bout.ozeki_demotion_comeback", {
          SHIKONA: r.shikona,
          rikishiId: r.id,
        }).text,
        "pre_bout",
        ["comeback", "ozeki_demotion"]
      );
    }
  }

  // 3d-4. Son of stablemaster narrative
  for (const r of [east, west]) {
    if (r.isSonOfStablemaster) {
      push(
        BardEngine.resolve(preBoutRng, "pre_bout.son_of_stablemaster", {
          SHIKONA: r.shikona,
          rikishiId: r.id,
        }).text,
        "pre_bout",
        ["son_of_stablemaster"]
      );
    }
  }

  // 3e. Physical comparison (weight/height diff)
  const weightDiff = Math.abs(east.weight - west.weight);
  const heightDiff = Math.abs(east.height - west.height);
  if (weightDiff >= WEIGHT_DIFF_THRESHOLD || heightDiff >= HEIGHT_DIFF_THRESHOLD) {
    const heavier = east.weight >= west.weight ? east : west;
    const lighter = east.weight >= west.weight ? west : east;
    push(
      BardEngine.resolve(preBoutRng, "pre_bout.physical_comparison", {
        HEAVIER: heavier.shikona,
        LIGHTER: lighter.shikona,
        WEIGHT_DIFF: weightDiff.toString(),
        HEIGHT_DIFF: heightDiff.toString(),
        heavierRikishiId: heavier.id,
        lighterRikishiId: lighter.id,
      }).text,
      "pre_bout",
      ["weight_diff"]
    );
  }

  // 3f. Fighting style description (probabilistic)
  if (preBoutRng.next() < STYLE_DESC_CHANCE) {
    const eastArchetype = east.combatProfile?.archetype ?? "hybrid";
    const westArchetype = west.combatProfile?.archetype ?? "hybrid";
    push(
      BardEngine.resolve(preBoutRng, "pre_bout.style_matchup", {
        EAST: east.shikona,
        WEST: west.shikona,
        EAST_STYLE: eastArchetype,
        WEST_STYLE: westArchetype,
        eastRikishiId: east.id,
        westRikishiId: west.id,
      }).text,
      "pre_bout",
      []
    );
  }

  // 3f-2. Body type narrative (5.1)
  for (const r of [east, west]) {
    if (r.bodyType && BardEngine.has(`pre_bout.body_type.${r.bodyType}`)) {
      push(
        BardEngine.resolve(preBoutRng, `pre_bout.body_type.${r.bodyType}`, {
          SHIKONA: r.shikona,
          rikishiId: r.id,
        }).text,
        "pre_bout",
        ["body_type"]
      );
    }
  }

  // 3f-3. Heya style narrative (5.3)
  const seenHeya = new Set<string>();
  for (const r of [east, west]) {
    if (!r.heyaId || seenHeya.has(r.heyaId)) continue;
    const heya = world.heyas?.get(r.heyaId);
    if (!heya?.trainingPhilosophy) continue;
    const tp = heya.trainingPhilosophy;
    const styleKey = tp.signatureStyle ?? focusBiasToStyleKey(tp.focusBias);
    if (styleKey && BardEngine.has(`pre_bout.heya_style.${styleKey}`)) {
      seenHeya.add(r.heyaId);
      push(
        BardEngine.resolve(preBoutRng, `pre_bout.heya_style.${styleKey}`, {
          SHIKONA: r.shikona,
          HEYA_NAME: heya.name,
          rikishiId: r.id,
          heyaId: heya.id,
        }).text,
        "pre_bout",
        ["heya_style"]
      );
    }
  }

  // 3f-4. Archetype evolution narrative (2.3)
  for (const r of [east, west]) {
    if (!r.archetypeHistory || r.archetypeHistory.length < 1) continue;
    const originalArchetype = r.archetypeHistory[0].archetype;
    const currentArchetype = r.combatProfile?.archetype;
    if (!currentArchetype || originalArchetype === currentArchetype) continue;
    const years = (world.year - r.archetypeHistory[0].year).toString();
    push(
      BardEngine.resolve(preBoutRng, "pre_bout.archetype_evolution", {
        SHIKONA: r.shikona,
        OLD_STYLE: originalArchetype,
        NEW_STYLE: currentArchetype,
        YEARS: years,
        rikishiId: r.id,
      }).text,
      "pre_bout",
      ["archetype_evolution"]
    );
  }

  // 3f-5. Archetype counter narrative — when archetypeMatchup.counterActivated is true
  if (result.archetypeMatchup?.counterActivated) {
    push(
      BardEngine.resolve(preBoutRng, "pre_bout.archetype_counter", {
        EAST: east.shikona,
        WEST: west.shikona,
        EAST_STYLE: east.combatProfile?.archetype ?? "hybrid",
        WEST_STYLE: west.combatProfile?.archetype ?? "hybrid",
        eastRikishiId: east.id,
        westRikishiId: west.id,
      }).text,
      "pre_bout",
      ["archetype_counter"]
    );
  }

  // 3g. Age narrative (veteran vs youngster)
  const eastAge = east.age ?? (world.year - east.birthYear);
  const westAge = west.age ?? (world.year - west.birthYear);
  const ageDiff = Math.abs(eastAge - westAge);
  if (ageDiff >= AGE_DIFF_THRESHOLD) {
    const older = eastAge >= westAge ? east : west;
    const younger = eastAge >= westAge ? west : east;
    const olderTags: PbpTag[] = (eastAge >= westAge ? eastAge : westAge) >= 35 ? ["veteran"] : [];
    const youngerTags: PbpTag[] = (eastAge >= westAge ? westAge : eastAge) <= 22 ? ["rookie"] : [];
    push(
      BardEngine.resolve(preBoutRng, "pre_bout.age_narrative", {
        OLDER: older.shikona,
        YOUNGER: younger.shikona,
        AGE_DIFF: ageDiff.toString(),
        olderRikishiId: older.id,
        youngerRikishiId: younger.id,
      }).text,
      "pre_bout",
      ["age_diff", ...olderTags, ...youngerTags]
    );
  }

  // 3g2. Battle of veterans (6.4): when both rikishi are 30+, add special framing
  if (eastAge >= 30 && westAge >= 30) {
    push(
      BardEngine.resolve(preBoutRng, "pre_bout.battle_of_veterans", {
        EAST: east.shikona,
        WEST: west.shikona,
        eastRikishiId: east.id,
        westRikishiId: west.id,
      }).text,
      "pre_bout",
      ["veteran", "age_diff"]
    );
  }

  // 3h. Career win milestone check
  for (const milestone of CAREER_WIN_MILESTONES) {
    if ((winnerRikishi.careerWins ?? 0) + 1 === milestone) {
      push(
        BardEngine.resolve(preBoutRng, "pre_bout.career_milestone", {
          SHIKONA: winnerRikishi.shikona,
          MILESTONE: milestone.toString(),
          rikishiId: winnerRikishi.id,
        }).text,
        "pre_bout",
        ["milestone"]
      );
      break;
    }
  }

  // 3h2. Career bout count milestone (Gap 1)
  for (const r of [east, west]) {
    const careerBouts = (r.careerWins ?? 0) + (r.careerLosses ?? 0);
    for (const milestone of CAREER_BOUT_MILESTONES) {
      if (careerBouts + 1 === milestone) {
        push(
          BardEngine.resolve(preBoutRng, "pre_bout.career_bout_milestone", {
            SHIKONA: r.shikona,
            MILESTONE: milestone.toString(),
            rikishiId: r.id,
          }).text,
          "pre_bout",
          ["milestone"]
        );
        break;
      }
    }
  }

  // 3i. Consecutive kachi-koshi streak
  const eastKachiStreak = east.consecutiveKachiKoshi ?? 0;
  const westKachiStreak = west.consecutiveKachiKoshi ?? 0;
  const maxKachiStreak = Math.max(eastKachiStreak, westKachiStreak);
  if (maxKachiStreak >= 3) {
    const streakRikishi = eastKachiStreak >= westKachiStreak ? east : west;
    push(
      BardEngine.resolve(preBoutRng, "pre_bout.consecutive_kachi", {
        SHIKONA: streakRikishi.shikona,
        STREAK: maxKachiStreak.toString(),
        rikishiId: streakRikishi.id,
      }).text,
      "pre_bout",
      ["consecutive_kachi"]
    );
  }

  // 3j. Kadoban mention
  const kadobanMap = world.ozekiKadoban ?? {};
  const eastKadoban = kadobanMap[east.id];
  const westKadoban = kadobanMap[west.id];
  if (eastKadoban || westKadoban) {
    const kadobanRikishi = eastKadoban ? east : west;
    push(
      BardEngine.resolve(preBoutRng, "pre_bout.kadoban", {
        SHIKONA: kadobanRikishi.shikona,
        rikishiId: kadobanRikishi.id,
      }).text,
      "pre_bout",
      ["kadoban"]
    );
  }

  // 3j2. Ozeki return detection (sekiwake/komusubi formerly ozeki, with 9+ wins)
  for (const r of [east, west]) {
    if ((r.rank === "sekiwake" || r.rank === "komusubi") && r.careerHistory) {
      const wasOzeki = r.careerHistory.some(s => s.rank === "ozeki");
      if (wasOzeki && (r.currentBashoWins ?? 0) >= 9) {
        const needed = Math.max(0, 10 - (r.currentBashoWins ?? 0));
        push(
          BardEngine.resolve(preBoutRng, "pre_bout.ozeki_return", {
            SHIKONA: r.shikona,
            NEEDED: needed.toString(),
            rikishiId: r.id,
          }).text,
          "pre_bout",
          ["kadoban"]
        );
      }
    }
  }

  // 3j3. Yokozuna promotion detection (ozeki with consecutiveStrongOzeki >= 1)
  for (const r of [east, west]) {
    if (r.rank === "ozeki" && (r.consecutiveStrongOzeki ?? 0) >= 1) {
      push(
        BardEngine.resolve(preBoutRng, "pre_bout.yokozuna_promotion", {
          SHIKONA: r.shikona,
          rikishiId: r.id,
        }).text,
        "pre_bout",
        ["title_stakes"]
      );
    }
  }

  // 3j3b. Spoiler narrative (Gap 7): former sanyaku facing a contender
  for (const [spoiler, contender] of [[east, west], [west, east]] as const) {
    if (!spoiler.careerHistory || spoiler.careerHistory.length === 0) continue;
    const formerSanyaku = spoiler.careerHistory.some(
      (s) => s.rank === "ozeki" || s.rank === "sekiwake" || s.rank === "komusubi"
    );
    const isCurrentlyLower = spoiler.rank === "maegashira";
    if (!formerSanyaku || !isCurrentlyLower) continue;
    const contenderInContention =
      (world.currentBasho && isYushoContention(contender, spoiler, world.currentBasho)) ||
      (contender.currentBashoWins ?? 0) >= 8;
    if (!contenderInContention) continue;
    const formerRank = spoiler.careerHistory.find(
      (s) => s.rank === "ozeki" || s.rank === "sekiwake" || s.rank === "komusubi"
    )?.rank ?? "sanyaku";
    push(
      BardEngine.resolve(preBoutRng, "pre_bout.spoiler", {
        SPOILER: spoiler.shikona,
        CONTENDER: contender.shikona,
        SPOILER_FORMER_RANK: formerRank,
        spoilerId: spoiler.id,
        contenderId: contender.id,
      }).text,
      "pre_bout",
      ["title_stakes"]
    );
    break;
  }

  // 3j4. Career phase narrative (6.1): debut, prime, decline, veteran
  for (const r of [east, west]) {
    const age = r.age ?? (world.year - r.birthYear);
    const careerBouts = (r.careerWins ?? 0) + (r.careerLosses ?? 0);
    let phase: "debut" | "prime" | "decline" | "veteran" | null = null;
    if (careerBouts < 15) phase = "debut";
    else if (age >= 34) phase = "veteran";
    else if (age >= 30) phase = "decline";
    else if (age >= 24 && age <= 29 && careerBouts > 50) phase = "prime";
    if (phase) {
      push(
        BardEngine.resolve(preBoutRng, `pre_bout.career_phase_${phase}`, {
          SHIKONA: r.shikona,
          AGE: age.toString(),
          BOUTS: careerBouts.toString(),
          rikishiId: r.id,
        }).text,
        "pre_bout",
        [phase === "debut" ? "rookie" : phase === "veteran" ? "veteran" : "career_phase"]
      );
    }
  }

  // 3j4b. Rank debut narrative (Gap 8): shin-sekiwake, shin-komusubi, shin-maegashira
  for (const r of [east, west]) {
    if (!r.careerHistory || r.careerHistory.length === 0) continue;
    const prevBasho = r.careerHistory[r.careerHistory.length - 1];
    const prevRank = prevBasho.rank;
    const currentRank = r.rank;
    const sanyakuRanks = ["sekiwake", "komusubi"];
    // Use both rank comparison and the sanyakuPromotionThisBasho flag from banzuke (Gap 5)
    const isSanyakuDebut =
      (sanyakuRanks.includes(currentRank ?? "") && !sanyakuRanks.includes(prevRank ?? "") && prevRank !== "yokozuna" && prevRank !== "ozeki") ||
      r.sanyakuPromotionThisBasho;
    if (isSanyakuDebut && sanyakuRanks.includes(currentRank ?? "")) {
      const debutPath = currentRank === "sekiwake" ? "pre_bout.rank_debut.shin_sekiwake" : "pre_bout.rank_debut.shin_komusubi";
      push(
        BardEngine.resolve(preBoutRng, debutPath, {
          SHIKONA: r.shikona,
          rikishiId: r.id,
        }).text,
        "pre_bout",
        ["debut"]
      );
    } else if (currentRank === "maegashira" && prevRank !== "maegashira") {
      const currentRankNumber = r.rankNumber ?? 99;
      const isCareerHigh = r.careerHistory.every((s) => (s.rankNumber ?? 99) >= currentRankNumber);
      if (isCareerHigh) {
        push(
          BardEngine.resolve(preBoutRng, "pre_bout.rank_debut.shin_maegashira", {
            SHIKONA: r.shikona,
            RANK_NUMBER: currentRankNumber.toString(),
            rikishiId: r.id,
          }).text,
          "pre_bout",
          ["debut"]
        );
      }
    }
  }

  // 3k. Hometown angle
  const bashoInfo = bashoName ? BASHO_CALENDAR[bashoName] : undefined;
  if (east.origin && west.origin && east.origin !== west.origin) {
    const bashoLocation = bashoInfo?.location;
    if (bashoLocation && (east.origin === bashoLocation || west.origin === bashoLocation)) {
      const hometownRikishi = east.origin === bashoLocation ? east : west;
      push(
        BardEngine.resolve(preBoutRng, "pre_bout.hometown", {
          SHIKONA: hometownRikishi.shikona,
          LOCATION: bashoLocation,
          rikishiId: hometownRikishi.id,
        }).text,
        "pre_bout",
        ["hometown"]
      );
    }
  }

  // 3l. Birthday mention (within BIRTHDAY_WINDOW_DAYS of current basho day)
  if (bashoInfo) {
    for (const r of [east, west]) {
      if (r.birthMonth && r.birthDay && r.birthMonth === bashoInfo.month) {
        const dayDiff = Math.abs(r.birthDay - day);
        if (dayDiff <= BIRTHDAY_WINDOW_DAYS) {
          push(
            BardEngine.resolve(preBoutRng, "pre_bout.birthday", {
              SHIKONA: r.shikona,
              AGE: (r.age ?? 0).toString(),
              rikishiId: r.id,
            }).text,
            "pre_bout",
            ["birthday"]
          );
        }
      }
    }
  }

  // 3m. Winless / first win callout
  if (day >= WINLESS_MENTION_MIN_DAY) {
    if (eastWins === 0 && eastLosses >= day - 1) {
      push(
        BardEngine.resolve(preBoutRng, "pre_bout.winless", {
          SHIKONA: east.shikona,
          LOSSES: eastLosses.toString(),
          rikishiId: east.id,
        }).text,
        "pre_bout",
        ["winless"]
      );
    }
    if (westWins === 0 && westLosses >= day - 1) {
      push(
        BardEngine.resolve(preBoutRng, "pre_bout.winless", {
          SHIKONA: west.shikona,
          LOSSES: westLosses.toString(),
          rikishiId: west.id,
        }).text,
        "pre_bout",
        ["winless"]
      );
    }
  }
  if (day >= FIRST_WIN_MENTION_MIN_DAY) {
    if (eastWins === 1 && eastLosses >= day - 2) {
      push(
        BardEngine.resolve(preBoutRng, "pre_bout.first_win", {
          SHIKONA: east.shikona,
          rikishiId: east.id,
        }).text,
        "pre_bout",
        ["comeback"]
      );
    }
    if (westWins === 1 && westLosses >= day - 2) {
      push(
        BardEngine.resolve(preBoutRng, "pre_bout.first_win", {
          SHIKONA: west.shikona,
          rikishiId: west.id,
        }).text,
        "pre_bout",
        ["comeback"]
      );
    }
  }

  // 3n. Tournament day context
  if (day === BASHO_DAYS) {
    // Final day — emit both senshuraku and final_day templates
    push(
      BardEngine.resolve(preBoutRng, "pre_bout.senshuraku", {
        eastRikishiId: east.id,
        westRikishiId: west.id,
      }).text,
      "pre_bout",
      ["senshuraku", "tournament_context"]
    );
    push(
      BardEngine.resolve(preBoutRng, "pre_bout.final_day", {
        eastRikishiId: east.id,
        westRikishiId: west.id,
      }).text,
      "pre_bout",
      ["tournament_context"]
    );
  } else if (day === BASHO_DAYS - 1) {
    push(
      BardEngine.resolve(preBoutRng, "pre_bout.penultimate", {
        eastRikishiId: east.id,
        westRikishiId: west.id,
      }).text,
      "pre_bout",
      ["tournament_context"]
    );
  } else if (day === 1) {
    push(
      BardEngine.resolve(preBoutRng, "pre_bout.opening_day", {
        eastRikishiId: east.id,
        westRikishiId: west.id,
      }).text,
      "pre_bout",
      ["tournament_context"]
    );
  } else if (day >= 2 && day <= 4) {
    push(
      BardEngine.resolve(preBoutRng, "pre_bout.early_days", {
        DAY: day.toString(),
        eastRikishiId: east.id,
        westRikishiId: west.id,
      }).text,
      "pre_bout",
      ["tournament_context"]
    );
  } else if (day >= 5 && day <= 9) {
    push(
      BardEngine.resolve(preBoutRng, "pre_bout.mid_tournament", {
        DAY: day.toString(),
        eastRikishiId: east.id,
        westRikishiId: west.id,
      }).text,
      "pre_bout",
      ["tournament_context"]
    );
  } else if (day >= 10 && day <= 13) {
    push(
      BardEngine.resolve(preBoutRng, "pre_bout.late_tournament", {
        DAY: day.toString(),
        eastRikishiId: east.id,
        westRikishiId: west.id,
      }).text,
      "pre_bout",
      ["tournament_context"]
    );
  }

  // 3o. Title stakes / yusho race context
  if (result.isYushoRace || result.isTitleStakes) {
    const tags: PbpTag[] = result.isYushoRace ? ["yusho_race"] : ["title_stakes"];
    push(
      BardEngine.resolve(preBoutRng, "pre_bout.title_stakes", {
        EAST: east.shikona,
        WEST: west.shikona,
        eastRikishiId: east.id,
        westRikishiId: west.id,
      }).text,
      "pre_bout",
      tags
    );
  }

  // 3p. Leaderboard summary (days 5+, when leader has enough wins)
  if (day >= 5 && world.currentBasho) {
    const standings = world.currentBasho.standings;
    let maxWins = 0;
    const leaders: string[] = [];
    let chasers = 0;
    for (const [rid, rec] of standings) {
      const w = rec.wins;
      if (w > maxWins) {
        maxWins = w;
        leaders.length = 0;
        const r = world.rikishi.get(rid);
        if (r) leaders.push(r.shikona);
      } else if (w === maxWins) {
        const r = world.rikishi.get(rid);
        if (r) leaders.push(r.shikona);
      } else if (w === maxWins - 1) {
        chasers++;
      }
    }
    if (maxWins >= LEADERBOARD_MIN_LEADER_WINS && leaders.length > 0) {
      const leaderNames = leaders.length === 1 ? leaders[0] : leaders.slice(0, 2).join(" and ");
      const isCoLeaders = leaders.length >= 2;
      push(
        BardEngine.resolve(preBoutRng, isCoLeaders ? "pre_bout.leaderboard_co_leaders" : "pre_bout.leaderboard", {
          SHIKONA: leaderNames,
          WINS: maxWins.toString(),
          CHASERS: chasers.toString(),
        }).text,
        "pre_bout",
        ["tournament_context"]
      );
    }
  }

  // 3p2. Yusho contention / playoff implications
  if (world.currentBasho) {
    if (isYushoContention(east, west, world.currentBasho)) {
      push(
        BardEngine.resolve(preBoutRng, "pre_bout.yusho_race", {
          EAST: east.shikona,
          WEST: west.shikona,
          eastRikishiId: east.id,
          westRikishiId: west.id,
        }).text,
        "pre_bout",
        ["yusho_race"]
      );
    }
    if (isPlayoffScenario(east, west, world.currentBasho)) {
      push(
        BardEngine.resolve(preBoutRng, "pre_bout.playoff_implications", {
          EAST: east.shikona,
          WEST: west.shikona,
          eastRikishiId: east.id,
          westRikishiId: west.id,
        }).text,
        "pre_bout",
        ["yusho_race"]
      );
    }
  }

  // 3p3. Pre-bout kensho mention (7.3): sponsor interest when high kensho expected
  if (result.kenshoEnvelopes > 3) {
    push(
      BardEngine.resolve(preBoutRng, "pre_bout.kensho", {
        BANNERS: result.kenshoEnvelopes.toString(),
        EAST: east.shikona,
        WEST: west.shikona,
        eastRikishiId: east.id,
        westRikishiId: west.id,
      }).text,
      "pre_bout",
      ["kensho"]
    );
  }

  // 3p4. Bout of the day designation (Gap 6): high-drama matchup
  if (result.dramaticContext && (result.dramaticContext.score >= 85 || result.dramaticContext.label === "make_or_break" || result.dramaticContext.label === "grudge_match")) {
    push(
      BardEngine.resolve(preBoutRng, "pre_bout.bout_of_the_day", {
        EAST: east.shikona,
        WEST: west.shikona,
        eastRikishiId: east.id,
        westRikishiId: west.id,
      }).text,
      "pre_bout",
      ["tournament_context"]
    );
  }

  // 4. Ring entrances (east + west, two separate lines for entity linking)
  if (result.log.length > 0) {
    const entranceRng = rngFromSeed(seed, "pbp", "entrance");
    push(
      BardEngine.resolve(entranceRng, "combat.phases.ritual.entrance", {
        east: east.shikona,
        west: west.shikona,
        eastRikishiId: east.id,
        westRikishiId: west.id,
        intensity,
      }).text,
      "entrance"
    );

    // 5. Ritual salt (skipped for understated voice unless RNG passes)
    if (ctx.voiceStyle !== "understated" || rng.next() < RITUAL_SALT_CHANCE_UNDERSTATED) {
      const saltRng = rngFromSeed(seed, "pbp", "salt");
      push(
        BardEngine.resolve(saltRng, "combat.phases.ritual.salt", {
          east: east.shikona,
          west: west.shikona,
          eastRikishiId: east.id,
          westRikishiId: west.id,
          intensity,
        }).text,
        "ritual"
      );
    }

    // 6. Shikiri
    const shikiriRng = rngFromSeed(seed, "pbp", "shikiri");
    push(BardEngine.resolve(shikiriRng, "combat.phases.ritual.shikiri", {}).text, "ritual");
  }

  // 7. Process Log Frames
  // Track derived phase state to avoid spamming clinch/momentum on every tick
  let clinchEmitted = false;
  let lastMomentumTick = -10;
  let counterTacticCount = 0;

  result.log.forEach((entry: BoutLogEntry, idx: number) => {
    const tickSeed = `${seed}-tick-${(entry.data?.tick as number) || 0}-${idx}`;
    const rng = rngFromSeed(tickSeed, "pbp", "tick");

    if (entry.description) {
      push(entry.description, entry.phase as PbpPhase);
    }

    // Engagement narrative — also derives clinch, momentum, and tactical phases
    if (entry.phase === "engagement" && typeof entry.data?.family === "string") {
      const family = entry.data.family as "push" | "belt" | "speed" | "trick";
      const attacker = entry.data.attackerSide === "west" ? west : east;
      const defender = entry.data.attackerSide === "west" ? east : west;
      const differential =
        family === "belt"
          ? Math.abs((entry.data.torqueAdvantage as number) ?? 0)
          : Math.abs((entry.data.forceDiff as number) ?? 0);
      const engIntensity = BardEngine.calculateIntensity(differential, [0, 40]);
      const tick = (entry.data?.tick as number) ?? 0;

      // 7a. Engagement line
      const res = BardEngine.resolve(rng, `combat.engagement.${family}`, {
        attacker: attacker.shikona,
        defender: defender.shikona,
        intensity: engIntensity,
        attackerId: attacker.id,
        defenderId: defender.id,
      });
      push(res.text, "engagement");

      // 7a2. Stamina engagement — if late in a long bout with low intensity, mention fatigue
      if (tick > 15 && engIntensity === 1 && result.duration && result.duration > 15) {
        const staminaRng = rngFromSeed(tickSeed, "pbp", "engagement-stamina");
        if (staminaRng.next() < 0.4) {
          push(
            BardEngine.resolve(staminaRng, "combat.engagement.stamina", {
              ATTACKER: attacker.shikona,
              DEFENDER: defender.shikona,
              attackerId: attacker.id,
              defenderId: defender.id,
            }).text,
            "engagement"
          );
        }
      }

      // 7b. Clinch — emit once on first belt engagement
      if (family === "belt" && !clinchEmitted) {
        clinchEmitted = true;
        const clinchRng = rngFromSeed(tickSeed, "pbp", "clinch");
        const stance: Stance = (entry.data?.stance as Stance) ?? "belt-dominant";
        const clinchPath =
          stance === "belt-dominant"
            ? "combat.phases.clinch.belt"
            : stance === "push-dominant"
              ? "combat.phases.clinch.oshi"
              : "combat.phases.clinch.belt";
        const clinchRes = BardEngine.resolve(clinchRng, clinchPath, {
          east: east.shikona,
          west: west.shikona,
          eastRikishiId: east.id,
          westRikishiId: west.id,
          intensity,
        });
        push(clinchRes.text, "clinch");
      }

      // 7c. Momentum — emit when differential is significant (every 4+ ticks to avoid spam)
      if (differential > 25 && tick - lastMomentumTick >= 4) {
        lastMomentumTick = tick;
        const momRng = rngFromSeed(tickSeed, "pbp", "momentum");
        const attackerIsWinner =
          (entry.data.attackerSide === "east" && result.winner === "east") ||
          (entry.data.attackerSide === "west" && result.winner === "west");
        const recovery = !attackerIsWinner;
        const momPath = recovery
          ? "combat.phases.momentum.recovery"
          : "combat.phases.momentum.pressure";
        const winnerName = result.winner === "east" ? east.shikona : west.shikona;
        const loserName = result.winner === "east" ? west.shikona : east.shikona;
        const name = recovery ? loserName : winnerName;
        const nameId = recovery
          ? result.winner === "east"
            ? west.id
            : east.id
          : result.winner === "east"
            ? east.id
            : west.id;
        const momRes = BardEngine.resolve(momRng, momPath, {
          name,
          nameId,
          east: east.shikona,
          west: west.shikona,
          eastRikishiId: east.id,
          westRikishiId: west.id,
          intensity,
        });
        push(momRes.text, "momentum");
      }

      // 7d. Tactical — emit on speed (lateral) or trick family engagements
      if (family === "speed") {
        const tacRng = rngFromSeed(tickSeed, "pbp", "tactical");
        const lateralOffset = Math.abs((entry.data.lateralOffsetDiff as number) ?? 0);
        const tacPath =
          lateralOffset > 30
            ? "combat.phases.tactical.rear_take"
            : "combat.phases.tactical.lateral";
        const tacRes = BardEngine.resolve(tacRng, tacPath, {
          attacker: attacker.shikona,
          defender: defender.shikona,
          attackerId: attacker.id,
          defenderId: defender.id,
          east: east.shikona,
          west: west.shikona,
          eastRikishiId: east.id,
          westRikishiId: west.id,
        });
        push(tacRes.text, "tactical");
      } else if (family === "trick") {
        const tacRng = rngFromSeed(tickSeed, "pbp", "tactical");
        const tacRes = BardEngine.resolve(tacRng, "combat.phases.tactical.pull_attempt", {
          attacker: attacker.shikona,
          defender: defender.shikona,
          attackerId: attacker.id,
          defenderId: defender.id,
        });
        push(tacRes.text, "tactical");
      }
    }

    // Tachiai
    if (entry.phase === "tachiai") {
      if (entry.data?.event === "henka_success") {
        const attacker = entry.data.attackerSide === "west" ? west : east;
        const defender = entry.data.attackerSide === "west" ? east : west;
        const tacRes = BardEngine.resolve(rng, "combat.phases.tactical.henka", {
          attacker: attacker.shikona,
          defender: defender.shikona,
          attackerId: attacker.id,
          defenderId: defender.id,
        });
        push(tacRes.text, "tactical", ["henka"]);
      } else {
        const margin = (entry.data?.margin as number) ?? 0;
        const winnerSide = entry.data?.tachiaiWinner === "west" ? west : east;
        const loserSide = entry.data?.tachiaiWinner === "west" ? east : west;
        const res = BardEngine.resolve(rng, "combat.phases.tachiai", {
          east: east.shikona,
          west: west.shikona,
          winner: winnerSide.shikona,
          attacker: winnerSide.shikona,
          defender: loserSide.shikona,
          intensity: BardEngine.calculateIntensity(margin, [0, 30]),
          eastRikishiId: east.id,
          westRikishiId: west.id,
          winnerId: winnerSide.id,
          loserId: loserSide.id,
        });
        push(res.text, "tachiai");
      }
    }

    // Clinch (from explicit log entries — rare, kept for compatibility)
    if (entry.phase === "clinch") {
      const stance = (entry.data?.stance as Stance) ?? "no-grip";
      const path =
        stance === "belt-dominant" ? "combat.phases.clinch.belt" : "combat.phases.clinch.oshi";
      const res = BardEngine.resolve(rng, path, {
        east: east.shikona,
        west: west.shikona,
        eastRikishiId: east.id,
        westRikishiId: west.id,
        intensity,
      });
      push(res.text, "clinch");
    }

    // Momentum (from explicit log entries — rare, kept for compatibility)
    if (entry.phase === "momentum") {
      const recovery = (entry.data?.recovery as boolean) ?? false;
      const path = recovery ? "combat.phases.momentum.recovery" : "combat.phases.momentum.pressure";
      const winnerName = result.winner === "east" ? east.shikona : west.shikona;
      const loserName = result.winner === "east" ? west.shikona : east.shikona;
      const name = recovery ? loserName : winnerName;
      const nameId = recovery
        ? result.winner === "east"
          ? west.id
          : east.id
        : result.winner === "east"
          ? east.id
          : west.id;
      const res = BardEngine.resolve(rng, path, {
        name,
        nameId,
        east: east.shikona,
        west: west.shikona,
        eastRikishiId: east.id,
        westRikishiId: west.id,
        intensity,
      });
      push(res.text, "momentum");
    }

    // Fatigue snapshot (1.2): narrate fatigue levels at tick 10 and 20
    if (entry.phase === "fatigue") {
      const fatigueData = entry.data as {
        eastFatigue?: number;
        westFatigue?: number;
        fatigueDelta?: number;
      };
      const tick = (entry.data?.tick as number) ?? 0;
      const maxFatigue = Math.max(fatigueData.eastFatigue ?? 0, fatigueData.westFatigue ?? 0);
      const fatigueStage = tick >= 20 || maxFatigue > 60 ? "late" : maxFatigue > 30 ? "mid" : "early";
      push(
        BardEngine.resolve(rng, `combat.phases.fatigue.${fatigueStage}`, {
          EAST: east.shikona,
          WEST: west.shikona,
          eastRikishiId: east.id,
          westRikishiId: west.id,
        }).text,
        "fatigue" as PbpPhase
      );
    }

    // Bout injury (1.3): narrate in-bout injury events
    if (entry.phase === "bout_injury") {
      const injuryData = entry.data as {
        rikishiId?: string;
        area?: string;
        severity?: string;
      };
      const injuredRikishi = injuryData.rikishiId === east.id ? east : west;
      const severity = injuryData.severity ?? "minor";
      const area = injuryData.area ?? "leg";
      push(
        BardEngine.resolve(rng, `combat.phases.bout_injury.${severity}`, {
          NAME: injuredRikishi.shikona,
          AREA: area,
          rikishiId: injuredRikishi.id,
        }).text,
        "bout_injury" as PbpPhase
      );
    }

    // Momentum shift (1.4): narrate when dominant side flips
    if (entry.phase === "momentum_shift") {
      const shiftData = entry.data as {
        prevDominantSide?: string;
        newDominantSide?: string;
      };
      const newSide = shiftData.newDominantSide;
      const shiftPath = newSide === "east"
        ? "combat.phases.momentum_shift.east_takes_over"
        : "combat.phases.momentum_shift.west_takes_over";
      push(
        BardEngine.resolve(rng, shiftPath, {
          EAST: east.shikona,
          WEST: west.shikona,
          eastRikishiId: east.id,
          westRikishiId: west.id,
        }).text,
        "momentum_shift" as PbpPhase
      );
    }

    // Grip transition (1.1): narrate grip class shifts
    if (entry.phase === "grip_transition") {
      const gripData = entry.data as {
        type?: string;
        eastGripFrom?: string;
        eastGripTo?: string;
        westGripFrom?: string;
        westGripTo?: string;
      };
      if (gripData.type === "grip_class_shift") {
        // Determine which side had the notable transition
        const eastChanged = gripData.eastGripFrom !== gripData.eastGripTo;
        const side = eastChanged ? "east" : "west";
        const r = side === "east" ? east : west;
        const from = side === "east" ? gripData.eastGripFrom : gripData.westGripFrom;
        const to = side === "east" ? gripData.eastGripTo : gripData.westGripTo;

        let gripPath: string | null = null;
        if (to === "morozashi") gripPath = "combat.phases.grip_transition.morozashi_gained";
        else if (from === "morozashi" && to !== "morozashi") gripPath = "combat.phases.grip_transition.morozashi_lost";
        else if (to === "uwate") gripPath = "combat.phases.grip_transition.uwate_gained";
        else if (from === "uwate" && to !== "uwate" && to !== "morozashi") gripPath = "combat.phases.grip_transition.uwate_lost";

        if (gripPath) {
          push(
            BardEngine.resolve(rng, gripPath, {
              NAME: r.shikona,
              rikishiId: r.id,
            }).text,
            "grip_transition" as PbpPhase
          );
        }
      } else if (gripData.type === "depth_change") {
        // Only narrate depth changes occasionally to avoid spam
        if (rng.next() < 0.3) {
          push(
            BardEngine.resolve(rng, "combat.phases.grip_transition.depth_change", {
              NAME: east.shikona,
              rikishiId: east.id,
            }).text,
            "grip_transition" as PbpPhase
          );
        }
      }
    }

    // Bout timeout (8.5): narrate when bout goes to judges' decision
    if (entry.phase === "bout_timeout") {
      const timeoutData = entry.data as {
        eastForce?: number;
        westForce?: number;
        eastMomentum?: number;
        westMomentum?: number;
        decisionBasis?: string;
      };
      const eastAdv = (timeoutData.eastForce ?? 0) + (timeoutData.eastMomentum ?? 0);
      const westAdv = (timeoutData.westForce ?? 0) + (timeoutData.westMomentum ?? 0);
      const timeoutPath = eastAdv > westAdv
        ? "combat.phases.bout_timeout.east_advantage"
        : westAdv > eastAdv
          ? "combat.phases.bout_timeout.west_advantage"
          : "combat.phases.bout_timeout.stalemate";
      push(
        BardEngine.resolve(rng, timeoutPath, {
          EAST: east.shikona,
          WEST: west.shikona,
          eastRikishiId: east.id,
          westRikishiId: west.id,
        }).text,
        "bout_timeout"
      );
    }

    // Counter tactic — archetype counter activated during bout (Gap 2)
    // Limit to 2 narrative lines per bout
    if (entry.phase === "counter_tactic" && counterTacticCount < 2) {
      const counterData = entry.data as {
        attacker?: "east" | "west";
        defender?: "east" | "west";
        attackerFamily?: string;
        defenderFamily?: string;
      };
      const attackerSide = counterData.attacker ?? "east";
      const defenderSide = counterData.defender ?? "west";
      const attackerName = attackerSide === "east" ? east.shikona : west.shikona;
      const defenderName = defenderSide === "east" ? east.shikona : west.shikona;
      push(
        BardEngine.resolve(rng, "combat.phases.counter_tactic", {
          ATTACKER: attackerName,
          DEFENDER: defenderName,
          attackerId: attackerSide === "east" ? east.id : west.id,
          defenderId: defenderSide === "east" ? east.id : west.id,
        }).text,
        "counter_tactic",
        ["counter"]
      );
      counterTacticCount++;
    }

    // Edge crisis
    if (entry.phase === "edge_crisis") {
      const crisisData = entry.data as {
        side?: "east" | "west";
        escaped?: boolean;
        recoveryProbability?: number;
        tawaraToePosition?: number;
        forced?: boolean;
      };
      const sideName = crisisData.side === "east" ? east.shikona : west.shikona;
      const sideId = crisisData.side === "east" ? east.id : west.id;
      const toePos = crisisData.tawaraToePosition ?? 0;

      if (crisisData.escaped) {
        push(
          BardEngine.resolve(rng, "combat.phases.edge_crisis.recovery", {
            NAME: sideName,
            nameId: sideId,
          }).text,
          "edge_crisis"
        );
      } else if (
        crisisData.forced ||
        (crisisData.recoveryProbability !== undefined && crisisData.recoveryProbability < 0.2)
      ) {
        push(
          BardEngine.resolve(rng, "combat.phases.edge_crisis.failure", {
            NAME: sideName,
            nameId: sideId,
          }).text,
          "edge_crisis"
        );
      } else if (toePos > 0.6) {
        push(
          BardEngine.resolve(rng, "combat.phases.edge_crisis.tawara_drama", {
            NAME: sideName,
            nameId: sideId,
          }).text,
          "edge_crisis"
        );
      } else {
        push(
          BardEngine.resolve(rng, "combat.phases.edge_crisis.approach", {
            NAME: sideName,
            nameId: sideId,
          }).text,
          "edge_crisis"
        );
      }
    }
  });

  // 8. Finishing technique
  if (result.kimarite) {
    const finishRng = rngFromSeed(seed, "pbp", "finish");
    const winnerName = result.winner === "east" ? east.shikona : west.shikona;
    const loserName = result.winner === "east" ? west.shikona : east.shikona;
    const techPath = `combat.kimarite.${result.kimarite}`;
    const path = BardEngine.has(techPath) ? techPath : "combat.phases.finish";
    const res = BardEngine.resolve(finishRng, path, {
      winner: winnerName,
      loser: loserName,
      kimarite: result.kimariteName ?? result.kimarite,
      east: east.shikona,
      west: west.shikona,
      winnerId: result.winner === "east" ? east.id : west.id,
      loserId: result.winner === "east" ? west.id : east.id,
      eastRikishiId: east.id,
      westRikishiId: west.id,
    });
    push(res.text, "finish");
  }

  // 9. Special Awards
  if (result.awardFact === "kinboshi" || result.awardFact === "ginboshi") {
    const awardRng = rngFromSeed(seed, "pbp", "award");
    const winnerName = result.winner === "east" ? east.shikona : west.shikona;
    push(
      BardEngine.resolve(awardRng, `combat.phases.finish.${result.awardFact}`, {
        winner: winnerName,
        winnerId: result.winner === "east" ? east.id : west.id,
      }).text,
      "award",
      [result.awardFact as PbpTag]
    );
  }

  // 10. Ceremony — post-bout ritual (all voices, dramatic gets special templates)
  if (result.kimarite && result.kimarite !== "fusensho") {
    const ceremonyRng = rngFromSeed(seed, "pbp", "ceremony");
    const winnerName = result.winner === "east" ? east.shikona : west.shikona;
    const ceremonyPath =
      ctx.voiceStyle === "dramatic"
        ? "combat.phases.ceremony.dramatic"
        : "combat.phases.ceremony.common";
    push(
      BardEngine.resolve(ceremonyRng, ceremonyPath, {
        winner: winnerName,
        winnerId: result.winner === "east" ? east.id : west.id,
        east: east.shikona,
        west: west.shikona,
        eastRikishiId: east.id,
        westRikishiId: west.id,
      }).text,
      "ceremony"
    );
  }

  // 11. Closing line (dramatic voice only)
  if (ctx.voiceStyle === "dramatic") {
    const closingRng = rngFromSeed(seed, "pbp", "closing");
    const winnerName = result.winner === "east" ? east.shikona : west.shikona;
    const loserName = result.winner === "east" ? west.shikona : east.shikona;
    push(
      BardEngine.resolve(closingRng, "combat.phases.finish.dramatic", {
        winner: winnerName,
        loser: loserName,
        east: east.shikona,
        west: west.shikona,
        winnerId: result.winner === "east" ? east.id : west.id,
        loserId: result.winner === "east" ? west.id : east.id,
        eastRikishiId: east.id,
        westRikishiId: west.id,
        intensity,
      }).text,
      "closing"
    );
  }

  // ── POST-BOUT CONTEXT ─────────────────────────────────────────
  // NHK-style post-bout commentary: records, storylines, career impact, interview.

  const postBoutRng = rngFromSeed(seed, "pbp", "post-bout");

  // 12. Post-bout reaction
  push(
    BardEngine.resolve(postBoutRng, "post_bout.reaction", {
      WINNER: winnerRikishi.shikona,
      LOSER: loserRikishi.shikona,
      KIMARITE: result.kimariteName ?? result.kimarite,
      winnerId: winnerRikishi.id,
      loserId: loserRikishi.id,
    }).text,
    "post_bout",
    result.upset ? ["upset"] : []
  );

  // 12b. Post-bout records update
  const winnerWins = winnerRikishi.currentBashoWins ?? 0;
  const winnerLosses = winnerRikishi.currentBashoLosses ?? 0;
  const loserWins = loserRikishi.currentBashoWins ?? 0;
  const loserLosses = loserRikishi.currentBashoLosses ?? 0;

  push(
    BardEngine.resolve(postBoutRng, "post_bout.records.winner_improves", {
      WINNER: winnerRikishi.shikona,
      WINNER_WINS: (winnerWins + 1).toString(),
      WINNER_LOSSES: winnerLosses.toString(),
      winnerId: winnerRikishi.id,
    }).text,
    "post_bout",
    []
  );
  push(
    BardEngine.resolve(postBoutRng, "post_bout.records.loser_falls", {
      LOSER: loserRikishi.shikona,
      LOSER_WINS: loserWins.toString(),
      LOSER_LOSSES: (loserLosses + 1).toString(),
      loserId: loserRikishi.id,
    }).text,
    "post_bout",
    []
  );

  // 12c. Both even after this bout
  if (winnerWins + 1 === loserWins && winnerLosses === loserLosses + 1) {
    push(
      BardEngine.resolve(postBoutRng, "post_bout.records.both_even", {
        WINNER: winnerRikishi.shikona,
        LOSER: loserRikishi.shikona,
        WINNER_WINS: (winnerWins + 1).toString(),
        WINNER_LOSSES: winnerLosses.toString(),
        DAY: day.toString(),
        winnerId: winnerRikishi.id,
        loserId: loserRikishi.id,
      }).text,
      "post_bout",
      []
    );
  }

  // 13. Post-bout career impact (milestone reached with this win)
  for (const milestone of CAREER_WIN_MILESTONES) {
    if ((winnerRikishi.careerWins ?? 0) + 1 === milestone) {
      // Check if it's also the winner's birthday for a combo line
      const isBirthday = bashoInfo && winnerRikishi.birthMonth && winnerRikishi.birthDay &&
        winnerRikishi.birthMonth === bashoInfo.month && winnerRikishi.birthDay === day;
      if (isBirthday) {
        push(
          BardEngine.resolve(postBoutRng, "post_bout.birthday_milestone", {
            SHIKONA: winnerRikishi.shikona,
            MILESTONE: milestone.toString(),
            rikishiId: winnerRikishi.id,
          }).text,
          "post_bout",
          ["milestone", "birthday"]
        );
      } else {
        push(
          BardEngine.resolve(postBoutRng, "post_bout.career_milestone", {
            SHIKONA: winnerRikishi.shikona,
            MILESTONE: milestone.toString(),
            rikishiId: winnerRikishi.id,
          }).text,
          "post_bout",
          ["milestone"]
        );
      }
      break;
    }
  }

  // 13b. Post-bout career bout count milestone (Gap 1)
  {
    const winnerCareerBouts = (winnerRikishi.careerWins ?? 0) + (winnerRikishi.careerLosses ?? 0);
    for (const milestone of CAREER_BOUT_MILESTONES) {
      if (winnerCareerBouts + 1 === milestone) {
        push(
          BardEngine.resolve(postBoutRng, "post_bout.career_bout_milestone", {
            SHIKONA: winnerRikishi.shikona,
            MILESTONE: milestone.toString(),
            rikishiId: winnerRikishi.id,
          }).text,
          "post_bout",
          ["milestone"]
        );
        break;
      }
    }
  }

  // 14. Post-bout kachi-koshi / make-koshi confirmation
  if (isKachiKoshi(winnerWins + 1, winnerRikishi.currentBashoLosses ?? 0, winnerRikishi.rank)) {
    push(
      BardEngine.resolve(postBoutRng, "post_bout.kachi_koshi", {
        SHIKONA: winnerRikishi.shikona,
        WINS: (winnerWins + 1).toString(),
        rikishiId: winnerRikishi.id,
      }).text,
      "post_bout",
      ["kachi_koshi"]
    );

    // 14b. Consecutive kachi-koshi storyline
    const kachiStreak = winnerRikishi.consecutiveKachiKoshi ?? 0;
    if (kachiStreak >= 3) {
      const ordinals = ["", "first", "second", "third", "fourth", "fifth", "sixth", "seventh", "eighth", "ninth", "tenth"];
      const ordinal = kachiStreak < ordinals.length ? ordinals[kachiStreak] : `${kachiStreak}th`;
      push(
        BardEngine.resolve(postBoutRng, "post_bout.storylines.consecutive_kachi", {
          SHIKONA: winnerRikishi.shikona,
          STREAK: kachiStreak.toString(),
          ORDINAL: ordinal,
          rikishiId: winnerRikishi.id,
        }).text,
        "post_bout",
        ["consecutive_kachi"]
      );
    }

    // 14c. Birthday kachi-koshi — winner gets kachi-koshi on their birthday
    if (bashoInfo && winnerRikishi.birthMonth && winnerRikishi.birthDay) {
      if (winnerRikishi.birthMonth === bashoInfo.month && winnerRikishi.birthDay === day) {
        push(
          BardEngine.resolve(postBoutRng, "post_bout.birthday_kachi", {
            SHIKONA: winnerRikishi.shikona,
            rikishiId: winnerRikishi.id,
          }).text,
          "post_bout",
          ["birthday", "kachi_koshi"]
        );
      }
    }
  }
  if (isMakeKoshi(loserRikishi.currentBashoWins ?? 0, loserLosses + 1, loserRikishi.rank)) {
    push(
      BardEngine.resolve(postBoutRng, "post_bout.make_koshi", {
        SHIKONA: loserRikishi.shikona,
        LOSSES: (loserLosses + 1).toString(),
        rikishiId: loserRikishi.id,
      }).text,
      "post_bout",
      ["make_koshi"]
    );
  }

  // 15. Post-bout yusho race update
  if (result.isYushoRace) {
    push(
      BardEngine.resolve(postBoutRng, "post_bout.yusho_race", {
        WINNER: winnerRikishi.shikona,
        WINS: (winnerWins + 1).toString(),
        winnerId: winnerRikishi.id,
      }).text,
      "post_bout",
      ["yusho_race"]
    );
  }

  // 15a. Post-bout leaderboard update — sole leader, falls out, ties leader
  if (world.currentBasho && day >= 5) {
    const standings = world.currentBasho.standings;
    let maxWins = 0;
    let coLeaders = 0;
    let preBoutMaxWins = 0;
    for (const [rid, rec] of standings) {
      const preW = rid === winnerRikishi.id ? winnerWins : rid === loserRikishi.id ? loserWins : rec.wins;
      if (preW > preBoutMaxWins) preBoutMaxWins = preW;
      const w = rid === winnerRikishi.id ? winnerWins + 1 : rid === loserRikishi.id ? loserWins : rec.wins;
      if (w > maxWins) {
        maxWins = w;
        coLeaders = 1;
      } else if (w === maxWins) {
        coLeaders++;
      }
    }
    // Winner is now sole leader
    if (winnerWins + 1 === maxWins && coLeaders === 1) {
      push(
        BardEngine.resolve(postBoutRng, "post_bout.storylines.sole_leader", {
          WINNER: winnerRikishi.shikona,
          DAY: day.toString(),
          winnerId: winnerRikishi.id,
        }).text,
        "post_bout",
        ["yusho_race"]
      );
    }
    // Winner ties the leader
    if (winnerWins + 1 === maxWins && coLeaders > 1 && winnerWins + 1 > (standings.get(winnerRikishi.id)?.wins ?? 0)) {
      push(
        BardEngine.resolve(postBoutRng, "post_bout.storylines.ties_leader", {
          WINNER: winnerRikishi.shikona,
          winnerId: winnerRikishi.id,
        }).text,
        "post_bout",
        ["yusho_race"]
      );
    }
    // Loser falls out of co-leadership
    const loserPrevWins = (standings.get(loserRikishi.id)?.wins ?? loserWins);
    if (loserPrevWins === preBoutMaxWins && winnerWins + 1 > preBoutMaxWins) {
      push(
        BardEngine.resolve(postBoutRng, "post_bout.storylines.falls_out", {
          LOSER: loserRikishi.shikona,
          loserId: loserRikishi.id,
        }).text,
        "post_bout",
        ["yusho_race"]
      );
    }
  }

  // 15b. Post-bout storyline: streaks, first win, sole leader
  const winnerWinStreak = winnerRikishi.currentWinStreak ?? 0;
  const loserWinStreak = loserRikishi.currentWinStreak ?? 0;
  const loserLossStreak = loserRikishi.currentLossStreak ?? 0;
  // Winning streak continued
  if (winnerWinStreak >= 3) {
    push(
      BardEngine.resolve(postBoutRng, "post_bout.storylines.streak_continued", {
        WINNER: winnerRikishi.shikona,
        STREAK: (winnerWinStreak + 1).toString(),
        winnerId: winnerRikishi.id,
      }).text,
      "post_bout",
      ["streak"]
    );
  }
  // Losing streak snapped (loser had a winning streak before this)
  if (loserWinStreak >= 3) {
    push(
      BardEngine.resolve(postBoutRng, "post_bout.storylines.streak_snapped", {
        WINNER: winnerRikishi.shikona,
        LOSER: loserRikishi.shikona,
        STREAK: loserWinStreak.toString(),
        winnerId: winnerRikishi.id,
        loserId: loserRikishi.id,
      }).text,
      "post_bout",
      ["streak"]
    );
  }
  // Losing streak continued
  if (loserLossStreak + 1 >= 3 && loserWins === 0) {
    push(
      BardEngine.resolve(postBoutRng, "post_bout.storylines.loss_streak", {
        LOSER: loserRikishi.shikona,
        STREAK: (loserLossStreak + 1).toString(),
        loserId: loserRikishi.id,
      }).text,
      "post_bout",
      ["winless"]
    );
  }
  // First win
  if (winnerWins === 0 && day >= FIRST_WIN_MENTION_MIN_DAY) {
    push(
      BardEngine.resolve(postBoutRng, "post_bout.storylines.first_win", {
        WINNER: winnerRikishi.shikona,
        winnerId: winnerRikishi.id,
      }).text,
      "post_bout",
      ["first_win"]
    );
  }

  // 15c. Post-bout upset over elite — maegashira beats yokozuna/ozeki
  if (result.upset && result.isKinboshi) {
    push(
      BardEngine.resolve(postBoutRng, "post_bout.storylines.upset_elite", {
        WINNER: winnerRikishi.shikona,
        LOSER: loserRikishi.shikona,
        LOSER_RANK: loserRikishi.rank ?? "",
        DAY: day.toString(),
        winnerId: winnerRikishi.id,
        loserId: loserRikishi.id,
      }).text,
      "post_bout",
      ["upset"]
    );
  }

  // 15c2. Comeback win narrative (Gap 5): winner escaped edge crisis during bout
  const winnerHadEdgeCrisisEscape = result.log.some(
    (entry) => entry.phase === "edge_crisis" && entry.data?.escaped === true && entry.data?.side === result.winner
  );
  if (winnerHadEdgeCrisisEscape) {
    push(
      BardEngine.resolve(postBoutRng, "post_bout.comeback_win", {
        WINNER: winnerRikishi.shikona,
        LOSER: loserRikishi.shikona,
        winnerId: winnerRikishi.id,
        loserId: loserRikishi.id,
      }).text,
      "post_bout",
      ["comeback"]
    );
  }

  // 15d. Post-bout rivalry result (7.2): narrative about series implications
  if (pair && pair.meetings >= 1) {
    const aIsEast = pair.aId === east.id;
    const eastWinsBefore = aIsEast ? pair.aWins : pair.bWins;
    const westWinsBefore = aIsEast ? pair.bWins : pair.aWins;
    const winnerIsEast = result.winner === "east";
    const newEastWins = eastWinsBefore + (winnerIsEast ? 1 : 0);
    const newWestWins = westWinsBefore + (winnerIsEast ? 0 : 1);
    const totalAfter = newEastWins + newWestWins;

    if (totalAfter >= 2) {
      const winnerShikona = winnerIsEast ? east.shikona : west.shikona;
      const loserShikona = winnerIsEast ? west.shikona : east.shikona;
      const winnerNewWins = winnerIsEast ? newEastWins : newWestWins;
      const loserNewWins = winnerIsEast ? newWestWins : newEastWins;
      const diff = Math.abs(newEastWins - newWestWins);

      let rivalryPath: string;
      if (diff >= 3) {
        rivalryPath = "post_bout.rivalry.domination";
      } else if (winnerNewWins === loserNewWins) {
        rivalryPath = "post_bout.rivalry.evened";
      } else if (loserNewWins > 0 && winnerNewWins === loserNewWins + 1 && loserNewWins >= 1) {
        rivalryPath = "post_bout.rivalry.revenge";
      } else {
        rivalryPath = "post_bout.rivalry.continued";
      }

      push(
        BardEngine.resolve(postBoutRng, rivalryPath, {
          WINNER: winnerShikona,
          LOSER: loserShikona,
          WINNER_WINS: winnerNewWins.toString(),
          LOSER_WINS: loserNewWins.toString(),
          TOTAL: totalAfter.toString(),
          winnerId: winnerRikishi.id,
          loserId: loserRikishi.id,
        }).text,
        "post_bout",
        ["rivalry"]
      );
    }
  }

  // 15e. Kensho & economic context (7.3): mention sponsor envelopes when awarded
  if (result.kenshoEnvelopes > 0) {
    const kenshoPath = result.upset ? "post_bout.kensho_upset" : "post_bout.kensho";
    push(
      BardEngine.resolve(postBoutRng, kenshoPath, {
        WINNER: winnerRikishi.shikona,
        ENVELOPES: result.kenshoEnvelopes.toString(),
        winnerId: winnerRikishi.id,
      }).text,
      "post_bout",
      ["kensho"]
    );
  }

  // 15f. Age-based decline narrative (6.4): father time / defying age
  {
    const loserDecline = loserRikishi.declinePhase;
    const winnerDecline = winnerRikishi.declinePhase;

    // Father time: loser is in decline phase
    if (loserDecline === "early-decline" || loserDecline === "late-decline" || loserDecline === "twilight") {
      push(
        BardEngine.resolve(postBoutRng, "post_bout.father_time", {
          LOSER: loserRikishi.shikona,
          loserId: loserRikishi.id,
        }).text,
        "post_bout",
        ["veteran"]
      );
    }

    // Defying age: winner is in late-decline or twilight
    if (winnerDecline === "late-decline" || winnerDecline === "twilight") {
      push(
        BardEngine.resolve(postBoutRng, "post_bout.defying_age", {
          WINNER: winnerRikishi.shikona,
          winnerId: winnerRikishi.id,
        }).text,
        "post_bout",
        ["veteran"]
      );
    }
  }

  // 15g. Post-bout injury assessment (6.3)
  if (result.inBoutInjury) {
    const injuredRikishi = result.inBoutInjury.rikishiId === east.id ? east : west;
    const severity = result.inBoutInjury.severity;
    const area = String(result.inBoutInjury.area);
    if (BardEngine.has(`post_bout.injury_assessment.${severity}`)) {
      push(
        BardEngine.resolve(postBoutRng, `post_bout.injury_assessment.${severity}`, {
          SHIKONA: injuredRikishi.shikona,
          AREA: area,
          SEVERITY: severity,
          rikishiId: injuredRikishi.id,
        }).text,
        "post_bout",
        ["injury"]
      );
    }

    // 15g-2. Injury-to-kyujo warning narrative thread (Gap 8)
    // When in-bout injury is moderate or worse, warn about potential kyujo
    if (severity === "moderate" || severity === "serious") {
      push(
        BardEngine.resolve(postBoutRng, "post_bout.injury_kyujo_warning", {
          SHIKONA: injuredRikishi.shikona,
          AREA: area,
          rikishiId: injuredRikishi.id,
        }).text,
        "post_bout",
        ["injury"]
      );
    }
  }

  // 15h. Momentum score narrative (Gap 7)
  // Highlight dominant momentum when the score exceeds the threshold
  if (Math.abs(result.momentumScore) >= MOMENTUM_NARRATIVE_THRESHOLD) {
    const dominantSide = result.momentumScore > 0 ? "east" : "west";
    const dominantRikishi = dominantSide === "east" ? east : west;
    const losingRikishi = dominantSide === "east" ? west : east;
    push(
      BardEngine.resolve(postBoutRng, "post_bout.momentum_shift", {
        DOMINANT: dominantRikishi.shikona,
        LOSER: losingRikishi.shikona,
        dominantId: dominantRikishi.id,
        loserId: losingRikishi.id,
      }).text,
      "post_bout",
      ["momentum_shift"]
    );
  }

  // 16. Mono-ii (judge consultation) — expanded sub-paths
  if (result.monoii) {
    const monoiiRng = rngFromSeed(seed, "pbp", "mono-ii");
    // Initial gunbai call — contested
    push(
      BardEngine.resolve(monoiiRng, "post_bout.mono_ii.gunbai_contested", {
        WINNER: winnerRikishi.shikona,
        LOSER: loserRikishi.shikona,
        winnerId: winnerRikishi.id,
        loserId: loserRikishi.id,
      }).text,
      "mono_ii",
      ["drama", "mono_ii"]
    );
    // Gyoji confusion (flavor, 40% chance)
    if (monoiiRng.next() < 0.4) {
      push(
        BardEngine.resolve(monoiiRng, "post_bout.mono_ii.gyoji_confused", {
          WINNER: winnerRikishi.shikona,
          LOSER: loserRikishi.shikona,
          winnerId: winnerRikishi.id,
          loserId: loserRikishi.id,
        }).text,
        "mono_ii",
        ["drama", "mono_ii"]
      );
    }
    // Judges convene
    push(
      BardEngine.resolve(monoiiRng, "post_bout.mono_ii.review", {
        WINNER: winnerRikishi.shikona,
        LOSER: loserRikishi.shikona,
        winnerId: winnerRikishi.id,
        loserId: loserRikishi.id,
      }).text,
      "mono_ii",
      ["drama", "mono_ii"]
    );
    // Replay analysis
    push(
      BardEngine.resolve(monoiiRng, "post_bout.mono_ii.replay_analysis", {
        WINNER: winnerRikishi.shikona,
        LOSER: loserRikishi.shikona,
        winnerId: winnerRikishi.id,
        loserId: loserRikishi.id,
      }).text,
      "mono_ii",
      ["drama", "mono_ii"]
    );
    // Outcome: reversed (with possible rematch), or upheld
    const outcomeRoll = monoiiRng.next();
    if (outcomeRoll < 0.25) {
      // Call reversed — judges determine the loser actually touched first
      push(
        BardEngine.resolve(monoiiRng, "post_bout.mono_ii.call_reversed", {
          WINNER: winnerRikishi.shikona,
          LOSER: loserRikishi.shikona,
          winnerId: winnerRikishi.id,
          loserId: loserRikishi.id,
        }).text,
        "mono_ii",
        ["drama"]
      );
    } else if (outcomeRoll < 0.35) {
      // Too close to call — rematch ordered
      push(
        BardEngine.resolve(monoiiRng, "post_bout.mono_ii.rematch_ordered", {
          WINNER: winnerRikishi.shikona,
          LOSER: loserRikishi.shikona,
          winnerId: winnerRikishi.id,
          loserId: loserRikishi.id,
        }).text,
        "mono_ii",
        ["drama"]
      );
    } else {
      // Call upheld — original decision stands
      push(
        BardEngine.resolve(monoiiRng, "post_bout.mono_ii.call_upheld", {
          WINNER: winnerRikishi.shikona,
          LOSER: loserRikishi.shikona,
          winnerId: winnerRikishi.id,
          loserId: loserRikishi.id,
        }).text,
        "mono_ii",
        ["drama"]
      );
    }
  }

  // 17. Replay highlight — expanded sub-paths
  if (result.excitementScore !== undefined && result.excitementScore > 30) {
    const replayRng = rngFromSeed(seed, "pbp", "replay");
    // Select replay sub-path based on bout characteristics
    let replayPath = "post_bout.replay.generic";
    const hasEdgeCrisis = result.log.some(e => e.phase === "edge_crisis");
    const hasHenka = result.log.some(e => e.data?.event === "henka_success");
    const isQuickFinish = result.log.length <= 3;
    const isDominant = (result.excitementScore ?? 50) < 60;

    if (hasHenka) {
      replayPath = "post_bout.replay.reversal";
    } else if (hasEdgeCrisis) {
      replayPath = "post_bout.replay.edge_drama";
    } else if (isQuickFinish) {
      replayPath = "post_bout.replay.quick_finish";
    } else if (isDominant) {
      replayPath = "post_bout.replay.control";
    } else if (result.duration && result.duration > 20) {
      // Long bouts often involve stamina issues for the loser
      replayPath = "post_bout.replay.stamina_issue";
    } else if (Math.abs(east.weight - west.weight) >= WEIGHT_DIFF_THRESHOLD) {
      replayPath = "post_bout.replay.size_overcame";
    } else {
      // Pick from a few common replay types
      const replayTypes = ["tachiai_decisive", "grip_battle", "counter", "generic"];
      const idx = Math.floor(replayRng.next() * replayTypes.length);
      replayPath = `post_bout.replay.${replayTypes[idx]}`;
    }
    push(
      BardEngine.resolve(replayRng, replayPath, {
        WINNER: winnerRikishi.shikona,
        LOSER: loserRikishi.shikona,
        KIMARITE: result.kimariteName ?? result.kimarite,
        winnerId: winnerRikishi.id,
        loserId: loserRikishi.id,
      }).text,
      "replay",
      ["drama"]
    );
  }

  // 18. Post-bout interview (personality-driven, multi-question, RNG-gated)
  {
    const interviewRng = rngFromSeed(seed, "pbp", "interview-gate");
    if (interviewRng.next() < INTERVIEW_CHANCE) {
    const persona = winnerRikishi.pressPersona ?? "neutral";
    const personaPath = `interview.${persona}`;
    const hasPersonaTemplate = BardEngine.has(personaPath);
    const interviewPath = hasPersonaTemplate ? personaPath : "interview.neutral";

    // Determine interview question type
    let questionType = "general_win";
    const makuuchiTournaments = countMakuuchiTournaments(winnerRikishi.careerHistory);
    // Check for career milestone hit with this win
    const hitMilestone = CAREER_WIN_MILESTONES.includes((winnerRikishi.careerWins ?? 0) + 1);
    const loserLossesAfter = (loserRikishi.currentBashoLosses ?? 0) + 1;
    const loserWinsAfter = loserRikishi.currentBashoWins ?? 0;
    if (isKachiKoshi(winnerWins + 1, winnerRikishi.currentBashoLosses ?? 0, winnerRikishi.rank)) {
      // Earliest kachi-koshi variant — achieved on day 7 or earlier with some career history
      if (day <= 7 && makuuchiTournaments >= 2) {
        questionType = "earliest_kachi";
      } else {
        questionType = "kachi_koshi";
      }
    } else if (hitMilestone) {
      questionType = "milestone";
    } else if (isMakeKoshi(loserWinsAfter, loserLossesAfter, loserRikishi.rank)) {
      questionType = "make_koshi";
    } else if (winnerWins === 0 && day >= FIRST_WIN_MENTION_MIN_DAY) {
      questionType = "first_win";
    } else if (makuuchiTournaments <= 1 && winnerRikishi.rank !== "yokozuna" && winnerRikishi.rank !== "ozeki") {
      questionType = "debut_win";
    } else if (result.upset) {
      questionType = "upset";
    } else if (loserLossesAfter >= 8) {
      // Loser confirmed make-koshi but didn't trigger the specific make_koshi type above
      questionType = "general_loss";
    }

    // Career phase question (6.1): use declinePhase for phase-specific question
    const careerPhaseMap: Record<string, string> = {
      "pre-peak": "career_pre_peak",
      "peak": "career_peak",
      "early-decline": "career_early_decline",
      "late-decline": "career_late_decline",
      "twilight": "career_twilight",
    };
    const careerPhaseQuestion = careerPhaseMap[ctx.careerPhase];
    const careerPhaseQuestionPath = `interview.questions.${careerPhaseQuestion}`;
    const hasCareerPhaseQuestion = careerPhaseQuestion
      ? BardEngine.has(careerPhaseQuestionPath)
      : false;
    const questionPath = `interview.questions.${questionType}`;
    const hasQuestionTemplate = BardEngine.has(questionPath);
    const numQuestions = ctx.voiceStyle === "dramatic" ? 4 : 3;

    for (let q = 0; q < numQuestions; q++) {
      const qRng = rngFromSeed(seed, "pbp", `interview-q${q}`);
      // Question
      if (hasQuestionTemplate) {
        push(
          BardEngine.resolve(qRng, questionPath, {
            SHIKONA: winnerRikishi.shikona,
            KIMARITE: result.kimariteName ?? result.kimarite,
            OPPONENT: loserRikishi.shikona,
            OPPONENT_RANK: loserRikishi.rank ?? "",
            MILESTONE: ((winnerRikishi.careerWins ?? 0) + 1).toString(),
            WINS: (winnerWins + 1).toString(),
            DAY: day.toString(),
            rikishiId: winnerRikishi.id,
          }).text,
          "interview",
          ["interview"]
        );
      }
      // Answer (persona-driven)
      push(
        BardEngine.resolve(qRng, interviewPath, {
          SHIKONA: winnerRikishi.shikona,
          KIMARITE: result.kimariteName ?? result.kimarite,
          OPPONENT: loserRikishi.shikona,
          WINS: (winnerWins + 1).toString(),
          rikishiId: winnerRikishi.id,
        }).text,
        "interview",
        ["interview"]
      );

      // Trait modifier (probabilistic)
      if (winnerRikishi.personalityTraits && winnerRikishi.personalityTraits.length > 0) {
        if (qRng.next() < TRAIT_MODIFIER_CHANCE) {
          const trait = winnerRikishi.personalityTraits[qRng.int(0, winnerRikishi.personalityTraits.length - 1)];
          const modifierPath = `interview.modifiers.${trait}`;
          if (BardEngine.has(modifierPath)) {
            push(
              BardEngine.resolve(qRng, modifierPath, {
                SHIKONA: winnerRikishi.shikona,
                OPPONENT: loserRikishi.shikona,
                rikishiId: winnerRikishi.id,
              }).text,
              "interview",
              ["interview"]
            );
          }
        }
      }

      // Behavior stat modifiers — stress makes answers terse, mediaSavvy makes them polished
      // These are handled by selecting shorter/longer variants via RNG biasing
      const stressLevel = winnerRikishi.behavior?.stress ?? 0;
      const mediaSavvyLevel = winnerRikishi.behavior?.mediaSavvy ?? 0;
      if (stressLevel >= STRESS_TERSE_THRESHOLD && qRng.next() < 0.5) {
        const tersePath = "interview.modifiers.laconic";
        if (BardEngine.has(tersePath)) {
          push(
            BardEngine.resolve(qRng, tersePath, {
              SHIKONA: winnerRikishi.shikona,
              OPPONENT: loserRikishi.shikona,
              rikishiId: winnerRikishi.id,
            }).text,
            "interview",
            ["interview"]
          );
        }
      } else if (mediaSavvyLevel >= MEDIA_SAVVY_POLISHED_THRESHOLD && qRng.next() < 0.4) {
        // Media-savvy rikishi add a polished follow-up
        const polishedPath = "interview.modifiers.philosophical";
        if (BardEngine.has(polishedPath)) {
          push(
            BardEngine.resolve(qRng, polishedPath, {
              SHIKONA: winnerRikishi.shikona,
              OPPONENT: loserRikishi.shikona,
              rikishiId: winnerRikishi.id,
            }).text,
            "interview",
            ["interview"]
          );
        }
      }
    }

    // Career phase question (6.1): add a phase-specific question after standard questions
    if (hasCareerPhaseQuestion) {
      const cpRng = rngFromSeed(seed, "pbp", "interview-career-phase");
      push(
        BardEngine.resolve(cpRng, careerPhaseQuestionPath, {
          SHIKONA: winnerRikishi.shikona,
          KIMARITE: result.kimariteName ?? result.kimarite,
          OPPONENT: loserRikishi.shikona,
          WINS: (winnerWins + 1).toString(),
          rikishiId: winnerRikishi.id,
        }).text,
        "interview",
        ["interview", "career_phase"]
      );
      push(
        BardEngine.resolve(cpRng, interviewPath, {
          SHIKONA: winnerRikishi.shikona,
          KIMARITE: result.kimariteName ?? result.kimarite,
          OPPONENT: loserRikishi.shikona,
          WINS: (winnerWins + 1).toString(),
          rikishiId: winnerRikishi.id,
        }).text,
        "interview",
        ["interview", "career_phase"]
      );
    }

    // Rivalry question (7.2): add a rivalry-specific question when meetings >= 3
    if (pair && pair.meetings >= 3) {
      const rvRng = rngFromSeed(seed, "pbp", "interview-rivalry");
      push(
        BardEngine.resolve(rvRng, "interview.questions.rivalry_renewed", {
          SHIKONA: winnerRikishi.shikona,
          OPPONENT: loserRikishi.shikona,
          rikishiId: winnerRikishi.id,
        }).text,
        "interview",
        ["interview", "rivalry"]
      );
      push(
        BardEngine.resolve(rvRng, interviewPath, {
          SHIKONA: winnerRikishi.shikona,
          KIMARITE: result.kimariteName ?? result.kimarite,
          OPPONENT: loserRikishi.shikona,
          WINS: (winnerWins + 1).toString(),
          rikishiId: winnerRikishi.id,
        }).text,
        "interview",
        ["interview", "rivalry"]
      );
    }
    } // end INTERVIEW_CHANCE gate
  }

  result.pbpLines = lines.length > 0 ? lines : undefined;
}

/**
 * Generate narrative lines for kyujo (withdrawal) events.
 * Used by HealthActions.withdrawRikishi and LoopDecisionEngine for withdrawal decisions.
 */
export function generateKyujoNarrative(
  rikishi: Rikishi,
  type: "injury_withdrawal" | "pre_basho_withdrawal" | "return_from_kyujo",
  context: { area?: string; day?: number; reason?: string; bashosMissed?: number },
  seed: string
): PbpLine[] {
  const rng = rngFromSeed(seed, "kyujo", type);
  const lines: PbpLine[] = [];

  const path = `kyujo.${type}`;
  if (!BardEngine.has(path)) return lines;

  const res = BardEngine.resolve(rng, path, {
    SHIKONA: rikishi.shikona,
    AREA: context.area ?? "leg",
    DAY: (context.day ?? 1).toString(),
    REASON: context.reason ?? "injury",
    BASHOS_MISSED: (context.bashosMissed ?? 1).toString(),
    rikishiId: rikishi.id,
  });

  if (res.text && !res.text.includes("[MISSING:")) {
    lines.push({
      text: res.text,
      id: `kyujo-${rikishi.id}-${type}-${lines.length}`,
      phase: "kyujo",
      tags: ["injury"],
    });
  }

  return lines;
}

import { NOTABLE_NARRATIVE_TAGS, NOTABLE_NARRATIVE_PHASES } from "../almanac/types";

export function extractNotableNarrativeLines(lines: PbpLine[]): string[] {
  const tagSet = new Set<string>(NOTABLE_NARRATIVE_TAGS);
  const phaseSet = new Set<string>(NOTABLE_NARRATIVE_PHASES);
  const result: string[] = [];
  for (const line of lines) {
    const hasTag = line.tags?.some((t) => tagSet.has(t));
    const hasPhase = line.phase != null && phaseSet.has(line.phase);
    if (hasTag || hasPhase) {
      result.push(line.text);
    }
  }
  return result;
}

export function isNotableBout(
  result: BoutResult,
  lines: PbpLine[],
  winnerCareerWins: number
): boolean {
  if (result.isKinboshi === true) return true;
  if (result.isYushoRace === true) return true;
  if (result.upset === true) return true;
  if (lines.some((l) => l.tags?.includes("milestone") || l.tags?.includes("career_high")))
    return true;
  if (result.excitementScore != null && result.excitementScore > 30) return true;
  if (CAREER_WIN_MILESTONES.includes(winnerCareerWins + 1)) return true;
  return false;
}
