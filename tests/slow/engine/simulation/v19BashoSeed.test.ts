import { describe, it, expect, vi } from "vitest";
import { MockFactory } from "@tests/helpers/utils/MockFactory";

// ── S5-4: AutoSim bashoSeed must disambiguate repeat names ───────────────
// `seed-basho-${year}-${name}` mints the identical seed when a same-named
// basho runs twice in a year (e.g. world without currentBashoName defaults to
// "hatsu" every iteration). Fold a serial into the label.
// Lives in the slow suite: noSubprocessInUnitTests bans runAutoSim from
// src/tests/unit. simulateEntireBasho is mocked so the pin itself is fast.
describe("S5-4 — AutoSim bashoSeed uniqueness", () => {
  it("never reuses a bashoSeed within a run", async () => {
    vi.resetModules();
    const seeds: string[] = [];
    vi.doMock("@/engine/simulation/TournamentSimulator", () => ({
      simulateEntireBasho: (w: unknown, _n: string, seed: string) => {
        seeds.push(seed);
        return { finalWorld: w, yushoWinner: { id: null }, standings: new Map() };
      },
    }));
    const { runAutoSim } = await import("@/engine/simulation/AutoSimService");
    const world = MockFactory.createWorld({ year: 2024, seed: "s5-4" });
    delete (world as { currentBashoName?: string }).currentBashoName;
    runAutoSim(world, {
      duration: { type: "basho", count: 2 },
      verbosity: "minimal",
      stopConditions: [],
    } as never);
    expect(seeds).toHaveLength(2);
    expect(new Set(seeds).size).toBe(2);
    vi.doUnmock("@/engine/simulation/TournamentSimulator");
  });
});
