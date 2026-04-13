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
import { EventBus } from "../events";
import * as injuries from "../systems/health/InjuryService";
import * as rivalries from "../rivalries";
import * as economics from "../economics";
import type { NarrativeContext } from "../types/events";
import * as scoutingStore from "../scoutingStore";
import { updateMediaFromBout, createDefaultMediaState } from "../systems/media/MediaService";
import { applyAchievementImpact } from "../systems/economics/SponsorshipService";
import { safeCall } from "../utils/safe";
import { createImpactBuilder } from "../core/ImpactBuilder";
import type { StateImpact } from "../core/StateImpact";

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

  const east = world.rikishi.get(match.eastRikishiId);
  const west = world.rikishi.get(match.westRikishiId);
  if (!east || !west) {
    return builder.build();
  }

  const winner = result.winner === "east" ? east : west;
  const loser = result.winner === "east" ? west : east;

  // 1. Update Standing
  const standings = new Map(basho.standings);
  const wRec = standings.get(winner.id) || { wins: 0, losses: 0 };
  const lRec = standings.get(loser.id) || { wins: 0, losses: 0 };
  standings.set(winner.id, { wins: wRec.wins + 1, losses: wRec.losses });
  standings.set(loser.id, { wins: lRec.wins, losses: lRec.losses + 1 });

  // 1.5. Update Career Records Per-Bout (Architectural Change)
  // Increment career wins/losses immediately after each bout
  builder.updateRikishi(winner.id, {
    careerWins: (winner.careerWins ?? 0) + 1,
  });
  builder.updateRikishi(loser.id, {
    careerLosses: (loser.careerLosses ?? 0) + 1,
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
        specialPrizes: {
          shukunSho: 0,
          kantoSho: 0,
          ginoSho: 0,
        },
      };
    }

    if (result.awardFact === "kinboshi") {
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
    } else if (result.awardFact === "ginboshi") {
      winnerAchievements.ginboshiEarned++;
    }

    // Apply popularity boost for kinboshi/ginboshi awards
    if (result.awardFact === "kinboshi" || result.awardFact === "ginboshi") {
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
      const tempWinner = { ...winner, economics: { ...winnerEconomics } };
      applyAchievementImpact(world, tempWinner, result.awardFact);
      winnerEconomics = tempWinner.economics!;
    }
  }

  builder.updateRikishi(winner.id, {
    stats: { ...winner.stats, achievements: winnerAchievements },
    economics: winnerEconomics,
  });

  // 3. Update Head-to-Head Records
  const bashoId = world.currentBasho?.id ?? "unknown";
  const year = world.year ?? 0;
  const h2hImpact = updateH2H(winner, loser, result, bashoId, year, match.day);

  // 4. Notify Secondary Systems
  const injuryImpact = injuries.onBoutResolvedInjury(world, { match, result, east, west });
  const rivalryImpact = rivalries.onBoutResolvedRivalries(world, { match, result, east, west });
  const economicsImpact = economics.onBoutResolvedEconomics(world, { match, result, east, west });
  const scoutingImpact = scoutingStore.onBoutResolvedScouting(world, { match, result, east, west });

  // 5. Update Media (generates headlines, heat, etc.)
  let mediaImpact = createImpactBuilder("media").build();
  if (!world.mediaState) {
    world.mediaState = createDefaultMediaState();
  }
  mediaImpact = updateMediaFromBout({
    state: world.mediaState,
    world,
    result,
    day: match.day,
    bashoName: world.currentBashoName,
    division: east.division,
    rivalries: world.rivalriesState,
  });

  // Merge all impacts into the main builder
  mergeImpacts(
    builder,
    h2hImpact,
    injuryImpact,
    rivalryImpact,
    economicsImpact,
    scoutingImpact,
    mediaImpact
  );

  // 6. Emit Canonical Event (Bard Engine v2.1)
  const intensity = calculateMatchIntensity(match, result);

  const ctx: NarrativeContext = {
    shikona: east.shikona, // default to east for general context
    winner: winner.shikona,
    loser: loser.shikona,
    kimarite: result.kimarite,
    duration: result.duration,
    day: match.day,
    upset: result.upset,
    isKinboshi: result.isKinboshi,
  };

  builder.logEvent("BOUT_RESOLVED", "narrative", ctx, {
    rikishiId: winner.id,
    importance: intensity === "high_stakes" ? "major" : "notable",
  });

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

  // Technical matches are long or have many momentum shifts
  const momentumShifts = result.log.filter((l) => l.phase === "momentum").length;
  if (result.duration > 15 || momentumShifts > 3) {
    return "technical";
  }

  return "neutral";
}

/**
 * Merge multiple StateImpact objects into a single builder.
 */
function mergeImpacts(builder: any, ...impacts: StateImpact[]): void {
  for (const impact of impacts) {
    if (impact.entities?.rikishiUpdates) {
      for (const [id, update] of impact.entities.rikishiUpdates) {
        builder.updateRikishi(id, update);
      }
    }
    if (impact.entities?.heyaUpdates) {
      for (const [id, update] of impact.entities.heyaUpdates) {
        builder.updateHeya(id, update);
      }
    }
    if (impact.worldFields) {
      for (const [field, value] of Object.entries(impact.worldFields)) {
        (builder as any).updateWorldField(field, value);
      }
    }
    if (impact.events) {
      for (const event of impact.events) {
        builder.logEvent(event.type, event.category, event.data, {
          heyaId: event.heyaId,
          rikishiId: event.rikishiId,
          importance: event.importance,
        });
      }
    }
  }
}
