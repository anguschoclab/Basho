// boutPhaseLoop.ts — Orchestrator for bout physics engine.
// Phase tick handlers have been extracted into the physics/ directory.

import { rngFromSeed, type SeededRNG } from "../rng";
import type { Rikishi } from "../types/rikishi";
import type { BoutResult, BashoState, BoutLogEntry } from "../types/basho";
import type { Side } from "../types/banzuke";
import type { KimariteId } from "../types/combat";
import {
  MAX_BOUT_TICKS,
  POST_RESOLUTION_REVERSAL_CHANCE,
  ISAMIASHI_INSTABILITY_THRESHOLD,
} from "../../constants/engine/physics";
import type { EngineStateV2, EngineSnapshot } from "../types/combat-spatial";
import { type BoutContext } from "./boutUtils";

import { initEngineStateV2 } from "./physics/initState";
import { resolveTachiaiV2 } from "./physics/tachiai";
import { tickPushBattle } from "./physics/tickPushBattle";
import { tickBeltBattle } from "./physics/tickBeltBattle";
import { tickEdgeCrisis } from "./physics/edgeCrisis";
import { buildBoutResultV2, buildEngineSnapshotV2 } from "./physics/resultBuilders";

const MAX_TICKS = MAX_BOUT_TICKS;

function runPhaseLoop(
  rng: SeededRNG,
  east: Rikishi,
  west: Rikishi,
  st: EngineStateV2,
  boutLog: BoutLogEntry[],
  division: import("../types/banzuke").Division,
  meta: { tone: string; drift: Record<string, number> },
  playerTactic?: import("../types/combat").BoutTactic
): { winner: Side; kimarite: KimariteId } {
  // CR-02: Henka may have resolved the bout at tachiai
  if (st.phase.tag === "resolved") {
    return { winner: st.phase.winner, kimarite: st.phase.technique };
  }

  for (let i = 0; i < MAX_TICKS; i++) {
    st.tick++;

    const pushResult = tickPushBattle(rng, east, west, st, boutLog, division, meta, playerTactic);
    if (pushResult?.winner && pushResult?.kimarite) {
      return { winner: pushResult.winner, kimarite: pushResult.kimarite };
    }

    const beltResult = tickBeltBattle(rng, east, west, st, boutLog, division, meta, playerTactic);
    if (beltResult?.winner && beltResult?.kimarite) {
      return { winner: beltResult.winner, kimarite: beltResult.kimarite };
    }

    const crisisResult = tickEdgeCrisis(rng, east, west, st, boutLog);
    if (crisisResult?.winner && crisisResult?.kimarite) {
      return { winner: crisisResult.winner, kimarite: crisisResult.kimarite };
    }
  }

  // Timeout — most stable rikishi wins (smallest cogOffset relative to footSpread)
  const eastInstability = Math.abs(st.east.cogOffset) / Math.max(0.01, st.east.footSpread);
  const westInstability = Math.abs(st.west.cogOffset) / Math.max(0.01, st.west.footSpread);
  const winner: Side = eastInstability <= westInstability ? "east" : "west";

  const hadBelt =
    st.phase.tag === "belt_battle" ||
    (st.phase.tag === "edge_crisis" && st.phase.prev === "belt_battle");
  const kimarite: KimariteId = hadBelt ? "yorikiri" : "oshidashi";

  // CI-05: Rare hi_waza reversals (isamiashi, tsukite)
  // Very rare (1.5% each) post-resolution reversals where "winner" loses due to own mistake
  const loser: Side = winner === "east" ? "west" : "east";
  const loserInstability = winner === "east" ? westInstability : eastInstability;

  // isamiashi: false start - only if loser was very unstable (near falling)
  if (
    loserInstability > ISAMIASHI_INSTABILITY_THRESHOLD &&
    rng.next() < POST_RESOLUTION_REVERSAL_CHANCE
  ) {
    return { winner: loser, kimarite: "isamiashi" };
  }

  // tsukite: missed thrust - only if bout was push-dominant (no belt)
  if (!hadBelt && rng.next() < POST_RESOLUTION_REVERSAL_CHANCE) {
    return { winner: loser, kimarite: "tsukite" };
  }

  return { winner, kimarite };
}

// ---------------------------------------------------------------------------
export function resolveBoutPhysicsImpl(
  bout: BoutContext,
  east: Rikishi,
  west: Rikishi,
  basho: BashoState,
  meta?: { tone: string; drift: Record<string, number> }
): { result: BoutResult; engineSnapshot: EngineSnapshot } {
  const seed = `${basho.id ?? "basho"}-${basho.year ?? 0}-${bout.day}-${east.id}-${west.id}`;
  const rng = rngFromSeed(seed, "bout", "root");

  const st = initEngineStateV2(bout, east, west);
  const boutLog: BoutLogEntry[] = [];
  resolveTachiaiV2(rng, bout, east, west, st, boutLog);

  const effectiveMeta = meta || { tone: "classic", drift: {} };
  const division = east.division || west.division || "makushita";

  const { winner, kimarite } = runPhaseLoop(
    rng,
    east,
    west,
    st,
    boutLog,
    division,
    effectiveMeta,
    bout.playerTactic
  );

  const result = buildBoutResultV2(bout, east, west, st, winner, kimarite, boutLog);
  const engineSnapshot = buildEngineSnapshotV2(st, winner);

  return { result, engineSnapshot };
}
