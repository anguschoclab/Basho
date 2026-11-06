/** hof-check.ts — dump Hall of Fame inductees after 1 year of autosim. */
import { generateInitialWorld } from "@/engine/generation/WorldFactory";
import { runAutoSim } from "@/engine/simulation/AutoSimService";
import type { Rikishi } from "@/engine/types/rikishi";

const { BardEngine } = await import("@/engine/bard/BardEngine");
await BardEngine.loadDomains();

let world = generateInitialWorld(process.argv[2] ?? "sim-25yr-diagnostic-v1");
world = { ...world, playerHeyaId: undefined };

console.log(`worldgen: history entries=${world.history?.length ?? 0}`);
const yushoCounts = new Map<string, number>();
const ginoCounts = new Map<string, number>();
for (const br of world.history ?? []) {
  if (br.yusho) yushoCounts.set(br.yusho, (yushoCounts.get(br.yusho) ?? 0) + 1);
  if (br.ginoSho) ginoCounts.set(br.ginoSho, (ginoCounts.get(br.ginoSho) ?? 0) + 1);
}
console.log(
  `worldgen: champion-eligible(3+ yusho)=${[...yushoCounts.values()].filter((c) => c >= 3).length} technician-eligible(3+ gino)=${[...ginoCounts.values()].filter((c) => c >= 3).length}`
);

// Pre-sim baseline: how many historical rikishi would qualify for iron_man
// (summaries lack careerHistory/stats — the "stats" in r guard mirrors hallOfFame)
const preHist = [...world.historicalRikishi.values()].filter(
  (r): r is Rikishi => "stats" in r
);
const preEligible = preHist.filter(
  (r) =>
    (!r.careerHistory || r.careerHistory.length === 0) &&
    Math.floor(((r.careerWins || 0) + (r.careerLosses || 0)) / 10) >= 30
);
console.log(`pre-sim: historical(full)=${preHist.length} iron-man-eligible(wins/10>=30)=${preEligible.length}`);
console.log(
  `pre-sim: historical with careerHistory>0: ${preHist.filter((r) => (r.careerHistory?.length ?? 0) > 0).length}`
);

const result = runAutoSim(world, {
  duration: { type: "basho", count: 8 },
  stopConditions: [],
  verbosity: "minimal",
  delegationPolicy: "balanced",
  observerMode: true,
});
const fw = result.finalWorld;

const inductees = fw.hallOfFame?.inductees ?? [];
const byCat: Record<string, number> = {};
for (const i of inductees) byCat[i.category] = (byCat[i.category] ?? 0) + 1;
console.log(`post-sim: inductees=${inductees.length} byCategory=${JSON.stringify(byCat)}`);

const postHist = [...fw.historicalRikishi.values()].filter(
  (r): r is Rikishi => "stats" in r
);
const smallHistory = postHist.filter(
  (r) => (r.careerHistory?.length ?? 0) > 0 && (r.careerHistory?.length ?? 0) < 30
);
const eligibleNow = postHist.filter(
  (r) =>
    (!r.careerHistory || r.careerHistory.length === 0) &&
    Math.floor(((r.careerWins || 0) + (r.careerLosses || 0)) / 10) >= 30
);
console.log(
  `post-sim: historical=${postHist.length} with-1..29-row-history=${smallHistory.length} still-eligible=${eligibleNow.length}`
);
for (const r of smallHistory.slice(0, 8)) {
  console.log(
    `  ${r.id} ${r.shikona} wins=${r.careerWins} losses=${r.careerLosses} histRows=${r.careerHistory?.length}`
  );
}
