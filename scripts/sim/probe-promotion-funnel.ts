/**
 * probe-promotion-funnel.ts
 * =========================
 * Short-run probe: which promotion seam starves the sekitori pyramid.
 * Runs the autosim one basho at a time and diffs each rikishi's division
 * across the sheet boundary to count gross promotions/demotions per seam,
 * plus the inert populations (banzuke-gai, maezumo, unranked) that drain
 * the funnel.
 *
 * Run: bun scripts/sim/probe-promotion-funnel.ts [--duration N_years]
 */

import { generateInitialWorld } from "@/engine/generation/WorldFactory";
import { runAutoSim } from "@/engine/simulation/AutoSimService";
import type { WorldState } from "@/engine/types/world";
import type { Division } from "@/engine/types/banzuke";

const SEED = "sim-25yr-diagnostic-v1";
const YEARS = Number(process.argv[process.argv.indexOf("--duration") + 1] ?? 8);

const { BardEngine } = await import("@/engine/bard/BardEngine");
await BardEngine.loadDomains();

const DIV_ORDER: Division[] = [
  "jonokuchi",
  "jonidan",
  "sandanme",
  "makushita",
  "juryo",
  "makuuchi",
];
const divRank = (d: Division) => DIV_ORDER.indexOf(d);

function divisionCounts(world: WorldState): Map<string, number> {
  const m = new Map<string, number>();
  for (const r of world.rikishi.values()) {
    if (r.isRetired) continue;
    m.set(r.division, (m.get(r.division) ?? 0) + 1);
  }
  return m;
}

function inertCounts(world: WorldState): string {
  let gai = 0, maezumo = 0, eph = 0, kyujo = 0;
  for (const r of world.rikishi.values()) {
    if (r.isRetired) continue;
    if (r.isBanzukeGai) gai++;
    if (r.isMaezumo) maezumo++;
    if (r.isEphemeralMaezumo) eph++;
    if (r.isKyujo) kyujo++;
  }
  return `gai=${gai} maezumo=${maezumo} eph=${eph} kyujo=${kyujo}`;
}

let world: WorldState = generateInitialWorld(SEED);
world = { ...world, playerHeyaId: undefined };

let prevDiv = new Map<string, Division>();
for (const r of world.rikishi.values()) prevDiv.set(r.id, r.division);

for (let yr = 0; yr < YEARS; yr++) {
  for (let b = 0; b < 6; b++) {
    const result = runAutoSim(world, {
      duration: { type: "basho", count: 1 },
      stopConditions: [],
      verbosity: "minimal",
      delegationPolicy: "balanced",
      observerMode: true,
    });
    world = result.finalWorld;

    // Gross cross-seam flows this basho.
    let msToJ = 0, jToM = 0, mToJ = 0, jToMs = 0, retirements = 0;
    for (const r of world.rikishi.values()) {
      const before = prevDiv.get(r.id);
      if (before === undefined) continue;
      if (r.isRetired) {
        retirements++;
        continue;
      }
      const after = r.division;
      const delta = divRank(after) - divRank(before);
      if (delta === 0) continue;
      if (before === "makushita" && after === "juryo") msToJ++;
      else if (before === "juryo" && after === "makuuchi") jToM++;
      else if (before === "makuuchi" && after !== "makuuchi") mToJ++;
      else if (before === "juryo" && divRank(after) < divRank("juryo")) jToMs++;
    }
    prevDiv = new Map();
    for (const r of world.rikishi.values()) prevDiv.set(r.id, r.division);

    const c = divisionCounts(world);
    const fmt = (d: string) => String(c.get(d) ?? 0).padStart(3);
    console.log(
      `Y${world.year} B${b + 1} | M=${fmt("makuuchi")} J=${fmt("juryo")} Ms=${fmt("makushita")} ` +
        `Sd=${fmt("sandanme")} Jd=${fmt("jonidan")} Jk=${fmt("jonokuchi")} | ` +
        `Ms→J=${msToJ} J→M=${jToM} M→J=${mToJ} J→Ms=${jToMs} ret=${retirements} | ${inertCounts(world)}`
    );
  }
}
