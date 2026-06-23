import type { Id } from "../engine/types/common";
import type { MatchSchedule, BashoState, BashoResult } from "../engine/types/basho";
import type { WorldState } from "../engine/types/world";

export interface UIBoutRow {
  boutId: string;
  day: number;
  eastId: Id;
  eastShikona: string;
  eastRank: string;
  eastRankShort: string;
  eastRecord: string;
  westId: Id;
  westShikona: string;
  westRank: string;
  westRankShort: string;
  westRecord: string;
  winner?: "east" | "west";
  kimarite?: string;
  duration?: number;
  isUpset: boolean;
  isKinboshi: boolean;
}

export interface UIBashoSummary {
  year: number;
  bashoNumber: number;
  bashoName: string;
  totalDays: number;
  currentDay: number;
  yushoId?: Id;
  yushoShikona?: string;
  junYushoIds: Id[];
  specialPrizes: {
    shukunSho?: Id;
    kantoSho?: Id;
    ginoSho?: Id;
  };
  isActive: boolean;
}

export function projectBoutRow(m: MatchSchedule, world: WorldState): UIBoutRow {
  const east = world.rikishi.get(m.eastRikishiId);
  const west = world.rikishi.get(m.westRikishiId);

  return {
    boutId: m.boutId,
    day: m.day,
    eastId: m.eastRikishiId,
    eastShikona: east?.shikona ?? "Unknown",
    eastRank: east?.rank ?? "??",
    eastRankShort: east?.rank ? east.rank.charAt(0).toUpperCase() + (east.rankNumber ?? "") : "??",
    eastRecord: east ? `${east.currentBashoWins}-${east.currentBashoLosses}` : "0-0",
    westId: m.westRikishiId,
    westShikona: west?.shikona ?? "Unknown",
    westRank: west?.rank ?? "??",
    westRankShort: west?.rank ? west.rank.charAt(0).toUpperCase() + (west.rankNumber ?? "") : "??",
    westRecord: west ? `${west.currentBashoWins}-${west.currentBashoLosses}` : "0-0",
    winner: m.result?.winner,
    kimarite: m.result?.kimariteName,
    duration: m.result?.duration,
    isUpset: m.result?.upset ?? false,
    isKinboshi: m.result?.isKinboshi ?? false,
  };
}

export function projectBashoSummary(
  state: BashoState,
  result?: BashoResult,
  world?: WorldState
): UIBashoSummary {
  const yushoRikishi = result?.yusho && world ? world.rikishi.get(result.yusho) : undefined;

  return {
    year: state.year,
    bashoNumber: state.bashoNumber,
    bashoName: state.bashoName,
    totalDays: 15,
    currentDay: state.day,
    yushoId: result?.yusho,
    yushoShikona: yushoRikishi?.shikona,
    junYushoIds: result?.junYusho ?? [],
    specialPrizes: {
      shukunSho: result?.shukunsho,
      kantoSho: result?.kantosho,
      ginoSho: result?.ginoSho,
    },
    isActive: state.isActive,
  };
}
