/**
 * dup-boutid-interactive-probe.ts — drives the INTERACTIVE path the e2e
 * golden-path uses: startBasho → advanceBashoDay → simulateBoutForToday /
 * simulateBoutsForDay, checking basho.matches for duplicate boutIds per day.
 *
 * Run: bun scripts/sim/dup-boutid-interactive-probe.ts [seed]
 */
import { generateInitialWorld } from "@/engine/generation/WorldFactory";
import { advanceDaysFast } from "@/engine/tick/tickDaily";
import { startBasho, advanceBashoDay, simulateBoutForToday, simulateBoutsForDay } from "@/engine/core/world";
import { BardEngine } from "@/engine/bard/BardEngine";

const SEED = process.argv[2] ?? "dup-boutid-interactive-v1";

await BardEngine.loadDomains();
let world = generateInitialWorld(SEED);
const firstHeya = world.heyas.keys().next().value;
world = { ...world, playerHeyaId: firstHeya };

// Walk to pre_basho so startBasho is legal
let guard = 0;
while (world.cyclePhase !== "pre_basho" && guard++ < 40) {
  world = advanceDaysFast(world, 1, { autonomous: true });
}

for (let bashoNum = 0; bashoNum < 3; bashoNum++) {
  world = startBasho(world, world.currentBashoName);
  for (let day = 1; day <= 15; day++) {
    const b = world.currentBasho;
    if (!b) break;

    const ids = new Map<string, number>();
    for (const m of b.matches) if (m.day === b.day) ids.set(m.boutId, (ids.get(m.boutId) ?? 0) + 1);
    for (const [id, n] of ids) {
      if (n > 1) {
        const ms = b.matches.filter((m) => m.boutId === id);
        console.log(
          `DUP ${b.bashoName} y${b.year} day=${b.day}: ${id} x${n}` +
            ms.map((m) => ` [res=${m.result ? "y" : "n"} callup=${m.crossDivisionCallupId ?? "-"}]`).join("")
        );
      }
    }

    // Mix: sim half the card singly, then the batch path — mirrors the UI.
    const todays = b.matches.filter((m) => m.day === b.day && !m.result);
    const half = Math.ceil(todays.length / 2);
    for (let i = 0; i < half; i++) {
      const r = simulateBoutForToday(world, 0, undefined);
      world = r.world;
    }
    world = simulateBoutsForDay(world).world;

    if ((world.currentBasho?.day ?? 0) >= 15) break;
    world = advanceBashoDay(world);
  }

  // back to pre_basho for the next basho
  guard = 0;
  while (world.cyclePhase !== "pre_basho" && guard++ < 120) {
    world = advanceDaysFast(world, 1, { autonomous: true });
  }
  if (world.cyclePhase !== "pre_basho") break;
}
console.log("done");
