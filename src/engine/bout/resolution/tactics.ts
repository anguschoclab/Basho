/**
 * resolution/tactics.ts
 * =====================
 * Per-side tactic resolution for resolveBout: player-side overrides,
 * NPC BoutAI selection, and the legacy cpuTacticOverride mapping.
 */

import type { BoutContext } from "../boutPhysics";
import type { Rikishi } from "../../types/rikishi";
import type { BashoState } from "../../types/basho";
import type { WorldState } from "../../types/world";
import type { Side } from "../../types/banzuke";
import type { BoutTactic } from "../../types/combat";
import { chooseTactic, type BoutAIContext } from "../BoutAI";
import { buildOpponentModel } from "../../npcAI/OpponentModel";
import { getOpponentModel } from "../../npcAI/MemoryStore";
import { rngFromSeed } from "../../rng";

/**
 * Rank-pressure inference for NPC tactic selection.
 * Demotion pressure when make-koshi is confirmed/threatened late in the
 * basho; promotion pressure during a strong late-basho run.
 */
function deriveRankPressure(
  record: { wins: number; losses: number },
  bashoDay: number
): "demotion" | "promotion" | "neutral" {
  if (bashoDay >= 12 && record.losses >= 7) return "demotion";
  if (bashoDay >= 12 && record.wins >= 10) return "promotion";
  return "neutral";
}

/**
 * Choose a contextual tactic for an NPC-controlled side via BoutAI.
 * Feeds chooseTactic with the side's record, rivalry heat, both rikishi's
 * fatigue, the acting heya's learned opponent model (seeded from public
 * history when absent), and rank pressure — all banded/public information.
 * RNG is seeded per bout+side so the draw stream is stable and isolated.
 */
function chooseNpcSideTactic(
  world: WorldState,
  basho: BashoState,
  bout: BoutContext,
  side: Side,
  rikishi: Rikishi,
  opponent: Rikishi,
  rivalryHeat: number
): BoutTactic {
  const record = basho.standings?.get(rikishi.id) ?? { wins: 0, losses: 0 };
  const heya = rikishi.heyaId ? world.heyas?.get(rikishi.heyaId) : undefined;
  const oyakata = heya?.oyakataId ? world.oyakata?.get(heya.oyakataId) : undefined;
  const opponentModel =
    (oyakata?.memory ? getOpponentModel(oyakata.memory, opponent.id) : undefined) ??
    buildOpponentModel(opponent, world.week ?? 0);
  const bashoDay = basho.day ?? bout.day ?? 1;
  const ctx: BoutAIContext = {
    rng: rngFromSeed(world.seed ?? "world", "boutAI", `${basho.id ?? "basho"}:${bout.id}:${side}`),
    bashoDay,
    cpuRecord: { wins: record.wins ?? 0, losses: record.losses ?? 0 },
    rivalryHeat,
    fatigue: rikishi.fatigue,
    opponentFatigue: opponent.fatigue,
    opponentModel,
    rankPressure: deriveRankPressure(record, bashoDay),
    heyaPosture: rikishi.heyaId
      ? world.bashoNpcPosture?.[rikishi.heyaId]
      : undefined,
  };
  return chooseTactic(rikishi, opponent, ctx);
}

interface ResolvedTactics {
  eastTactic: BoutTactic | undefined;
  westTactic: BoutTactic | undefined;
  /** Final bout context with resolved tactics + legacy cpuTacticOverride. */
  ctxFinal: BoutContext;
}

/**
 * Per-side tactic resolution (WS1):
 * - Player side: caller-supplied playerTactic param wins, then bout.playerTactic.
 * - NPC side: explicit per-side ctx field, then legacy cpuTacticOverride,
 *   then a full BoutAI.chooseTactic fed by standings, rivalry, fatigue, and
 *   the acting heya's learned opponent model.
 * - NPC-vs-NPC: both sides get a resolved tactic (legacy cpuTacticOverride
 *   maps to east for back-compat).
 */
export function resolveSideTactics(
  bout: BoutContext,
  east: Rikishi,
  west: Rikishi,
  basho: BashoState,
  playerTactic: BoutTactic | undefined,
  world: WorldState | undefined,
  rivalryHeat: number
): ResolvedTactics {
  let eastTactic: BoutTactic | undefined = bout.eastTactic;
  let westTactic: BoutTactic | undefined = bout.westTactic;
  const playerSide = bout.playerSide;

  if (playerSide === "east" || playerSide === "west") {
    const resolvedPlayerTactic = playerTactic ?? bout.playerTactic;
    if (playerSide === "east") eastTactic = resolvedPlayerTactic ?? eastTactic;
    else westTactic = resolvedPlayerTactic ?? westTactic;

    const npcSide: Side = playerSide === "east" ? "west" : "east";
    const npcRikishi = npcSide === "east" ? east : west;
    const npcOpponent = npcSide === "east" ? west : east;
    const explicit = (npcSide === "east" ? eastTactic : westTactic) ?? bout.cpuTacticOverride;
    const npcTactic =
      explicit ??
      (world
        ? chooseNpcSideTactic(world, basho, bout, npcSide, npcRikishi, npcOpponent, rivalryHeat)
        : undefined);
    if (npcSide === "east") eastTactic = npcTactic;
    else westTactic = npcTactic;
  } else {
    if (!eastTactic) {
      eastTactic =
        bout.cpuTacticOverride ??
        (world
          ? chooseNpcSideTactic(world, basho, bout, "east", east, west, rivalryHeat)
          : undefined);
    }
    if (!westTactic && world) {
      westTactic = chooseNpcSideTactic(world, basho, bout, "west", west, east, rivalryHeat);
    }
  }

  // cpuTacticOverride keeps its legacy meaning on the ctx (non-player side;
  // east when no playerSide) for any consumer still reading it.
  const cpuTacticOverride = playerSide
    ? playerSide === "east"
      ? westTactic
      : eastTactic
    : eastTactic;
  const ctxFinal: BoutContext = {
    ...bout,
    playerTactic,
    eastTactic,
    westTactic,
    cpuTacticOverride,
  };
  return { eastTactic, westTactic, ctxFinal };
}
