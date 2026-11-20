/**
 * src/engine/bout/boutResultApplier.ts
 *
 * Handles the application of a bout result to the world state.
 * Responsible for updating standings, stats, earnings, and notifying secondary systems.
 * Returns StateImpact describing bout result application instead of mutating state.
 */

import type { WorldState } from "@/engine/types/world";
import type { BashoState, BoutResult, MatchSchedule } from "@/engine/types/basho";
import type { MatchResultLog } from "@/engine/types/records";
import type { Rikishi } from "@/engine/types/rikishi";
import { updateH2H } from "@/engine/bout/h2h";
import * as injuries from "@/engine/health/InjuryService";
import { onBoutResolvedRivalries } from "@/engine/narrative/rivalry/rivalriesState";
import * as economics from "@/engine/economy/economics";
import type { NarrativeContext } from "@/engine/types/events";
import * as scoutingStore from "@/engine/recruitment/scoutingStore";
import { onBoutResolvedOpponentModels } from "@/engine/npc/opponentLearning";
import { updateMediaFromBout, createDefaultMediaState } from "@/engine/media/MediaService";
import { applyAchievementImpact } from "@/engine/economy/SponsorshipService";
import { createImpactBuilder, ImpactBuilder } from "@/engine/core/ImpactBuilder";
import type { StateImpact } from "@/engine/core/StateImpact";
import { checkMentorMenteeBout } from "@/engine/training/MentorshipService";
import { getRikishi } from "@/engine/core/queries";
import { BOUT_DURATION_FATIGUE_PER_TICK } from "@/constants/engine/condition";
import { RIKISHI_BOUT_HISTORY_MAX } from "@/constants/engine/bout";
import { isSanyakuRank, isSekitoriDivision } from "@/constants/engine/rankDisplay";
import { isPullStyleKimarite } from "@/engine/bout/ReplayMetadata";

// ─── 1. Standings ────────────────────────────────────────────────────────────

function computeUpdatedStandings(
  basho: BashoState,
  winner: Rikishi,
  loser: Rikishi
): Map<string, { wins: number; losses: number; absences?: number; draws?: number }> {
  // JSA convention: a fusenshō result is a fusenpai *loss* — the scheduled
  // bout on the day of withdrawal goes in the losses column. Kyūjō days
  // after that produce no matches at all, so they publish as absences
  // (derived as divisionDays − wins − losses − draws), not extra losses.
  const standings = new Map(basho.standings);
  const wRec = standings.get(winner.id) || { wins: 0, losses: 0, absences: 0 };
  const lRec = standings.get(loser.id) || { wins: 0, losses: 0, absences: 0 };
  standings.set(winner.id, {
    wins: wRec.wins + 1,
    losses: wRec.losses,
    absences: wRec.absences ?? 0,
    ...(wRec.draws ? { draws: wRec.draws } : {}),
  });
  standings.set(loser.id, {
    wins: lRec.wins,
    losses: lRec.losses + 1,
    absences: lRec.absences ?? 0,
    ...(lRec.draws ? { draws: lRec.draws } : {}),
  });
  return standings;
}

// ─── 1.5/1.6. Bout metrics + kinboshi tracking ───────────────────────────────

