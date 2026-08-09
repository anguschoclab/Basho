/**
 * src/engine/bout/boutResultApplier.ts
 *
 * Handles the application of a bout result to the world state.
 * Responsible for updating standings, stats, earnings, and notifying secondary systems.
 * Returns StateImpact describing bout result application instead of mutating state.
 */

import type { WorldState } from "../types/world";
import type { BoutResult, MatchSchedule } from "../types/basho";
import { updateH2H } from "../h2h";
import * as injuries from "../systems/health/InjuryService";
import * as rivalries from "../rivalries";
import * as economics from "../economics";
import type { NarrativeContext } from "../types/events";
import * as scoutingStore from "../scoutingStore";
import { updateMediaFromBout, createDefaultMediaState } from "../systems/media/MediaService";
import { applyAchievementImpact } from "../systems/economy/SponsorshipService";
import { createImpactBuilder } from "../core/ImpactBuilder";
import type { StateImpact } from "../core/StateImpact";
import { checkMentorMenteeBout } from "../systems/training/MentorshipService";
import { getRikishi } from "../queries";
import { BOUT_DURATION_FATIGUE_PER_TICK } from "../../constants/engine/condition";

/**
 * Apply the result of a single bout to the world.
 *
 * @param world - The current world state.
 * @param match - The match schedule object being updated.
 * @param result - The result of the simulated bout.
 * @returns StateImpact describing bout result application.
 */
