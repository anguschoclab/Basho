/**
 * probe-closure-causes.ts
 * =======================
 * Short-run probe: which succession triggers and roster sizes drive
 * stable closures. Reuses the 25-yr diagnostic harness at a shorter
 * horizon so closure pathology is measurable in minutes.
 *
 * Run: bun scripts/sim/probe-closure-causes.ts [--duration N]
 */

import { generateInitialWorld } from "@/engine/generation/WorldFactory";
import { runAutoSim } from "@/engine/simulation/AutoSimService";
import type { WorldState } from "@/engine/types/world";

const SEED = "sim-25yr-diagnostic-v1";
const YEARS = Number(process.argv[process.argv.indexOf("--duration") + 1] ?? 6);

const { BardEngine } = await import("@/engine/bard/BardEngine");
await BardEngine.loadDomains();

let world: WorldState = generateInitialWorld(SEED);
world = { ...world, playerHeyaId: undefined };
const nextHeyas = new Map(world.heyas);
for (const [heyaId, heya] of nextHeyas) {
  const actual = Array.from(world.rikishi.values())
    .filter((r) => r.heyaId === heyaId && !r.isRetired)
    .map((r) => r.id);
  nextHeyas.set(heyaId, { ...heya, rikishiIds: actual });
}
world = { ...world, heyas: nextHeyas };

for (let yr = 0; yr < YEARS; yr++) {
  const prevClosed = world.closedHeyas?.size ?? 0;
  const result = runAutoSim(world, {
    duration: { type: "years", count: 1 },
    stopConditions: [],
    verbosity: "minimal",
    delegationPolicy: "balanced",
    observerMode: true,
  });
  world = result.finalWorld;
  console.log(`Year ${world.year}: heyas=${world.heyas.size} closed=${world.closedHeyas?.size ?? 0} (+${(world.closedHeyas?.size ?? 0) - prevClosed})`);
}

console.log("\n=== CLOSED HEYAS ===");
for (const rec of world.closedHeyas?.values() ?? []) {
  console.log(
    `  ${rec.name} | closed=${rec.closedAtYear} | reason=${(rec as { closureReason?: string }).closureReason} ` +
      `| roster=${rec.rikishiIds?.length ?? "?"} | band=${rec.prestigeBand}/${rec.statureBand} | funds=${((rec.funds ?? 0) / 1e6).toFixed(1)}M`
  );
}

console.log("\n=== FORCED SUCCESSION TRIGGERS ===");
const triggers: Record<string, number> = {};
for (const ev of world.events?.log ?? []) {
  const inc = (ev.data as { incident?: string }).incident;
  if (inc === "forced_succession" || inc === "stable_closure") {
    const reason = (ev.data as { reason?: string }).reason ?? "?";
    const key = `${inc}: ${reason.slice(0, 60)}`;
    triggers[key] = (triggers[key] ?? 0) + 1;
  }
}
for (const [k, n] of Object.entries(triggers).sort((a, b) => b[1] - a[1])) {
  console.log(`  ${n}× ${k}`);
}
