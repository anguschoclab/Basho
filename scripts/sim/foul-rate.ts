/**
 * foul-rate.ts
 * ============
 * Measure kinjite foul-review rates through the production bout path:
 * resolves N bouts via `resolveBout` against a generated world (real
 * shimpan/gyoji pools), the same call the interactive basho-day pipeline
 * makes. Reports suspected/confirmed/cleared review rates, hansoku share,
 * and the foul-type distribution.
 *
 * NOTE: `simulateBout`/`runAutoSim` (worldless fast path) is intentionally
 * foul-free — this script measures the world-aware production path where
 * foul reviews actually occur.
 *
 * Run: bun scripts/sim/foul-rate.ts [bouts] [seed]
 */

import { generateInitialWorld } from "@/engine/generation/WorldFactory";
import { resolveBout } from "@/engine/bout/boutResolver";
import type { Rikishi } from "@/engine/types/rikishi";

const BOUTS = Number(process.argv[2]) || 3000;
const seed = process.argv[3] ?? "foul-rate-seed";

const { BardEngine } = await import("@/engine/bard/BardEngine");
await BardEngine.loadDomains();

const world = generateInitialWorld(seed);
console.log(`shimpan pool: ${world.shimpanPool?.length ?? 0}, gyoji pool: ${world.gyojiPool?.length ?? 0}`);

const rikishi = [...world.rikishi.values()].filter((r: Rikishi) => !r.injured);
const basho = {
  id: "foul-rate-basho",
  bashoName: "hatsu" as const,
  year: 2026,
  day: 8,
  matches: [],
  standings: new Map(),
  isActive: true,
};

let reviews = 0;
let confirmed = 0;
let cleared = 0;
let hansoku = 0;
let monoii = 0;
const kinds = new Map<string, number>();

for (let i = 0; i < BOUTS; i++) {
  const east = rikishi[(i * 2) % rikishi.length];
  const west = rikishi[(i * 2 + 1) % rikishi.length];
  const bout = {
    id: `foul-rate-${i}`,
    day: 8,
    rikishiEastId: east.id,
    rikishiWestId: west.id,
  };
  const { result } = resolveBout(bout, east, west, basho as never, undefined, world);
  if (result.monoii) monoii++;
  if (result.foulReview) {
    reviews++;
    if (result.foulReview.confirmed) confirmed++;
    else cleared++;
    kinds.set(result.foulReview.foul, (kinds.get(result.foulReview.foul) ?? 0) + 1);
  }
  if (result.kimarite === "hansoku") hansoku++;
}

console.log(`\nBouts resolved:  ${BOUTS} (production resolveBout + real officials pool)`);
console.log(`Mono-ii total:   ${monoii}`);
console.log(`Foul reviews:    ${reviews} (${((reviews / BOUTS) * 100).toFixed(2)}%/bout)`);
console.log(`  confirmed:     ${confirmed} → hansoku flip`);
console.log(`  cleared:       ${cleared} → call stands`);
console.log(`hansoku bouts:   ${hansoku} (${((hansoku / BOUTS) * 100).toFixed(2)}%/bout)`);
console.log(`foul kinds:      ${JSON.stringify(Object.fromEntries(kinds))}`);
