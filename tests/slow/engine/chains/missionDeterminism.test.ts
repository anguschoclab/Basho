import { describe, it, expect, beforeAll } from "vitest";
import { MockFactory } from "@tests/helpers/utils/MockFactory";
import { tickWeekEventChains } from "@/engine/events/chains/chainService";
import { tickScoutMissions } from "@/engine/recruitment/scoutMissions";
import { resolveImpacts } from "@/engine/core/ImpactResolver";
import { BardEngine } from "@/engine/bard/BardEngine";
import type { WorldState } from "@/engine/types/world";

function baseWorld(): WorldState {
  const heya = MockFactory.createHeya("h1", { funds: 50_000_000 });
  heya.welfareState = { welfareRisk: 20, complianceState: "compliant", weeksInState: 0, morale: 60, activeDiet: "maintenance" };
  const rikishi = Array.from({ length: 8 }, (_, i) =>
    MockFactory.createRikishi(`r${i}`, { heyaId: "h1", division: "makuuchi" })
  );
  return MockFactory.createWorld({
    week: 1,
    playerHeyaId: "h1",
    heyas: new Map([["h1", heya]]),
    rikishi: new Map(rikishi.map((r) => [r.id, r])),
    activeRikishiIds: new Set(rikishi.map((r) => r.id)),
  });
}

function run52(world: WorldState) {
  let w = world;
  for (let week = 1; week <= 52; week++) {
    w = { ...w, week };
    w = resolveImpacts(w, [tickWeekEventChains(w), tickScoutMissions(w)]);
  }
  return {
    decisions: (w.pendingDecisions ?? []).map((d) => `${d.type}:${d.id}`).sort(),
    activeChains: Object.keys(w.activeChains ?? {}).sort(),
    missions: (w.activeScoutMissions ?? []).map((m) => m.id).sort(),
    cooldowns: { ...(w.chainCooldowns ?? {}) },
  };
}

describe("P1/P4 determinism — 52-week same-seed double run", () => {
  beforeAll(async () => {
    await BardEngine.ensureDomains(["chains"]);
  });

  it("identical seeds produce identical chain + mission sequences", () => {
    const a = run52(baseWorld());
    const b = run52(baseWorld());
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
    // The chain engine produced real activity — not a tautological empty run.
    expect(
      a.decisions.length + a.activeChains.length + Object.keys(a.cooldowns).length
    ).toBeGreaterThan(0);
  });
});
