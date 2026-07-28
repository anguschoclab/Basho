import { describe, it, expect } from "vitest";
import { issueGovernanceRuling } from "@/engine/systems/governance/ScandalService";
import { resolveImpacts } from "@/engine/core/ImpactResolver";
import { MockFactory } from "@/tests/helpers/utils/MockFactory";
import type { GovernanceRuling } from "@/engine/types/economy";

function worldWithUnresolvedRuling() {
  const heyaId = "h1";
  const world = MockFactory.createWorld({
    playerHeyaId: heyaId,
    heyas: new Map([[heyaId, MockFactory.createHeya(heyaId)]]),
  });
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
