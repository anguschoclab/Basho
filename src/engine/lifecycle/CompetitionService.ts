/**
 * CompetitionService — thin orchestrator barrel.
 *
 * Responsibilities are split across focused sub-modules:
 *   - PlayoffResolver.ts  : playoff bracket resolution + standings calculation
 *   - PrizeDistribution.ts: sansho prizes, basho teate, kinboshi stipends
 *   - BashoHistory.ts     : almanac snapshots, award log, yokozuna deliberations
 *
 * All sub-module exports are re-exported here so existing imports remain valid.
 */

import { createImpactBuilder } from "../core/ImpactBuilder";
import { mergeImpacts } from "../core/ImpactResolver";
import { accumulateMochikyukinPoints } from "../systems/economy/MochikyukinService";
import type { WorldState } from "../types/world";
import type { StateImpact } from "../core/StateImpact";
import { resolvePlayoffs, calculateStandings, calculateDivisionStandings, resolveDivisionPlayoffs } from "./PlayoffResolver";
import { distributePrizes, payBashoTeate, payKinboshiStipends } from "./PrizeDistribution";
import { recordBashoHistory, checkYokozunaPromotions } from "./BashoHistory";
import { getRikishi } from "../queries";
import { BardEngine } from "../bard/BardEngine";
import { rngFromSeed } from "../rng";
import type { PbpLine } from "../bout/boutNarrative";
import type { Milestone } from "../types/history";
import type { Id } from "../types/common";
import { BASHO_CALENDAR } from "../calendar";
import { PostBashoPressService } from "../systems/narrative/PostBashoPressService";

export { resolvePlayoffs, calculateStandings, calculateDivisionStandings, resolveDivisionPlayoffs };
export { distributePrizes, payBashoTeate, payKinboshiStipends };
export { recordBashoHistory, checkYokozunaPromotions };

/**
 * Conclude Tournament Competition — handles yusho, prizes, and playoffs.
 * Returns StateImpact describing competition conclusion instead of mutating directly.
 *
 * Algorithm:
 * 1. Calculate standings to determine yusho candidates
 * 2. If tie for first, resolve playoffs
 * 3. Distribute prizes (sansho, kinboshi, etc.)
 * 4. Record basho history and phase transitions
 * 5. Pay basho teate to non-sekitori rikishi
 * 6. Pay kinboshi stipends
 * 7. Accumulate mochikyukin points for sekitori
 * 8. Merge all impacts together
 *
 * @param {WorldState} world - Current world state.
 * @returns {StateImpact} Impact describing competition conclusion.
 *
 * @example
 * ```ts
 * const impact = concludeBashoCompetition(world);
 * const updatedWorld = resolveImpacts(world, [impact]);
 * ```
 */
