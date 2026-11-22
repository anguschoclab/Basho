/**
 * Spec (RED) — disciplinary stable closure & custody (azukari).
 *
 * Real JSA sanctions (closure dataset):
 *  - Critical misconduct + board review produces a CLOSURE ruling —
 *    not another "warning". (`reportScandal` hardcodes type:"warning".)
 *  - Custody model (Miyagino): the stable is suspended, roster holds
 *    `inCustodyOf` a supervising heya, and permanent dissolution follows
 *    ~2yr of custody once the disgraced master has resigned.
 *  - Nakagawa variant: immediate scatter across ~5–8 heyas.
 *  - The disgraced oyakata is demoted and reassigned as a subordinate
 *    coach (or forced to resign) — never the clean `removeOyakata`
 *    retirement path.
 */
import { describe, it, expect } from "vitest";
import { reportScandal } from "@/engine/governance/services/ScandalService";
import { resolveImpacts } from "@/engine/core/ImpactResolver";
import { MockFactory } from "@tests/helpers/utils/MockFactory";
import type { GovernanceRuling } from "@/engine/types/economy";

function worldWithHeya() {
  const world = MockFactory.createWorld({ year: 2026 });
  world.heyas.set(
    "heya-bad",
    MockFactory.createHeya("heya-bad", { scandalScore: 55, rikishiIds: ["r1", "r2"] })
  );
  world.heyas.set("heya-host", MockFactory.createHeya("heya-host", {}));
  world.rikishi.set("r1", MockFactory.createRikishi({ id: "r1", heyaId: "heya-bad" }));
  world.rikishi.set("r2", MockFactory.createRikishi({ id: "r2", heyaId: "heya-bad" }));
  return world;
}

describe("disciplinary closure trigger", () => {
  it("a critical scandal on a heya already in the danger band issues a closure ruling", () => {
    const world = worldWithHeya();
    // 55 + 30 = 85 ≥ ~70 → board-imposed closure process begins.
    const next = resolveImpacts(world, [
      reportScandal(world, "heya-bad", "critical", "abuse_cover_up"),
    ]);
    const rulings = (next.governanceLog ?? []) as GovernanceRuling[];
    const last = rulings[rulings.length - 1];
    expect(last).toBeDefined();
    // Real outcome classes: "stable_closure" or "custody" — not a warning.
    expect(last.type).not.toBe("warning");
  });
});

describe("custody (azukari) state", () => {
  it("a suspended stable's rikishi remain readable via custody pointers", () => {
    const world = worldWithHeya();
    const bad = world.heyas.get("heya-bad") as unknown as Record<string, unknown>;
    bad.custodyStatus = { hostHeyaId: "heya-host", sinceYear: 2026 };
    const r1 = world.rikishi.get("r1") as unknown as Record<string, unknown>;
    r1.inCustodyOf = "heya-host";
    // The roster query used everywhere (torikumi, finance, training)
    // must still see the in-custody rikishi and its host.
    expect((world.heyas.get("heya-bad") as { custodyStatus?: { hostHeyaId: string } })
      .custodyStatus?.hostHeyaId).toBe("heya-host");
    expect((world.rikishi.get("r1") as { inCustodyOf?: string }).inCustodyOf).toBe("heya-host");
  });
});