function updateBoutMetrics(
  basho: BashoState,
  winner: Rikishi,
  loser: Rikishi,
  result: BoutResult,
  isFusensho: boolean,
  builder: ImpactBuilder
): void {
  const boutMetrics = { ...(basho.boutMetrics ?? {}) };
  // Clone-on-write: the shallow copy still aliases each rikishi's metric
  // record, so nested kimariteUsed/boutDurations/opponentTiers writes must
  // first detach the record from the input world.
  const clonedMetrics = new Set<string>();
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
      clonedMetrics.add(id);
    } else if (!clonedMetrics.has(id)) {
      boutMetrics[id] = {
        ...boutMetrics[id],
        kimariteUsed: { ...boutMetrics[id].kimariteUsed },
        boutDurations: [...boutMetrics[id].boutDurations],
        opponentTiers: [...boutMetrics[id].opponentTiers],
      };
      clonedMetrics.add(id);
    }
    return boutMetrics[id];
  };
  if (!isFusensho && result.kimarite) {
    const wMetrics = ensureMetrics(winner.id);
    wMetrics.kimariteUsed[result.kimarite] = (wMetrics.kimariteUsed[result.kimarite] ?? 0) + 1;
    wMetrics.boutDurations.push(result.duration ?? 0);
    if (result.upset) wMetrics.upsetCount++;
    // Edge crisis survived: count edge_crisis log entries where escaped=true for winner
    let edgeEscapes = 0;
    for (const e of result.log ?? []) {
      if (e.phase === "edge_crisis" && (e.data as Record<string, unknown>)?.escaped === true) {
        edgeEscapes++;
      }
    }
    wMetrics.edgeCrisisSurvived += edgeEscapes;
    // Comeback win: winner was in edge crisis and survived
    if (edgeEscapes > 0) wMetrics.comebackWins++;
    // W P — failed edge conversions: `data.side` marks the rikishi IN crisis
    // (the defender); when that side escapes, the OTHER rikishi failed to
    // finish at the tawara. Deliberately side-aware, unlike the legacy
    // side-blind `edgeCrisisSurvived` above.
    for (const e of result.log ?? []) {
      if (e.phase !== "edge_crisis") continue;
      const data = e.data as Record<string, unknown> | undefined;
      if (data?.escaped !== true) continue;
      const failedId = data?.side === result.winner ? loser.id : winner.id;
      const fMetrics = ensureMetrics(failedId);
      fMetrics.edgeFailedConversions = (fMetrics.edgeFailedConversions ?? 0) + 1;
    }
    // Opponent tier for SOS calculation (4.3)
    const loserTier = loser.rankNumber ?? 99;
    wMetrics.opponentTiers.push(loserTier);

    const lMetrics = ensureMetrics(loser.id);
    lMetrics.boutDurations.push(result.duration ?? 0);
    // Opponent tier for SOS calculation (4.3)
    const winnerTier = winner.rankNumber ?? 99;
    lMetrics.opponentTiers.push(winnerTier);

    // W M — signature-grip reputation: for each rikishi who declares a
    // preferred grip, count bouts fought, bouts where he secured it at
    // decision time, and wins among those secured bouts.
    const loserSide: "east" | "west" = result.winner === "east" ? "west" : "east";
    for (const [rikishi, sideKey] of [
      [winner, result.winner],
      [loser, loserSide],
    ] as const) {
      const pref = rikishi.combatProfile?.preferredGrip;
      if (pref !== "migi" && pref !== "hidari") continue;
      const m = ensureMetrics(rikishi.id);
      m.preferredGripBouts = (m.preferredGripBouts ?? 0) + 1;
      if (result.gripSecured?.[sideKey] === true) {
        m.preferredGripSecured = (m.preferredGripSecured ?? 0) + 1;
        if (rikishi === winner) m.preferredGripWins = (m.preferredGripWins ?? 0) + 1;
      }
    }

    // W M — consecutive wins vs sanyaku-ranked opponents this basho.
    wMetrics.sanyakuWinStreak = isSanyakuRank(loser.rank ?? "")
      ? (wMetrics.sanyakuWinStreak ?? 0) + 1
      : 0;
    lMetrics.sanyakuWinStreak = 0;

    // W N — "phase two" tracking: who won the tachiai, and did the bout
    // still get away from him; plus pull-family win counting.
    if (result.tachiaiWinner) {
      const tachiaiVictor = result.tachiaiWinner === result.winner ? winner : loser;
      const tMetrics = ensureMetrics(tachiaiVictor.id);
      tMetrics.tachiaiWins = (tMetrics.tachiaiWins ?? 0) + 1;
      if (result.tachiaiWinner !== result.winner) {
        tMetrics.tachiaiWonButLost = (tMetrics.tachiaiWonButLost ?? 0) + 1;
      }
    }
    if (isPullStyleKimarite(result.kimarite)) {
      wMetrics.pullWins = (wMetrics.pullWins ?? 0) + 1;
    }

    // W O — record last basho day each side attempted or executed a henka.
    const henkaDay = result.day ?? basho.day;
    const eastId = result.winner === "east" ? winner.id : loser.id;
    const westId = result.winner === "east" ? loser.id : winner.id;
    const eastDidHenka =
      result.tactics?.east === "HENKA" ||
      (result.log ?? []).some(
        (e) => e.data?.event === "henka_success" && e.data?.attackerSide === "east"
      );
    const westDidHenka =
      result.tactics?.west === "HENKA" ||
      (result.log ?? []).some(
        (e) => e.data?.event === "henka_success" && e.data?.attackerSide === "west"
      );
    if (eastDidHenka) ensureMetrics(eastId).lastHenkaDay = henkaDay;
    if (westDidHenka) ensureMetrics(westId).lastHenkaDay = henkaDay;
  }
  // Track kinboshi earned this basho for the end-of-basho mochikyukin
  // accumulation. Written in the SAME currentBasho update as boutMetrics so
  // a single world-field write carries both — no stale-spread clobber.
  const kinboshiAwards = (result.awards ?? []).filter((a) => a.type === "kinboshi");
  const kinboshiThisBasho = kinboshiAwards.length
    ? {
        ...(basho.kinboshiThisBasho ?? {}),
        [winner.id]: (basho.kinboshiThisBasho?.[winner.id] ?? 0) + kinboshiAwards.length,
      }
    : basho.kinboshiThisBasho;

  builder.updateWorldField("currentBasho", {
    ...basho,
    boutMetrics,
    ...(kinboshiThisBasho ? { kinboshiThisBasho } : {}),
  });
}

