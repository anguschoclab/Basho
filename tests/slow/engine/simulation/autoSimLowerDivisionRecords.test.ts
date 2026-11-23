import { describe, it, expect } from "vitest";
import { runAutoSim } from "@/engine/simulation/AutoSimService";
import { generateInitialWorld } from "@/engine/generation/WorldFactory";
import { getTotalBashodays } from "@/engine/calendar/scheduleHelpers";

/**
 * Regression — sim-published banzuke must carry lower-division results.
 *
 * `simulateEntireBasho` resolves every division's card and keeps the full
 * standings on `finalWorld.currentBasho.standings`, but its return-map
 * `standings` is sekitori-only. `publishBanzukeForSim` previously wrote the
 * sekitori-only map back over `currentBasho.standings`, so every
 * makushita-and-below rikishi read as absent: synthesized 0-0-divisionDays
 * rows, zero career wins, mass banzuke-gai exile, and a permanently zero
 * Ms→J promotion flow.
 */
describe("runAutoSim — lower-division records", () => {
  it("records real results for all divisions, not synthesized absences", () => {
    const world = generateInitialWorld("lower-division-records-001");
    const result = runAutoSim(world, {
      duration: { type: "basho", count: 1 },
      stopConditions: ["never"],
      verbosity: "minimal",
      delegationPolicy: "balanced",
      observerMode: true,
    });
    expect(result.bashoSimulated).toBe(1);

    const finalWorld = result.finalWorld;
    const lowerDivs = new Set(["makushita", "sandanme", "jonidan", "jonokuchi"]);

    // Every lower-division banzuke member who entered the basho should have a
    // career entry — and the overwhelming majority should have fought (real
    // W/L), not a synthesized full-absence row. Pre-existing kyujo and
    // mid-basho withdrawals keep the honest minority below 100%.
    let lowerOnSheet = 0;
    let lowerWithRealRecord = 0;
    for (const r of finalWorld.rikishi.values()) {
      if (r.isRetired || !lowerDivs.has(r.division)) continue;
      const last = r.careerHistory?.[r.careerHistory.length - 1];
      if (!last) continue;
      lowerOnSheet++;
      const divisionDays = getTotalBashodays(r.division);
      const fought = (last.wins ?? 0) + (last.losses ?? 0) + (last.draws ?? 0);
      if (fought > 0 || (last.absences ?? 0) < divisionDays) {
        lowerWithRealRecord++;
      }
    }

    expect(lowerOnSheet).toBeGreaterThan(50);
    // At least 80% of lower-division entrants must have real bout results —
    // matches the tick-path behavior where only genuine absences synthesize.
    expect(lowerWithRealRecord / lowerOnSheet).toBeGreaterThan(0.8);

    // The sekitori feed must be able to fire: at least one makushita rikishi
    // in the Ms1–15 promotion zone carrying a kachi-koshi record.
    const promotableMakushita = Array.from(finalWorld.rikishi.values()).filter(
      (r) =>
        !r.isRetired &&
        r.division === "makushita" &&
        (r.careerHistory?.[r.careerHistory.length - 1]?.wins ?? 0) >
          (r.careerHistory?.[r.careerHistory.length - 1]?.losses ?? 0)
    );
    expect(promotableMakushita.length).toBeGreaterThan(0);
  }, 300_000);
});
