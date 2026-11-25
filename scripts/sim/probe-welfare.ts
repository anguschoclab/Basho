/**
 * probe-welfare.ts — what drives welfareRisk to sanction threshold?
 * Runs N years then dumps each heya's compliance state + the delta reasons
 * the weekly calc produces on the final world.
 */
import { generateInitialWorld } from "@/engine/generation/WorldFactory";
import { runAutoSim } from "@/engine/simulation/AutoSimService";
import { calculateWeeklyWelfareDelta } from "@/engine/welfare/WelfareCalculations";
import { ensureHeyaWelfareState } from "@/engine/welfare/WelfareService";

const YEARS = Number(process.argv[2] ?? 4);
const originalWarn = console.warn;
console.warn = () => {};

let world = generateInitialWorld("sim-25yr-diagnostic-v1");
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
  world = runAutoSim(world, {
    duration: { type: "years", count: 1 },
    stopConditions: [],
    verbosity: "minimal",
    delegationPolicy: "balanced",
    observerMode: true,
  }).finalWorld;

  const states = { compliant: 0, watch: 0, investigation: 0, sanctioned: 0 };
  for (const h of world.heyas.values()) {
    states[h.welfareState?.complianceState ?? "compliant"]++;
  }
  const risks = Array.from(world.heyas.values())
    .map((h) => h.welfareState?.welfareRisk ?? -1)
    .sort((a, b) => b - a);
  console.log(
    `Y${world.year} heyas=${world.heyas.size} states=${JSON.stringify(states)} topRisk=[${risks.slice(0, 6).join(",")}]`
  );
}

// Final-world reason audit: what does the delta calc attribute on each heya?
console.log("\n=== Delta reasons on final world ===");
const reasonCount = new Map<string, number>();
const byState: Record<string, { n: number; deltaSum: number }> = {};
for (const heya of world.heyas.values()) {
  const state = ensureHeyaWelfareState(heya);
  const { delta, reasons } = calculateWeeklyWelfareDelta(world, heya, state);
  const cs = heya.welfareState?.complianceState ?? "compliant";
  const bucket = (byState[cs] ??= { n: 0, deltaSum: 0 });
  bucket.n++;
  bucket.deltaSum += delta;
  for (const r of reasons) {
    const key = r.replace(/[+-]\d+$/, "");
    reasonCount.set(key, (reasonCount.get(key) ?? 0) + 1);
  }
  if ((heya.welfareState?.welfareRisk ?? 0) > 40 || cs === "sanctioned") {
    console.log(
      `  ${cs.padEnd(13)} risk=${heya.welfareState?.welfareRisk} d=${delta} ${heya.name.padEnd(20)} [${reasons.join(", ")}]`
    );
  }
}
console.log("\nReason frequency:", [...reasonCount.entries()].sort((a, b) => b[1] - a[1]));
console.log("Delta avg by state:", Object.fromEntries(Object.entries(byState).map(([k, v]) => [k, (v.deltaSum / v.n).toFixed(1)])));
console.warn = originalWarn;
