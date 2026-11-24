/**
 * probe-unknown-champs.ts — catch "Unknown" chronicle champions and diagnose
 * where their rikishiId lives (active / historical / nowhere / oyakata).
 * Reproduces the 25-yr sim's per-year runAutoSim loop on a shorter horizon.
 */
import { runAutoSim } from "@/engine/simulation/AutoSimService";
import { generateInitialWorld } from "@/engine/generation/WorldFactory";
import { isRetiredRikishiSummaryEntry } from "@/engine/core/queries";

const SEED = 20240115;
const YEARS = 12;

const { BardEngine } = await import("@/engine/bard/BardEngine");
await BardEngine.loadDomains();

let world = generateInitialWorld(String(SEED));
world = { ...world, playerHeyaId: undefined };
const nextHeyas = new Map(world.heyas);
for (const [heyaId, heya] of nextHeyas) {
  const ids = Array.from(world.rikishi.values())
    .filter((r) => r.heyaId === heyaId && !r.isRetired)
    .map((r) => r.id);
  nextHeyas.set(heyaId, { ...heya, rikishiIds: ids });
}
world = { ...world, heyas: nextHeyas };

for (let yr = 0; yr < YEARS; yr++) {
  const result = runAutoSim(world, {
    duration: { type: "years", count: 1 },
    stopConditions: [],
    verbosity: "minimal",
    delegationPolicy: "balanced",
    observerMode: true,
  });
  world = result.finalWorld;
  for (const c of result.chronicle.topChampions) {
    if (c.shikona !== "Unknown") continue;
    const active = world.rikishi.get(c.rikishiId);
    const hist = world.historicalRikishi?.get(c.rikishiId);
    const oya = world.oyakata?.get(c.rikishiId);
    const oyaByFormer = [...(world.oyakata?.values() ?? [])].find(
      (o) => (o as { formerRikishiId?: string }).formerRikishiId === c.rikishiId
    );
    console.log(
      `Y${world.year} UNKNOWN champion ${c.rikishiId} wins=${c.yushoCount} best=${c.bestRank} | ` +
        `active=${!!active} hist=${hist ? (isRetiredRikishiSummaryEntry(hist) ? "summary" : "full") : "no"} ` +
        `oyakata=${!!oya} oyaByFormer=${oyaByFormer?.id ?? "no"}`
    );
    if (hist && !isRetiredRikishiSummaryEntry(hist)) {
      console.log(`   hist entry keys: ${Object.keys(hist).slice(0, 20).join(",")}`);
    }
  }
}
console.log("done");