export function applyBoutResult(
  world: WorldState,
  match: MatchSchedule,
  result: BoutResult
): StateImpact {
  const builder = createImpactBuilder("boutResult");
  const basho = world.currentBasho;
  if (!basho) {
    return builder.build();
  }

  const east = getRikishi(world, match.eastRikishiId);
  const west = getRikishi(world, match.westRikishiId);
  if (!east || !west) {
    return builder.build();
  }

  const winner = result.winner === "east" ? east : west;
  const loser = result.winner === "east" ? west : east;

  // 1. Update Standing
  const isFusensho = result.kimarite === "fusensho";
  const standings = new Map(basho.standings);
  const wRec = standings.get(winner.id) || { wins: 0, losses: 0, absences: 0 };
  const lRec = standings.get(loser.id) || { wins: 0, losses: 0, absences: 0 };
  standings.set(winner.id, {
    wins: wRec.wins + 1,
    losses: wRec.losses,
    absences: wRec.absences ?? 0,
  });
  if (isFusensho) {
    standings.set(loser.id, {
      wins: lRec.wins,
      losses: lRec.losses,
      absences: (lRec.absences ?? 0) + 1,
    });
  } else {
    standings.set(loser.id, {
      wins: lRec.wins,
      losses: lRec.losses + 1,
      absences: lRec.absences ?? 0,
    });
  }

  // 1.5. Update Career Records Per-Bout (Architectural Change)
  // Increment career wins/losses immediately after each bout
  const winnerBashoWins = (winner.currentBashoWins ?? 0) + 1;
  const loserBashoLosses = (loser.currentBashoLosses ?? 0) + 1;
  const winnerStreak = (winner.currentWinStreak ?? 0) + 1;
  const loserStreak = 0;
  const loserLossStreak = (loser.currentLossStreak ?? 0) + 1;
  const winnerLossStreak = 0;

  // 1.6. Track bout metrics for enriched BashoPerformance (7.1)
  const boutMetrics = { ...(basho.boutMetrics ?? {}) };
  const ensureMetrics = (id: string) => {
    if (!boutMetrics[id]) {
      boutMetrics[id] = {
        kimariteUsed: {},
        upsetCount: 0,
        boutDurations: [],
        edgeCrisisSurvived: 0,
        comebackWins: 0,
        opponentTiers: [],
      };
    }
    return boutMetrics[id];
  };
  if (!isFusensho && result.kimarite) {
    const wMetrics = ensureMetrics(winner.id);
    wMetrics.kimariteUsed[result.kimarite] = (wMetrics.kimariteUsed[result.kimarite] ?? 0) + 1;
    wMetrics.boutDurations.push(result.duration ?? 0);
    if (result.upset) wMetrics.upsetCount++;
    // Edge crisis survived: count edge_crisis log entries where escaped=true for winner
    const edgeEscapes = (result.log ?? []).filter(
      (e) => e.phase === "edge_crisis" && (e.data as Record<string, unknown>)?.escaped === true
    ).length;
    wMetrics.edgeCrisisSurvived += edgeEscapes;
    // Comeback win: winner was in edge crisis and survived
    if (edgeEscapes > 0) wMetrics.comebackWins++;
    // Opponent tier for SOS calculation (4.3)
    const loserTier = loser.rankNumber ?? 99;
    wMetrics.opponentTiers.push(loserTier);

    const lMetrics = ensureMetrics(loser.id);
    lMetrics.boutDurations.push(result.duration ?? 0);
    // Opponent tier for SOS calculation (4.3)
    const winnerTier = winner.rankNumber ?? 99;
    lMetrics.opponentTiers.push(winnerTier);
  }
  builder.updateWorldField("currentBasho", {
    ...basho,
    boutMetrics,
  });

  // Bout-duration fatigue: longer bouts add more fatigue (sekitori only, loser gets 1.5x)
  const isFusenshoBout = result.kimarite === "fusensho";
  const isSekitoriBout = winner.division === "makuuchi" || winner.division === "juryo";
  if (!isFusenshoBout && isSekitoriBout) {
    const duration = result.duration ?? 0;
    const winnerFatigueGain = Math.round(duration * BOUT_DURATION_FATIGUE_PER_TICK);
    const loserFatigueGain = Math.round(duration * BOUT_DURATION_FATIGUE_PER_TICK * 1.5);
    if (winnerFatigueGain > 0) {
      builder.updateRikishi(winner.id, {
        fatigue: Math.min(100, (winner.fatigue ?? 0) + winnerFatigueGain),
      });
    }
    if (loserFatigueGain > 0) {
      builder.updateRikishi(loser.id, {
        fatigue: Math.min(100, (loser.fatigue ?? 0) + loserFatigueGain),
      });
    }
  }

  builder.updateRikishi(winner.id, {
    careerWins: (winner.careerWins ?? 0) + 1,
    currentBashoWins: winnerBashoWins,
    currentBashoRecord: { wins: winnerBashoWins, losses: winner.currentBashoLosses ?? 0 },
    currentWinStreak: winnerStreak,
    currentLossStreak: winnerLossStreak,
  });
  builder.updateRikishi(loser.id, {
    careerLosses: (loser.careerLosses ?? 0) + 1,
    currentBashoLosses: loserBashoLosses,
    currentBashoRecord: { wins: loser.currentBashoWins ?? 0, losses: loserBashoLosses },
    currentWinStreak: loserStreak,
    currentLossStreak: loserLossStreak,
  });

  // Increment makuuchiWins if winner is in makuuchi division
  if (winner.division === "makuuchi") {
    builder.updateRikishi(winner.id, {
      makuuchiWins: (winner.makuuchiWins ?? 0) + 1,
    });
  }

  // Increment division-specific records based on current division
  const winnerDivision = winner.division;
  const loserDivision = loser.division;

  if (winnerDivision && winner.divisionRecords) {
    builder.updateRikishi(winner.id, {
      divisionRecords: {
        ...winner.divisionRecords,
        [winnerDivision]: {
          wins: (winner.divisionRecords[winnerDivision]?.wins ?? 0) + 1,
          losses: winner.divisionRecords[winnerDivision]?.losses ?? 0,
        },
      },
    });
  }

  if (loserDivision && loser.divisionRecords) {
    builder.updateRikishi(loser.id, {
      divisionRecords: {
        ...loser.divisionRecords,
        [loserDivision]: {
          wins: loser.divisionRecords[loserDivision]?.wins ?? 0,
          losses: (loser.divisionRecords[loserDivision]?.losses ?? 0) + 1,
        },
      },
    });
  }

  // Note: basho.standings is not directly updatable via ImpactBuilder
  // This will be handled by updating the basho entity directly
  // For now, we'll update the basho via world field update

  // 2. Track Achievement Counters
  let winnerAchievements = winner.stats.achievements;
  let winnerEconomics = winner.economics;

  if (result.awardFact) {
    if (!winnerAchievements) {
      winnerAchievements = {
        kinboshiEarned: 0,
        ginboshiEarned: 0,
        kinboshiConceded: 0,
        ginboshiConceded: 0,
        mochikyukinPoints: 0,
        specialPrizes: {
          shukunSho: 0,
          kantoSho: 0,
          ginoSho: 0,
        },
      };
    }

    if (result.awardFact === "kinboshi" && winnerAchievements) {
      winnerAchievements.kinboshiEarned++;

      // Update legacy kinboshiCount for backward compatibility
      if (!winnerEconomics) {
        winnerEconomics = {
          cash: 0,
          retirementFund: 0,
          careerKenshoWon: 0,
          kinboshiCount: 0,
          totalEarnings: 0,
          currentBashoEarnings: 0,
          popularity: 50,
        };
      }
      winnerEconomics.kinboshiCount = (winnerEconomics.kinboshiCount || 0) + 1;
    } else if (result.awardFact === "ginboshi" && winnerAchievements) {
      winnerAchievements.ginboshiEarned++;
    }

    // Apply popularity boost for kinboshi/ginboshi awards
    if (result.awardFact === "kinboshi" || result.awardFact === "ginboshi") {
      builder.merge(applyAchievementImpact(world, winner, result.awardFact));
    }
  }

  builder.updateRikishi(winner.id, {
    stats: { ...winner.stats, achievements: winnerAchievements },
    economics: winnerEconomics,
  });

  // 3. Update Head-to-Head Records
  const bashoId = world.currentBasho?.id ?? "unknown";
  const year = world.year ?? 0;
  builder.merge(updateH2H(winner, loser, result, bashoId, year, match.day));

  // 4. Notify Secondary Systems
  const dailyOverrides = world.transientContext?.dailyInjuryRiskOverrides;
  const loserId = result.winner === "east" ? west.id : east.id;
  const winnerId = result.winner === "east" ? east.id : west.id;
  const overrideMult = dailyOverrides?.[loserId] ?? 1.0;
  const winnerOverrideMult = dailyOverrides?.[winnerId] ?? 1.0;
  const finalInjuryMultiplier = (result.tacticInjuryRiskMultiplier ?? 1.0) * overrideMult;

  builder.merge(
    injuries.onBoutResolvedInjury(world, {
      match,
      result,
      east,
      west,
      injuryRiskMultiplier: finalInjuryMultiplier,
      winnerInjuryRiskMultiplier: winnerOverrideMult,
    })
  );

  // Clear the consumed daily injury risk overrides for both loser and winner
  if (
    dailyOverrides &&
    (dailyOverrides[loserId] !== undefined || dailyOverrides[winnerId] !== undefined)
  ) {
    const { [loserId]: _l, [winnerId]: _w, ...cleared } = dailyOverrides;
    void _l;
    void _w;
    builder.updateWorldField("transientContext", {
      ...world.transientContext,
      dailyInjuryRiskOverrides: cleared,
    });
  }

  builder.merge(rivalries.onBoutResolvedRivalries(world, { match, result, east, west }));
  builder.merge(economics.onBoutResolvedEconomics(world, { match, result, east, west }));
  builder.merge(scoutingStore.onBoutResolvedScouting(world, { match, result, east, west }));

  // 5. Update Media (generates headlines, heat, etc.)
  const mediaState = world.mediaState ?? createDefaultMediaState();
  builder.merge(
    updateMediaFromBout({
      state: mediaState,
      world,
      result,
      day: match.day,
      bashoName: world.currentBashoName,
      division: east.division,
      rivalries: world.rivalriesState,
    })
  );
  if (!world.mediaState) {
    builder.updateWorldField("mediaState", mediaState);
  }

  // 6. Emit Canonical Event (Bard Engine v2.1)
  const intensity = calculateMatchIntensity(match, result);

  const ctx: NarrativeContext = {
    shikona: east.shikona,
    rikishiId: east.id,
    east: east.shikona,
    eastRikishiId: east.id,
    west: west.shikona,
    westRikishiId: west.id,
    winner: winner.shikona,
    winnerId: winner.id,
    loser: loser.shikona,
    loserId: loser.id,
    kimarite: result.kimarite,
    duration: result.duration,
    day: match.day,
    upset: result.upset,
    isKinboshi: result.isKinboshi,
    careerPhase: winner.declinePhase ?? "peak",
  };

  builder.logEvent("BOUT_RESOLVED", "match", ctx, {
    rikishiId: winner.id,
    importance: intensity === "high_stakes" ? "major" : "notable",
  });

  // 7. Check for mentor-mentee bout and seed narrative event
  const mentorMenteeEvent = checkMentorMenteeBout(east, west);
  if (mentorMenteeEvent) {
    const mentor = getRikishi(world, mentorMenteeEvent.mentorId);
    const apprentice = getRikishi(world, mentorMenteeEvent.apprenticeId);
    if (mentor && apprentice) {
      const mentorCtx: NarrativeContext = {
        shikona: apprentice.shikona,
        rikishiId: apprentice.id,
        mentor: mentor.shikona,
        mentorId: mentor.id,
        apprentice: apprentice.shikona,
        apprenticeId: apprentice.id,
        winner: winner.shikona,
        winnerId: winner.id,
        loser: loser.shikona,
        loserId: loser.id,
        kimarite: result.kimarite,
        day: match.day,
        upset: result.upset,
      };
      builder.logEvent("MENTOR_MENTEE_BOUT", "training", mentorCtx, {
        rikishiId: apprentice.id,
        importance: "notable",
      });
    }
  }

  // Store updated standings in metadata for the resolver to apply
  builder.addMetadata("updatedStandings", standings);

  return builder.build();
}

/**
 * Calculates narrative intensity for commentary selection.
 */
function calculateMatchIntensity(
  match: MatchSchedule,
  result: BoutResult
): "high_stakes" | "technical" | "neutral" {
  if (result.isKinboshi || result.upset || match.day === 15) {
    return "high_stakes";
  }

  let momentumShifts = 0;
  for (const l of result.log) {
    if (l.phase === "momentum") {
      momentumShifts++;
    }
  }
  if (result.duration > 15 || momentumShifts > 3) {
    return "technical";
  }

  return "neutral";
}
