import { describe, it, expect } from "vitest";
import { issueGovernanceRuling } from "../../systems/governance/ScandalService";
import { resolveImpacts } from "../../core/ImpactResolver";
import { generateInitialWorld } from "../../systems/generation/WorldFactory";
import type { GovernanceRuling } from "../../types/economy";

function worldWithUnresolvedRuling() {
  const world = generateInitialWorld("gov-cmd-test");
  const heyaId = world.playerHeyaId!;
  const ruling: GovernanceRuling = {
    id: "ruling-1",
    date: "2026-01",
    heyaId,
    type: "fine",
    severity: "medium",
    reason: "test",
    effects: { fineAmount: 1_000_000 },
  };
  return { world: { ...world, governanceLog: [ruling] }, heyaId };
}

describe("issueGovernanceRuling (worker handler target)", () => {
  it("records the player's severity choice on the ruling", () => {
    const { world } = worldWithUnresolvedRuling();
    const impact = issueGovernanceRuling(world, "ruling-1", "harsh");
    const next = resolveImpacts(world, [impact]);
    const ruling = next.governanceLog?.find((r) => r.id === "ruling-1");
    expect(ruling?.playerChoice).toBeDefined();
  });
});