// ─── Bout-duration fatigue ───────────────────────────────────────────────────

function applyBoutFatigue(
  winner: Rikishi,
  loser: Rikishi,
  result: BoutResult,
  builder: ImpactBuilder
): void {
  // Bout-duration fatigue: longer bouts add more fatigue (sekitori only, loser gets 1.5x)
  const isFusenshoBout = result.kimarite === "fusensho";
  const isSekitoriBout = isSekitoriDivision(winner.division);
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
}

// ─── Career records + per-bout MatchResultLog ────────────────────────────────

function updateCareerRecords(
  world: WorldState,
  basho: BashoState,
  match: MatchSchedule,
  result: BoutResult,
  winner: Rikishi,
  loser: Rikishi,
  builder: ImpactBuilder
): void {
  const winnerBashoWins = (winner.currentBashoWins ?? 0) + 1;
  const loserBashoLosses = (loser.currentBashoLosses ?? 0) + 1;
  const winnerStreak = (winner.currentWinStreak ?? 0) + 1;
  const loserStreak = 0;
  const loserLossStreak = (loser.currentLossStreak ?? 0) + 1;
  const winnerLossStreak = 0;

  // Per-bout MatchResultLog — the authoritative history[] entry that feeds
  // getH2HReport, streak labels, and favored-kimarite projections. Capped at
  // a rolling window (RIKISHI_BOUT_HISTORY_MAX) — boundHistoryArrays bounds
  // world-level arrays but not per-rikishi logs.
  // W M — `division` records the card the bout was contested on: for a
  // cross-division callup or an eighth-bout fill, the bout is logged under
  // the HOST division (the rikishi who wasn't brought in).
  const calledUpId = match.crossDivisionCallupId ?? match.eighthBoutForRikishiId;
  const cardDivision =
    calledUpId === winner.id
      ? loser.division
      : calledUpId === loser.id
        ? winner.division
        : winner.division;
  const logEntryBase = {
    kimarite: result.kimarite ?? "",
    bashoId: basho.id ?? `${basho.bashoName}-${world.year}`,
    day: match.day ?? 0,
    year: world.year ?? 0,
    division: cardDivision,
  };
  const appendBoutLog = (log: Rikishi["history"], entry: MatchResultLog) =>
    [...(log ?? []), entry].slice(-RIKISHI_BOUT_HISTORY_MAX);

  builder.updateRikishi(winner.id, {
    careerWins: (winner.careerWins ?? 0) + 1,
    currentBashoWins: winnerBashoWins,
    currentBashoRecord: { wins: winnerBashoWins, losses: winner.currentBashoLosses ?? 0 },
    currentWinStreak: winnerStreak,
    currentLossStreak: winnerLossStreak,
    history: appendBoutLog(winner.history, { ...logEntryBase, opponentId: loser.id, win: true }),
  });
  builder.updateRikishi(loser.id, {
    careerLosses: (loser.careerLosses ?? 0) + 1,
    currentBashoLosses: loserBashoLosses,
    currentBashoRecord: { wins: loser.currentBashoWins ?? 0, losses: loserBashoLosses },
    currentWinStreak: loserStreak,
    currentLossStreak: loserLossStreak,
    history: appendBoutLog(loser.history, { ...logEntryBase, opponentId: winner.id, win: false }),
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
}

// ─── 2. Achievement counters ─────────────────────────────────────────────────

function applyAchievements(
  world: WorldState,
  basho: BashoState,
  match: MatchSchedule,
  result: BoutResult,
  winner: Rikishi,
  loser: Rikishi,
  builder: ImpactBuilder
): void {
  // Single writer: the resolver only detects awards (pure); this applier is
  // the sole place achievement counters, kinboshiThisBasho, and the award
  // ledger are written — exactly once per award fact on the result.
  const awards = result.awards ?? [];
  if (awards.length > 0) {
    const mkAchievements = () => ({
      kinboshiEarned: 0,
      ginboshiEarned: 0,
      kinboshiConceded: 0,
      ginboshiConceded: 0,
      mochikyukinPoints: 0,
      specialPrizes: { shukunSho: 0, kantoSho: 0, ginoSho: 0 },
    });
    const winnerAchievements = winner.stats.achievements
      ? { ...winner.stats.achievements }
      : mkAchievements();
    const loserAchievements = loser.stats.achievements
      ? { ...loser.stats.achievements }
      : mkAchievements();
    for (const award of awards) {
      if (award.type === "kinboshi") {
        winnerAchievements.kinboshiEarned++;
        loserAchievements.kinboshiConceded++;

        // Persist the gold star to the global award ledger — this is the
        // record that powers history, the Almanac, and YDC accountability.
        builder.appendToWorldArray("awardLog", [
          {
            bashoName: basho.bashoName,
            year: world.year ?? basho.year,
            type: "kinboshi",
            winnerId: winner.id,
            opponentId: loser.id,
            boutId: result.boutId,
            day: match.day ?? result.day,
          },
        ]);
      } else if (award.type === "ginboshi") {
        winnerAchievements.ginboshiEarned++;
        loserAchievements.ginboshiConceded++;
      }
    }

    builder.updateRikishi(winner.id, {
      stats: { ...winner.stats, achievements: winnerAchievements },
    });
    builder.updateRikishi(loser.id, {
      stats: { ...loser.stats, achievements: loserAchievements },
    });

    // Apply popularity boost for kinboshi/ginboshi awards
    if (result.awardFact === "kinboshi" || result.awardFact === "ginboshi") {
      builder.merge(applyAchievementImpact(world, winner, result.awardFact));
    }
  }
}

// ─── 3/4. H2H + secondary systems ────────────────────────────────────────────

function notifySecondarySystems(
  world: WorldState,
  match: MatchSchedule,
  result: BoutResult,
  east: Rikishi,
  west: Rikishi,
  winner: Rikishi,
  loser: Rikishi,
  kinboshiAwardCount: number,
  builder: ImpactBuilder
): void {
  const bashoId = world.currentBasho?.id ?? "unknown";
  const year = world.year ?? 0;
  builder.merge(updateH2H(winner, loser, result, bashoId, year, match.day));

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

  builder.merge(onBoutResolvedRivalries(world, { match, result, east, west }));
  builder.merge(economics.onBoutResolvedEconomics(world, { match, result, east, west }));

  // Legacy economics.kinboshiCount counter — written AFTER the kensho
  // economics merge so a stale `economics` spread there can't clobber it.
  if (kinboshiAwardCount > 0) {
    builder.updateRikishiNestedField(
      winner.id,
      "economics.kinboshiCount",
      (winner.economics?.kinboshiCount ?? 0) + kinboshiAwardCount
    );
  }

  builder.merge(scoutingStore.onBoutResolvedScouting(world, { match, result, east, west }));
  builder.merge(onBoutResolvedOpponentModels(world, { match, result, east, west }));
}

// ─── 5. Media ────────────────────────────────────────────────────────────────

function mergeMediaUpdate(
  world: WorldState,
  match: MatchSchedule,
  result: BoutResult,
  east: Rikishi,
  builder: ImpactBuilder
): void {
  const mediaState = world.mediaState ?? createDefaultMediaState();
  // Hydrate mediaState BEFORE merging the bout update — otherwise the
  // pristine default last-write-wins over the bout's headlines/heat.
  if (!world.mediaState) {
    builder.updateWorldField("mediaState", mediaState);
  }
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
}

// ─── 6. Canonical event ──────────────────────────────────────────────────────

function emitBoutResolvedEvent(
  match: MatchSchedule,
  result: BoutResult,
  east: Rikishi,
  west: Rikishi,
  winner: Rikishi,
  loser: Rikishi,
  builder: ImpactBuilder
): void {
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
}

// ─── 7. Mentor-mentee event ──────────────────────────────────────────────────

function emitMentorMenteeEvent(
  world: WorldState,
  match: MatchSchedule,
  result: BoutResult,
  east: Rikishi,
  west: Rikishi,
  winner: Rikishi,
  loser: Rikishi,
  builder: ImpactBuilder
): void {
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
}

/**
 * Apply the result of a single bout to the world.
 *
 * @param world - The current world state.
 * @param match - The match schedule object being updated.
 * @param result - The result of the simulated bout.
 * @returns StateImpact describing bout result application.
 */
/** Apply an official draw result (azukari / itamiwake / hikiwake): neutral to W/L, streaks, and kensho. */
function applyDrawBoutResult(
  world: WorldState,
  basho: BashoState,
  match: MatchSchedule,
  result: BoutResult,
  east: Rikishi,
  west: Rikishi,
  maezumoBout: boolean,
  builder: ImpactBuilder
): StateImpact {
  const standings = new Map(basho.standings);
  if (!maezumoBout) {
    for (const [sideR, otherR] of [
      [east, west],
      [west, east],
    ] as const) {
      if (sideR.isMaezumo) continue;
      const rec = standings.get(sideR.id) || { wins: 0, losses: 0, absences: 0 };
      const nextDraws = (rec.draws ?? 0) + 1;
      standings.set(sideR.id, {
        wins: rec.wins,
        losses: rec.losses,
        absences: rec.absences ?? 0,
        draws: nextDraws,
      });
      const rDraws = (sideR.currentBashoDraws ?? 0) + 1;
      const logEntry: MatchResultLog = {
        opponentId: otherR.id,
        win: false,
        draw: true,
        kimarite: result.kimarite ?? "",
        bashoId: basho.id ?? `${basho.bashoName}-${world.year}`,
        day: match.day ?? 0,
        year: world.year ?? 0,
        division: sideR.division,
      };
      builder.updateRikishi(sideR.id, {
        currentBashoDraws: rDraws,
        currentBashoRecord: {
          wins: sideR.currentBashoWins ?? 0,
          losses: sideR.currentBashoLosses ?? 0,
          draws: rDraws,
        },
        history: [...(sideR.history ?? []), logEntry].slice(-RIKISHI_BOUT_HISTORY_MAX),
      });
    }
  }

  const duration = result.duration ?? 0;
  for (const r of [east, west]) {
    if (isSekitoriDivision(r.division)) {
      const gain = Math.round(duration * BOUT_DURATION_FATIGUE_PER_TICK * 1.25);
      if (gain > 0) {
        builder.updateRikishi(r.id, { fatigue: Math.min(100, (r.fatigue ?? 0) + gain) });
      }
    }
  }

  const bashoId = basho.id ?? "unknown";
  builder.merge(updateH2H(east, west, result, bashoId, world.year ?? 0, match.day));
  builder.merge(injuries.onBoutResolvedInjury(world, { match, result, east, west }));
  builder.merge(scoutingStore.onBoutResolvedScouting(world, { match, result, east, west }));
  builder.merge(onBoutResolvedOpponentModels(world, { match, result, east, west }));

  builder.logEvent(
    "BOUT_RESOLVED",
    "match",
    {
      shikona: east.shikona,
      rikishiId: east.id,
      east: east.shikona,
      eastRikishiId: east.id,
      west: west.shikona,
      westRikishiId: west.id,
      kimarite: result.kimarite,
      duration: result.duration,
      day: match.day,
      isDraw: true,
      drawType: result.drawType,
    },
    { rikishiId: east.id, importance: "notable" }
  );

  builder.addMetadata("updatedStandings", standings);
  return builder.build();
}

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

  // Maezumo participants are evaluation fillers — a bout touching one never
  // writes standings, career counters, or history for either side.
  const maezumoBout = east.isMaezumo === true || west.isMaezumo === true;

  if (result.isDraw) {
    return applyDrawBoutResult(world, basho, match, result, east, west, maezumoBout, builder);
  }

  // Double fusenpai (両者不戦敗): both rikishi absent for a scheduled bout —
  // no winner exists. Each side takes a fusenpai loss; no win, records, H2H,
  // media, or event pipeline runs.
  if (!result.winnerRikishiId) {
    const standings = new Map(basho.standings);
    for (const r of [east, west]) {
      if (r.isMaezumo) continue;
      const rec = standings.get(r.id) || { wins: 0, losses: 0, absences: 0 };
      standings.set(r.id, {
        wins: rec.wins,
        losses: rec.losses + 1,
        absences: rec.absences ?? 0,
      });
    }
    builder.addMetadata("updatedStandings", standings);
    return builder.build();
  }

  const winner = result.winner === "east" ? east : west;
  const loser = result.winner === "east" ? west : east;

  // 1. Update Standing — a fusenshō is a fusenpai loss, not an absence.
  const isFusensho = result.kimarite === "fusensho";
  const standings = maezumoBout ? basho.standings : computeUpdatedStandings(basho, winner, loser);

  // 1.5/1.6. Bout metrics + kinboshi tracking
  updateBoutMetrics(basho, winner, loser, result, isFusensho, builder);

  // Bout-duration fatigue
  applyBoutFatigue(winner, loser, result, builder);

  if (!maezumoBout) {
    // Career records + per-bout MatchResultLog
    updateCareerRecords(world, basho, match, result, winner, loser, builder);

    // 2. Achievement counters
    applyAchievements(world, basho, match, result, winner, loser, builder);
  }
  const kinboshiAwardCount = (result.awards ?? []).filter((a) => a.type === "kinboshi").length;

  // 3/4. H2H + secondary systems
  notifySecondarySystems(
    world,
    match,
    result,
    east,
    west,
    winner,
    loser,
    kinboshiAwardCount,
    builder
  );

  // 5. Media
  mergeMediaUpdate(world, match, result, east, builder);

  // 6. Canonical event
  emitBoutResolvedEvent(match, result, east, west, winner, loser, builder);

  // 7. Mentor-mentee event
  emitMentorMenteeEvent(world, match, result, east, west, winner, loser, builder);

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
