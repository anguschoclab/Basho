/**
 * probe-fund-growth.ts — throwaway probe: where does NPC heya wealth growth come from?
 * Runs the autosim year-by-year and dumps the FinanceCalculator weekly breakdown
 * for the richest / median / poorest heya at each year end, plus roster composition.
 */
import { generateInitialWorld } from "@/engine/generation/WorldFactory";
import { runAutoSim } from "@/engine/simulation/AutoSimService";
import { calculateHeyaWeeklyFinances } from "@/engine/economy/FinanceCalculator";
import { RANK_HIERARCHY } from "@/engine/types/banzuke";
import type { WorldState } from "@/engine/types/world";

const SEED = "sim-25yr-diagnostic-v1";
const YEARS = parseInt(process.argv[2] ?? "10", 10);

const { BardEngine } = await import("@/engine/bard/BardEngine");
await BardEngine.loadDomains();

let world = generateInitialWorld(SEED);
world = { ...world, playerHeyaId: undefined };

function report(w: WorldState, label: string) {
  const rows = [...w.heyas.values()].map((h) => {
    const fin = calculateHeyaWeeklyFinances(h, w);
    const roster = (h.rikishiIds ?? [])
      .map((id) => w.rikishi.get(id))
      .filter((r) => r != null);
    const sekitori = roster.filter((r) => RANK_HIERARCHY[r.rank]?.isSekitori).length;
    return { h, fin, roster: roster.length, sekitori, weeklyNet: fin.revenue - fin.expenses };
  });
  rows.sort((a, b) => a.h.funds - b.h.funds);
  const pick = [rows[0], rows[Math.floor(rows.length / 2)], rows[rows.length - 1]];
  const avg = rows.reduce((s, r) => s + r.h.funds, 0) / rows.length;
  console.log(`\n=== ${label} | heyas=${rows.length} avgFunds=${(avg / 1e6).toFixed(1)}M ===`);
  for (const p of pick) {
    const i = p.fin.income;
    const o = p.fin.outgoings;
    console.log(
      `  ${p.h.name} funds=${(p.h.funds / 1e6).toFixed(1)}M roster=${p.roster} sek=${p.sekitori} ` +
        `koenkai=${p.h.koenkaiBand} prestige=${p.h.prestigeBand}\n` +
        `    income/wk: koenkai=${(i.koenkai / 1e3).toFixed(0)}k jsaSub=${(i.jsaSubsidy / 1e3).toFixed(0)}k ` +
        `sponsor=${(i.sponsorTier / 1e3).toFixed(0)}k grant=${(i.jsaGrant / 1e3).toFixed(0)}k ` +
        `salary=${(i.oyakataSalary / 1e3).toFixed(0)}k | TOTAL=${(p.fin.revenue / 1e3).toFixed(0)}k\n` +
        `    outgo/wk:  fac=${(o.facilityUpkeep / 1e3).toFixed(0)}k staff=${(o.staffUpkeep / 1e3).toFixed(0)}k ` +
        `fixed=${(o.fixedOverhead / 1e3).toFixed(0)}k recr=${(o.recruitment / 1e3).toFixed(0)}k ` +
        `infra=${(o.infrastructureUpkeep / 1e3).toFixed(0)}k | BURN=${(p.fin.expenses / 1e3).toFixed(0)}k ` +
        `| NET/wk=${(p.weeklyNet / 1e3).toFixed(0)}k => ${(p.weeklyNet * 52 / 1e6).toFixed(1)}M/yr`
    );
  }
}

report(world, "year 0 (genesis)");
for (let y = 0; y < YEARS; y++) {
  world = runAutoSim(world, {
    duration: { type: "years", count: 1 },
    stopConditions: [],
    verbosity: "minimal",
    delegationPolicy: "balanced",
    observerMode: true,
  }).finalWorld;
  report(world, `year ${world.year}`);
}
