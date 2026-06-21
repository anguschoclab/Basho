/**
 * GlobalCupService.ts
 * ==================
 * Orchestrates the "Worlds Exhibition" off-season tournament.
 * (Phase 3: Global Circuit & Rivalry Dynamics)
 */

import { WorldState } from "../../types/world";
import { Rikishi } from "../../types/rikishi";
import { createImpactBuilder, ImpactBuilder } from "../../core/ImpactBuilder";
import { StateImpact } from "../../core/StateImpact";
import { RNGRegistry } from "../../core/RNGRegistry";
import type {
  GlobalCupMatch,
  GlobalCupParticipant,
  GlobalCupState,
  GlobalCupHistoryEntry,
  GlobalCupBoutResult,
} from "../../types/globalCup";
import { getRikishi } from "../../queries";

export const GlobalCupService = {
  /**
   * Selection: Top 6 JSA Rikishi (by Rank) + 2 International Challengers.
   */
  selectParticipants(world: WorldState): GlobalCupParticipant[] {
    // ⚡ Bolt Optimization: Use direct iteration instead of Array.from().map().filter().sort()
    const pool: Rikishi[] = [];
    for (const id of world.activeRikishiIds) {
      const r = getRikishi(world, id);
      if (r && !r.injured) pool.push(r);
    }
    pool.sort((a, b) => {
      const rankVal = (r: Rikishi) =>
        r.rank === "yokozuna"
          ? 100
          : r.rank === "ozeki"
            ? 80
            : r.rank === "sekiwake"
              ? 60
              : r.rank === "komusubi"
                ? 40
                : r.rankNumber
                  ? 20 - r.rankNumber / 10
                  : 0;
      return rankVal(b) - rankVal(a);
    });

    const jsaElites: GlobalCupParticipant[] = pool.slice(0, 6).map((r, i) => ({
      rikishiId: r.id,
      shikona: r.shikona || r.name || "Unknown",
      rank: r.rank || "Maegashira",
      heyaId: r.heyaId,
      nationality: r.nationality || "Japan",
      isChallenger: false,
      seed: i + 1,
    }));

    RNGRegistry.getSystemRNG(world, "global_cup", `challengers_${world.year}`);
    const talentPool = world.talentPool;
    const foreignCandidates = talentPool
      ? Object.values(talentPool.candidates).filter(
          (c) => c.nationality !== "Japan" && c.availabilityState === "available"
        )
      : [];

    // Pick or generate challenger 1
    let c1: GlobalCupParticipant;
    if (foreignCandidates.length > 0) {
      const best = foreignCandidates.sort((a, b) => (b.talentSeed || 0) - (a.talentSeed || 0))[0];
      c1 = {
        rikishiId: best.candidateId,
        shikona: best.name,
        rank: "Ozeki",
        nationality: best.nationality,
        isChallenger: true,
        seed: 7,
      };
    } else {
      c1 = {
        rikishiId: `challenger_${world.year}_1`,
        shikona: "Giant of the Steppe",
        rank: "Ozeki",
        nationality: "Mongolia",
        isChallenger: true,
        seed: 7,
      };
    }

    // Pick or generate challenger 2
    let c2: GlobalCupParticipant;
    if (foreignCandidates.length > 1) {
      const best = foreignCandidates.sort((a, b) => (b.talentSeed || 0) - (a.talentSeed || 0))[1];
      c2 = {
        rikishiId: best.candidateId,
        shikona: best.name,
        rank: "Ozeki",
        nationality: best.nationality,
        isChallenger: true,
        seed: 8,
      };
    } else {
      c2 = {
        rikishiId: `challenger_${world.year}_2`,
        shikona: "Estonian Colossus",
        rank: "Ozeki",
        nationality: "Estonia",
        isChallenger: true,
        seed: 8,
      };
    }

    return [...jsaElites, c1, c2];
  },

  /**
   * Phase 1: Initialize the tournament on Day 1 of the year-end tick.
   */
  initializeTournament(world: WorldState): StateImpact {
    const builder = createImpactBuilder("GlobalCupService.initializeTournament");
    const participants = this.selectParticipants(world);

    const bracket: GlobalCupMatch[] = [];
    // Quarterfinals: 1v8, 2v7, 3v6, 4v5
    const pairings = [
      [0, 7],
      [1, 6],
      [2, 5],
      [3, 4],
    ];
    pairings.forEach((pair, i) => {
      bracket.push({
        id: `gc_${world.year}_qf_${i}`,
        round: "quarterfinal",
        matchNumber: i + 1,
        eastRikishiId: participants[pair[0]].rikishiId,
        westRikishiId: participants[pair[1]].rikishiId,
        day: world.dayIndexGlobal,
      });
    });

    const state: GlobalCupState = {
      year: world.year,
      phase: "quarterfinals",
      isActive: true,
      participants,
      bracket,
      startedAtWeek: world.week,
    };

    builder.updateWorldField("globalCup", state);
    builder.logEvent(
      "GLOBAL_CUP_START",
      "narrative",
      {
        incident: `The Worlds Exhibition ${world.year} has begun! 8 elite wrestlers enter the dohyo.`,
      },
      { importance: "headline" }
    );

    return builder.build();
  },

  /**
   * Phase 2 & 3: Advance tournament (process current round, build next).
   */
  advanceTournament(world: WorldState): StateImpact {
    const builder = createImpactBuilder("GlobalCupService.advanceTournament");
    const state = world.globalCup;
    if (!state || !state.isActive) return builder.build();

    const nextBracket = [...state.bracket];
    const currentRound = state.phase;

    // 1. Resolve current matches if not already resolved
    const unresolved = nextBracket.filter(
      (m) =>
        m.round === currentRound.slice(0, -1) ||
        (currentRound === "quarterfinals" && m.round === "quarterfinal") ||
        (currentRound === "semifinals" && m.round === "semifinal") ||
        (currentRound === "finale" && m.round === "final")
    );

    unresolved.forEach((match) => {
      if (match.winnerRikishiId) return;
      const result = this.simulateMatch(world, match);
      match.winnerRikishiId = result.winner === "east" ? match.eastRikishiId : match.westRikishiId;
      match.result = result;
    });

    const getWinner = (m: (typeof unresolved)[number]) => m.winnerRikishiId || "";

    // 2. Transition phase
    if (currentRound === "quarterfinals") {
      // Build Semifinals
      const winners = unresolved.map(getWinner);
      const semis: GlobalCupMatch[] = [
        {
          id: `gc_${world.year}_sf_1`,
          round: "semifinal",
          matchNumber: 1,
          eastRikishiId: winners[0],
          westRikishiId: winners[3],
          day: world.dayIndexGlobal,
        },
        {
          id: `gc_${world.year}_sf_2`,
          round: "semifinal",
          matchNumber: 2,
          eastRikishiId: winners[1],
          westRikishiId: winners[2],
          day: world.dayIndexGlobal,
        },
      ];
      builder.updateWorldField("globalCup", {
        ...state,
        phase: "semifinals",
        bracket: [...nextBracket, ...semis],
      });
    } else if (currentRound === "semifinals") {
      // Build Finale
      const winners = unresolved.map(getWinner);
      const finale: GlobalCupMatch = {
        id: `gc_${world.year}_f`,
        round: "final",
        matchNumber: 1,
        eastRikishiId: winners[0],
        westRikishiId: winners[1],
        day: world.dayIndexGlobal,
      };
      builder.updateWorldField("globalCup", {
        ...state,
        phase: "finale",
        bracket: [...nextBracket, finale],
      });
    } else if (currentRound === "finale") {
      // Complete
      const winnerId = getWinner(unresolved[0]);
      const winner = state.participants.find((p) => p.rikishiId === winnerId);

      this.finalizeTournament(world, builder, winnerId, winner?.shikona || "Unknown");
      builder.updateWorldField("globalCup", {
        ...state,
        phase: "complete",
        isActive: false,
        championId: winnerId,
      });
    }

    return builder.build();
  },

  simulateMatch(world: WorldState, match: GlobalCupMatch): GlobalCupBoutResult {
    const rng = RNGRegistry.getSystemRNG(world, "global_cup", `match_${match.id}`);
    const east = getRikishi(world, match.eastRikishiId);
    const west = getRikishi(world, match.westRikishiId);

    // Simplistic simulation for Global Cup (Option B)
    // In production, this would call the full bout resolver.
    const eastPower = east?.stats?.power ?? 70;
    const westPower = west?.stats?.power ?? 70;
    const total = eastPower + westPower;
    const roll = rng.next() * total;

    return {
      winner: (roll < eastPower ? "east" : "west") as "east" | "west",
      winningKimarite: "yorikiri",
      duration: 12,
    };
  },

  finalizeTournament(
    world: WorldState,
    builder: InstanceType<typeof ImpactBuilder>,
    winnerId: string,
    winnerName: string
  ) {
    builder.logEvent(
      "GLOBAL_CUP_FINALE",
      "narrative",
      {
        winnerId,
        winnerName,
        incident: `The Worlds Exhibition has concluded. ${winnerName} has been crowned the Global Champion of ${world.year}.`,
      },
      { importance: "headline" }
    );

    // History update
    const chronicle = world.chronicle || {
      eraLabels: [],
      topChampions: [],
      greatestRivalries: [],
      recordsBroken: [],
      globalCups: [],
    };
    const historyEntry: GlobalCupHistoryEntry = {
      year: world.year,
      championId: winnerId,
      championName: winnerName,
      participantCount: 8,
      wasPlayerChampion: winnerId === world.playerHeyaId, // Approximation if winner is player rikishi
    };

    builder.updateWorldField("chronicle", {
      ...chronicle,
      globalCups: [...(chronicle.globalCups || []), historyEntry],
    });
  },
};
