/**
 * bout/narrative/prelude.ts — extracted beats from generateBoutNarrative.
 * Code moved verbatim; dependencies arrive via the shared PbpPipeline.
 */
import type { PbpPipeline } from "./pipeline";
import type { PbpTag } from "./pbpTypes";
import { BardEngine } from "../../bard/BardEngine";
import { rngFromSeed } from "../../rng";
import { BloodlineService } from "../../systems/legacy/BloodlineService";

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

export function narratePrelude(p: PbpPipeline): void {
  beatOpeningVenue(p);
  beatDynasty(p);
  beatDramaOpening(p);
  beatRivalryContext(p);
  beatStreakCallout(p);
}