export function concludeBashoCompetition(world: WorldState): StateImpact {
  const builder = createImpactBuilder("concludeBashoCompetition");
  const basho = world.currentBasho;
  if (!basho) return builder.build();

  const { topCandidates, bestWins } = calculateStandings(basho);

  if (topCandidates.length === 0) return builder.build();

  let yusho = topCandidates[0];
  const playoffMatches = [] as import("../types/basho").MatchSchedule[];

  if (topCandidates.length > 1) {
    const playoffResult = resolvePlayoffs(world, basho, topCandidates);
    yusho = playoffResult.winner;
    playoffMatches.push(...playoffResult.matches);

    const champ = getRikishi(world, yusho);
    const playoffPbpLines = playoffResult.matches.flatMap(
      (m) => m.result?.pbpLines ?? []
    );
    builder.logEvent(
      "BOUT_RESOLVED",
      "narrative",
      {
        status: "playoff_result",
        shikona: champ?.shikona ?? yusho,
        score: topCandidates.length,
        delta: bestWins,
        pbpLines: playoffPbpLines,
      },
      { rikishiId: yusho }
    );
  }

  // Per-division playoffs for lower divisions (juryo, makushita, sandanme, jonidan, jonokuchi)
  const lowerDivisions = ["juryo", "makushita", "sandanme", "jonidan", "jonokuchi"];
  const allDivisionPlayoffLines: PbpLine[] = [];
  let divisionPlayoffCount = 0;
  const divisionYushoMap: Record<string, Id> = {};

  for (const division of lowerDivisions) {
    const divStandings = calculateDivisionStandings(basho, world, division);
    if (divStandings.topCandidates.length > 0) {
      // Record division yusho winner (top candidate, or playoff winner if playoff occurred)
      if (divStandings.topCandidates.length > 1) {
        divisionPlayoffCount++;
        const divResult = resolveDivisionPlayoffs(world, basho, divStandings.topCandidates, division);
        allDivisionPlayoffLines.push(...divResult.narrativeLines);
        playoffMatches.push(...divResult.matches);
        // Playoff winner is the last match's winner
        const lastMatch = divResult.matches[divResult.matches.length - 1];
        if (lastMatch?.result?.winnerRikishiId) {
          divisionYushoMap[division] = lastMatch.result.winnerRikishiId;
        }
      } else {
        // Single clear winner — no playoff needed
        divisionYushoMap[division] = divStandings.topCandidates[0];
      }
    }
  }

  // Schedule delay narrative if multiple division playoffs occurred OR total playoff bouts > 3
  const totalPlayoffBouts = playoffMatches.length;
  if (divisionPlayoffCount >= 2 || totalPlayoffBouts > 3) {
    const scheduleRng = rngFromSeed(`schedule-delay-${basho.bashoName}-${world.year}`, "narrative", "playoff");
    const delayLine = BardEngine.resolve(scheduleRng, "playoff.schedule_delay", {});
    if (delayLine.text) {
      allDivisionPlayoffLines.push({
        text: delayLine.text,
        id: `schedule-delay-${basho.bashoName}-${world.year}`,
        phase: "post_bout",
        tags: ["schedule_delay", "playoff"],
      });
    }
  }

  // Log division playoff narrative if any occurred
  if (allDivisionPlayoffLines.length > 0) {
    builder.logEvent(
      "BASHO_STATUS",
      "basho",
      {
        status: "division_playoffs",
        incident: "Lower Division Playoffs",
        narrative: allDivisionPlayoffLines,
        divisionPlayoffCount,
        bashoName: basho.bashoName,
      },
      { importance: "notable" }
    );
  }

  // Justice done narrative — if yusho winner suffered a monoii loss earlier in the basho
  const justiceDoneRng = rngFromSeed(`justice-${basho.bashoName}-${world.year}`, "narrative", "playoff");
  for (const match of basho.matches ?? []) {
    if (match.result?.monoii && match.result.loserRikishiId === yusho) {
      const r = getRikishi(world, yusho);
      if (r) {
        const justiceLine = BardEngine.resolve(justiceDoneRng, "playoff.justice_done", {
          SHIKONA: r.shikona,
          rikishiId: r.id,
        });
        if (justiceLine.text) {
          builder.logEvent(
            "BASHO_STATUS",
            "basho",
            {
              status: "justice_done",
              incident: "Justice Done",
              shikona: r.shikona,
              rikishiId: r.id,
              statement: justiceLine.text,
              bashoName: basho.bashoName,
            },
            { rikishiId: r.id, importance: "major" }
          );
        }
        break;
      }
    }
  }

  const { prizes, impact: prizeImpact } = distributePrizes(world, basho, yusho);

  // Merge prize impact
  if (prizeImpact.entities?.rikishiUpdates) {
    for (const [id, update] of prizeImpact.entities.rikishiUpdates) {
      builder.updateRikishi(id, update);
    }
  }
  if (prizeImpact.entities?.heyaUpdates) {
    for (const [id, update] of prizeImpact.entities.heyaUpdates) {
      builder.updateHeya(id, update);
    }
  }
  if (prizeImpact.events) {
    for (const event of prizeImpact.events) {
      builder.logEvent(event.type, event.category, event.data, {
        heyaId: event.heyaId,
        rikishiId: event.rikishiId,
        importance: event.importance,
      });
    }
  }

  // Record basho history and phase transitions
  const historyImpact = recordBashoHistory(
    world,
    basho,
    yusho,
    topCandidates,
    playoffMatches,
    prizes,
    bestWins
  );

  // Ozeki demotion comeback yusho detection
  const yushoWinner = getRikishi(world, yusho);
  if (yushoWinner?.wasDemotedFromOzeki === true) {
    const comebackRng = rngFromSeed(`comeback-yusho-${yusho}-${basho.bashoName}-${world.year}`, "narrative", "comeback");
    const comebackLine = BardEngine.resolve(comebackRng, "post_basho_press.ozeki_comeback_yusho", {
      SHIKONA: yushoWinner.shikona,
      rikishiId: yusho,
    });
    const comebackPbpLines: PbpLine[] = [];
    if (comebackLine.text) {
      comebackPbpLines.push({
        text: comebackLine.text,
        id: `comeback-yusho-${yusho}-${basho.bashoName}-${world.year}`,
        phase: "post_bout",
        tags: ["comeback", "ozeki_demotion"],
      });
    }
    const reflectionLine = BardEngine.resolve(comebackRng, "post_basho_press.ozeki_comeback_reflection", {
      SHIKONA: yushoWinner.shikona,
      rikishiId: yusho,
    });
    if (reflectionLine.text) {
      comebackPbpLines.push({
        text: reflectionLine.text,
        id: `comeback-reflection-${yusho}-${basho.bashoName}-${world.year}`,
        phase: "post_bout",
        tags: ["comeback", "ozeki_demotion"],
      });
    }

    const bashoMonth = BASHO_CALENDAR[basho.bashoName]?.month ?? 1;
    const milestone: Milestone = {
      id: `milestone-comeback-${yusho}-${world.year}-${bashoMonth}`,
      type: "ozeki_demotion_comeback_yusho",
      title: "Ozeki Demotion Comeback Yusho",
      description: `${yushoWinner.shikona} became the first to respond to Ozeki demotion by taking the cup in the following meet.`,
      date: { year: world.year, month: bashoMonth },
    };

    builder.logEvent(
      "LIFECYCLE_EVENT",
      "milestone",
      {
        status: "historic_achievement",
        incident: "ozeki_demotion_comeback_yusho",
        shikona: yushoWinner.shikona,
        rikishiId: yusho,
        description: milestone.description,
        narrative: comebackPbpLines,
      },
      { rikishiId: yusho, importance: "headline" }
    );

    const existingMilestones = yushoWinner.milestones || [];
    builder.updateRikishi(yusho, {
      wasDemotedFromOzeki: false,
      milestones: [...existingMilestones, milestone],
    });
  }

  // Post-basho press conference PBP generation
  const pressLines = PostBashoPressService.generatePressConference(world, {
    yushoId: yusho,
    junYushoIds: topCandidates,
    ginoSho: prizes.ginoSho,
    kantosho: prizes.kantosho,
    shukunsho: prizes.shukunsho,
    bashoName: basho.bashoName,
    year: world.year,
    divisionYushoMap,
  });
  if (pressLines.length > 0) {
    builder.logEvent(
      "BASHO_STATUS",
      "basho",
      {
        status: "post_basho_press_conference",
        incident: "Post-Basho Press Conference",
        shikona: yushoWinner?.shikona ?? "Unknown",
        rikishiId: yusho,
        narrative: pressLines,
        bashoName: basho.bashoName,
      },
      { importance: "major" }
    );
  }

  // Pay basho teate to non-sekitori rikishi
  const teateImpact = payBashoTeate(world);

  // Pay kinboshi stipends (per-basho, not per-month)
  const kinboshiImpact = payKinboshiStipends(world);

  // Accumulate mochikyukin points for sekitori
  const mochikyukinImpact = createImpactBuilder("mochikyukinAccumulation");
  for (const id of world.activeRikishiIds) {
    const r = getRikishi(world, id);
    if (!r) continue;
    if (r.division !== "makuuchi" && r.division !== "juryo") continue;

    const bashoWins = r.currentBashoWins ?? 0;
    const bashoLosses = r.currentBashoLosses ?? 0;
    const netWins = bashoWins - bashoLosses;
    const isYusho = id === yusho;
    const isJunYusho = topCandidates.length > 1 && id === topCandidates[1];
    const kinboshiThisBasho = basho.kinboshiThisBasho?.[id] ?? 0;
    const isZenshoYusho = isYusho && bashoLosses === 0;

    const impact = accumulateMochikyukinPoints(world, id, {
      netWins,
      isYusho,
      isJunYusho,
      isZenshoYusho,
      kinboshiEarned: kinboshiThisBasho,
    });

    if (impact.entities?.rikishiUpdates) {
      for (const [rid, update] of impact.entities.rikishiUpdates) {
        mochikyukinImpact.updateRikishi(rid, update);
      }
    }
  }

  // Merge impacts together
  return mergeImpacts([
    builder.build(),
    historyImpact,
    teateImpact,
    kinboshiImpact,
    mochikyukinImpact.build(),
  ]);
}
