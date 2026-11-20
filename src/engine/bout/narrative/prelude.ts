/**
 * bout/narrative/prelude.ts — extracted beats from generateBoutNarrative.
 * Code moved verbatim; dependencies arrive via the shared PbpPipeline.
 */
import type { PbpPipeline } from "@/engine/bout/narrative/pipeline";
import type { PbpTag } from "@/engine/bout/narrative/pbpTypes";
import { BardEngine } from "@/engine/bard/BardEngine";
import { rngFromSeed } from "@/engine/core/rng";
import { BloodlineService } from "@/engine/legacy/BloodlineService";
import {
  H2H_RECENT_MIN_SAMPLE,
  H2H_RECENT_SURGE_MIN_TOTAL,
  H2H_RECENT_WINDOW,
} from "@/constants/engine/narrative";
import { getRankDisplayEntry, isYokozunaOrOzekiRank } from "@/constants/engine/rankDisplay";

function beatOpeningVenue(p: PbpPipeline): void {
  const { ctx, day, east, intensity, push, seed, west } = p;
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
}

function beatDynasty(p: PbpPipeline): void {
  const { east, push, seed, west, world } = p;
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
}

function beatDramaOpening(p: PbpPipeline): void {
  const { east, push, result, seed, west } = p;
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
}

function beatRivalryContext(p: PbpPipeline): void {
  const { east, isGrudgeMatch, pair, push, seed, west } = p;
  // 3a. Rivalry context (h2h history)
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
    const total = pair.meetings;
    const eastWins = aIsEast ? pair.aWins : pair.bWins;
    const westWins = aIsEast ? pair.bWins : pair.aWins;
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
    if (
      east.careerWins !== undefined &&
      west.careerWins !== undefined &&
      east.careerWins === west.careerWins
    ) {
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

    // Cohort reunion: both rikishi from same recruitment cohort
    if (east.recruitmentCohortId && east.recruitmentCohortId === west.recruitmentCohortId) {
      const bothSekitori =
        (east.division === "juryo" || east.division === "makuuchi") &&
        (west.division === "juryo" || west.division === "makuuchi");
      const cohortPath = bothSekitori ? "h2h.cohort_reunion" : "h2h.junior_high_rivals";
      if (BardEngine.has(cohortPath)) {
        push(
          BardEngine.resolve(h2hRng, cohortPath, {
            P1: east.shikona,
            P2: west.shikona,
            eastRikishiId: east.id,
            westRikishiId: west.id,
          }).text,
          "opening",
          ["debut"]
        );
      }
    }
  }
}

function beatStreakCallout(p: PbpPipeline): void {
  const { east, push, seed, west } = p;
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
}

function beatGiantKillerH2H(p: PbpPipeline): void {
  const { east, pair, push, seed, west } = p;
  if (!pair || pair.meetings < 2) return;
  const aIsEast = pair.aId === east.id;
  const eastWins = aIsEast ? pair.aWins : pair.bWins;
  const westWins = aIsEast ? pair.bWins : pair.aWins;

  const eastIsMaegashira = east.rank === "maegashira";
  const westIsMaegashira = west.rank === "maegashira";
  const eastIsElite = isYokozunaOrOzekiRank(east.rank);
  const westIsElite = isYokozunaOrOzekiRank(west.rank);

  const eastLead = eastIsMaegashira && westIsElite && eastWins > westWins && eastWins >= 2;
  const westLead = westIsMaegashira && eastIsElite && westWins > eastWins && westWins >= 2;
  if (!eastLead && !westLead) return;

  const underdog = eastLead ? east : west;
  const elite = eastLead ? west : east;
  const underdogWins = eastLead ? eastWins : westWins;
  const eliteWins = eastLead ? westWins : eastWins;
  const gkRng = rngFromSeed(seed, "pbp", "h2h-giant-killer");
  push(
    BardEngine.resolve(gkRng, "pre_bout.giant_killer_h2h", {
      UNDERDOG: underdog.shikona,
      ELITE: elite.shikona,
      ELITE_RANK: getRankDisplayEntry(elite.rank ?? "")?.en ?? elite.rank ?? "",
      UNDERDOG_WINS: underdogWins.toString(),
      ELITE_WINS: eliteWins.toString(),
      underdogId: underdog.id,
      eliteId: elite.id,
    }).text,
    "opening",
    ["rivalry", "upset"]
  );
}

function beatH2HRecentSurge(p: PbpPipeline): void {
  const { east, pair, push, seed, west } = p;
  if (!pair || pair.meetings < H2H_RECENT_SURGE_MIN_TOTAL) return;
  const aIsEast = pair.aId === east.id;
  const eastWins = aIsEast ? pair.aWins : pair.bWins;
  const westWins = aIsEast ? pair.bWins : pair.aWins;
  if (eastWins === westWins) return;

  const leaderIsEast = eastWins > westWins;
  const careerLeader = leaderIsEast ? east : west;
  const surger = leaderIsEast ? west : east;
  const leaderWins = leaderIsEast ? eastWins : westWins;
  const surgerWins = leaderIsEast ? westWins : eastWins;

  const mutual = (east.history ?? []).filter((h) => h.opponentId === west.id);
  const recent = mutual.slice(-H2H_RECENT_WINDOW);
  if (recent.length < H2H_RECENT_MIN_SAMPLE) return;

  const recentSurgerWins = recent.filter((h) => (surger === east ? h.win : !h.win)).length;
  if (recentSurgerWins < recent.length - 1) return;

  const surgeRng = rngFromSeed(seed, "pbp", "h2h-recent-surge");
  push(
    BardEngine.resolve(surgeRng, "pre_bout.h2h_recent_surge", {
      CAREER_LEADER: careerLeader.shikona,
      SURGER: surger.shikona,
      LEADER_WINS: leaderWins.toString(),
      SURGER_WINS: surgerWins.toString(),
      RECENT_WINS: recentSurgerWins.toString(),
      RECENT_TOTAL: recent.length.toString(),
      leaderId: careerLeader.id,
      surgerId: surger.id,
    }).text,
    "opening",
    ["rivalry"]
  );
}

function beatPlayoffRematch(p: PbpPipeline): void {
  const { east, push, seed, west } = p;
  // W P — "playoff clashes in January and July": a title-deciding bout is
  // already on the ledger between these two, recorded as a playoff_win
  // career highlight at PlayoffResolver time.
  const metPlayoff = (a: PbpPipeline["east"], b: PbpPipeline["east"]) =>
    (a.careerHighlights ?? []).some((h) => h.type === "playoff_win" && h.opponent === b.id);
  if (!metPlayoff(east, west) && !metPlayoff(west, east)) return;
  const playoffRng = rngFromSeed(seed, "pbp", "playoff-rematch");
  push(
    BardEngine.resolve(playoffRng, "pre_bout.playoff_rematch", {
      EAST: east.shikona,
      WEST: west.shikona,
      eastRikishiId: east.id,
      westRikishiId: west.id,
    }).text,
    "opening",
    ["playoff", "rivalry"]
  );
}

/**
 * Assembles the full pre-bout narrative prelude from ranked context candidates.
 */
export function narratePrelude(p: PbpPipeline): void {
  beatOpeningVenue(p);
  beatDynasty(p);
  beatDramaOpening(p);
  beatRivalryContext(p);
  beatGiantKillerH2H(p);
  beatH2HRecentSurge(p);
  beatPlayoffRematch(p);
  beatStreakCallout(p);
}
