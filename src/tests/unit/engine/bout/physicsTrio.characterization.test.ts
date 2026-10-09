/**
 * Golden-master characterization for the bout physics trio:
 *   resolveTachiaiV2, tickBeltBattle, tickPushBattle
 *
 * Written BEFORE the Phase-2 split of engine/bout/physics/* and verified to
 * PASS on unmodified code. After the split, snapshots must match byte-for-byte;
 * any drift = behavioral regression.
 *
 * Mutation-bearing APIs: each fn mutates `st`/`boutLog` — we snapshot the
 * resulting state fields + full log + return value across a fixture matrix
 * (archetype pairs × stat spreads × seeds).
 */
import { describe, it, expect } from "vitest";
import { SeededRNG } from "@/engine/rng";
import { resolveTachiaiV2 } from "@/engine/bout/physics/tachiai";
import { tickBeltBattle } from "@/engine/bout/physics/tickBeltBattle";
import { tickPushBattle } from "@/engine/bout/physics/tickPushBattle";
import { initEngineStateV2 } from "@/engine/bout/physics/initState";
import type { BoutContext } from "@/engine/bout/boutUtils";
import type { EngineStateV2 } from "@/engine/types/combat-spatial";
import type { BoutLogEntry } from "@/engine/types/basho";
import type { Rikishi } from "@/engine/types/rikishi";
import { mockRikishi } from "../utils";

function makeBout(overrides: Partial<BoutContext> = {}): BoutContext {
  return {
    id: "bout-char",
    day: 1,
    rikishiEastId: "r-east",
    rikishiWestId: "r-west",
    ...overrides,
  };
}

function stableStateSnapshot(st: EngineStateV2) {
  return {
    tick: st.tick,
    phaseTag: st.phase.tag,
    tachiaiWinner: st.tachiaiWinner,
    momentumScore: st.momentumScore,
    prevDominantSide: st.prevDominantSide,
    inBoutInjury: st.inBoutInjury,
    eastPos: { x: st.east.x, z: st.east.z, vx: st.east.velocityX, vz: st.east.velocityZ },
    westPos: { x: st.west.x, z: st.west.z, vx: st.west.velocityX, vz: st.west.velocityZ },
    grapple: st.grappleState,
  };
}

const meta = { tone: "classic", drift: {} } as const;

/** Run tachiai, then tick whichever battle phase it produced. */
function runBattle(
  seed: string,
  east: Rikishi,
  west: Rikishi,
  ticks: number,
) {
  const bout = makeBout();
  const st = initEngineStateV2(bout, east, west);
  const boutLog: BoutLogEntry[] = [];
  const rng = new SeededRNG(seed);
  resolveTachiaiV2(rng, bout, east, west, st, boutLog);
  const phaseTag = st.phase.tag;

  const results: unknown[] = [];
  for (let i = 0; i < ticks; i++) {
    const r =
      st.phase.tag === "belt_battle"
        ? tickBeltBattle(rng, east, west, st, boutLog, "makuuchi", meta as never)
        : st.phase.tag === "push_battle"
          ? tickPushBattle(rng, east, west, st, boutLog, "makuuchi", meta as never)
          : null;
    results.push(r ?? null);
    if (st.phase.tag === "resolved") break;
  }
  return { phaseTag, st: stableStateSnapshot(st), boutLog, results };
}

type RikishiOverrides = Parameters<typeof mockRikishi>[1];
const MATCHUPS: Array<[label: string, east: RikishiOverrides, west: RikishiOverrides]> = [
  ["balanced-50s", { power: 50, speed: 50, balance: 50, technique: 50 }, { power: 50, speed: 50, balance: 50, technique: 50 }],
  ["power-vs-speed", { power: 90, speed: 30, balance: 60, technique: 40 }, { power: 30, speed: 90, balance: 50, technique: 70 }],
  ["oshi-vs-yotsu", { power: 80, speed: 70, technique: 50, style: "oshi" }, { power: 75, speed: 40, technique: 80, style: "yotsu" }],
];

describe("resolveTachiaiV2 — golden master", () => {
  for (const [label, eOv, wOv] of MATCHUPS) {
    for (const seed of ["tachiai-A", "tachiai-B"]) {
      it(`${label} / ${seed}`, () => {
        const bout = makeBout();
        const east = mockRikishi("r-east", eOv);
        const west = mockRikishi("r-west", wOv);
        const st = initEngineStateV2(bout, east, west);
        const boutLog: BoutLogEntry[] = [];
        resolveTachiaiV2(new SeededRNG(seed), bout, east, west, st, boutLog);
        expect(stableStateSnapshot(st)).toMatchSnapshot();
        expect(boutLog).toMatchSnapshot();
      });
    }
  }
});

describe("battle ticks — golden master (belt or push per tachiai outcome)", () => {
  for (const [label, eOv, wOv] of MATCHUPS) {
    for (const seed of ["battle-A", "battle-B", "battle-C"]) {
      it(`${label} / ${seed}`, () => {
        const east = mockRikishi("r-east", eOv);
        const west = mockRikishi("r-west", wOv);
        const { phaseTag, st, boutLog, results } = runBattle(seed, east, west, 12);
        expect(phaseTag).toMatchSnapshot();
        expect(results).toMatchSnapshot();
        expect(st).toMatchSnapshot();
        expect(
          boutLog.map((e) => e.type ?? (e as { data?: { event?: string } }).data?.event ?? e),
        ).toMatchSnapshot();
      });
    }
  }
});
