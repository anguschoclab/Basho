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
  SENSURAKU_DAY,
  WINLESS_MENTION_MIN_DAY,
  FIRST_WIN_MENTION_MIN_DAY,
  LEADERBOARD_MIN_LEADER_WINS,
} from "../../constants/engine/generation";
import { BASHO_CALENDAR } from "../calendar";
import { isKachiKoshi, isMakeKoshi } from "../banzuke/banzukeHelpers";

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
  | "edge_crisis"
  | "finish"
  | "post_bout"
  | "replay"
  | "interview"
  | "mono_ii"
  | "award"
  | "ceremony"
  | "closing";

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
  | "consecutive_kachi"
  | "title_stakes"
  | "senshuraku"
  | "tournament_context";

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
      ["rivalry"]
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
        ["rivalry"]
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
        ["rivalry"]
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
  // NHK-style pre-bout commentary: storylines, physical comparisons, H2H streaks,
  // injury mentions, career milestones, hometown angles, age narratives, kadoban.

  const preBoutRng = rngFromSeed(seed, "pbp", "pre-bout");
  const winnerRikishi = result.winner === "east" ? east : west;
  const loserRikishi = result.winner === "east" ? west : east;

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

  // 3d. Injury mention (probabilistic)
  if (east.injured || west.injured) {
    const injuredRikishi = east.injured ? east : west;
    if (preBoutRng.next() < INJURY_MENTION_CHANCE) {
      push(
        BardEngine.resolve(preBoutRng, "pre_bout.injury", {
          SHIKONA: injuredRikishi.shikona,
          rikishiId: injuredRikishi.id,
        }).text,
        "pre_bout",
        ["injury"]
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
      []
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
      [...olderTags, ...youngerTags]
    );
  }

  // 3h. Career win milestone check
  for (const milestone of CAREER_WIN_MILESTONES) {
    if (winnerRikishi.careerWins === milestone) {
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

  // 3l. Birthday mention
  if (bashoInfo) {
    for (const r of [east, west]) {
      if (r.birthMonth && r.birthDay && r.birthMonth === bashoInfo.month) {
        push(
          BardEngine.resolve(preBoutRng, "pre_bout.birthday", {
            SHIKONA: r.shikona,
            rikishiId: r.id,
          }).text,
          "pre_bout",
          ["birthday"]
        );
      }
    }
  }

  // 3m. Winless / first win callout
  const eastWins = east.currentBashoWins ?? 0;
  const westWins = west.currentBashoWins ?? 0;
  const eastLosses = east.currentBashoLosses ?? 0;
  const westLosses = west.currentBashoLosses ?? 0;
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
  if (day === SENSURAKU_DAY) {
    push(
      BardEngine.resolve(preBoutRng, "pre_bout.senshuraku", {
        eastRikishiId: east.id,
        westRikishiId: west.id,
      }).text,
      "pre_bout",
      ["senshuraku", "tournament_context"]
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

  // 3p. Leaderboard summary (early days only, when leader has enough wins)
  if (day <= 5 && world.currentBasho) {
    const standings = world.currentBasho.standings;
    let leaderWins = 0;
    let leaderShikona = "";
    for (const [rid, rec] of standings) {
      if (rec.wins > leaderWins) {
        leaderWins = rec.wins;
        const leaderRikishi = world.rikishi.get(rid);
        leaderShikona = leaderRikishi?.shikona ?? "";
      }
    }
    if (leaderWins >= LEADERBOARD_MIN_LEADER_WINS && leaderShikona) {
      push(
        BardEngine.resolve(preBoutRng, "pre_bout.leaderboard", {
          SHIKONA: leaderShikona,
          WINS: leaderWins.toString(),
        }).text,
        "pre_bout",
        ["tournament_context"]
      );
    }
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
  // NHK-style post-bout commentary: result reaction, career impact, interview.

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

  // 13. Post-bout career impact (milestone reached with this win)
  for (const milestone of CAREER_WIN_MILESTONES) {
    if (winnerRikishi.careerWins === milestone) {
      push(
        BardEngine.resolve(postBoutRng, "post_bout.career_milestone", {
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

  // 14. Post-bout kachi-koshi / make-koshi confirmation
  const winnerWins = winnerRikishi.currentBashoWins ?? 0;
  const loserLosses = loserRikishi.currentBashoLosses ?? 0;
  if (isKachiKoshi(winnerWins, winnerRikishi.currentBashoLosses ?? 0, winnerRikishi.rank)) {
    push(
      BardEngine.resolve(postBoutRng, "post_bout.kachi_koshi", {
        SHIKONA: winnerRikishi.shikona,
        WINS: winnerWins.toString(),
        rikishiId: winnerRikishi.id,
      }).text,
      "post_bout",
      ["career_high"]
    );
  }
  if (isMakeKoshi(loserRikishi.currentBashoWins ?? 0, loserLosses, loserRikishi.rank)) {
    push(
      BardEngine.resolve(postBoutRng, "post_bout.make_koshi", {
        SHIKONA: loserRikishi.shikona,
        LOSSES: loserLosses.toString(),
        rikishiId: loserRikishi.id,
      }).text,
      "post_bout",
      []
    );
  }

  // 15. Post-bout yusho race update
  if (result.isYushoRace) {
    push(
      BardEngine.resolve(postBoutRng, "post_bout.yusho_race", {
        WINNER: winnerRikishi.shikona,
        WINS: winnerWins.toString(),
        winnerId: winnerRikishi.id,
      }).text,
      "post_bout",
      ["yusho_race"]
    );
  }

  // 16. Mono-ii (judge consultation) — stub for close/controversial bouts
  if (result.monoii) {
    push(
      BardEngine.resolve(postBoutRng, "post_bout.mono_ii", {
        eastRikishiId: east.id,
        westRikishiId: west.id,
      }).text,
      "mono_ii",
      ["drama"]
    );
  }

  // 17. Replay highlight (for dramatic bouts)
  if (ctx.voiceStyle === "dramatic" && result.excitementScore && result.excitementScore > 50) {
    push(
      BardEngine.resolve(postBoutRng, "post_bout.replay", {
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

  // 18. Post-bout interview (personality-driven)
  {
    const interviewRng = rngFromSeed(seed, "pbp", "interview");
    const persona = winnerRikishi.pressPersona ?? "neutral";
    const personaPath = `interview.${persona}`;
    const hasPersonaTemplate = BardEngine.has(personaPath);
    const interviewPath = hasPersonaTemplate ? personaPath : "interview.neutral";
    push(
      BardEngine.resolve(interviewRng, interviewPath, {
        SHIKONA: winnerRikishi.shikona,
        KIMARITE: result.kimariteName ?? result.kimarite,
        OPPONENT: loserRikishi.shikona,
        WINS: winnerWins.toString(),
        rikishiId: winnerRikishi.id,
      }).text,
      "interview",
      []
    );
  }

  result.pbpLines = lines.length > 0 ? lines : undefined;
}
