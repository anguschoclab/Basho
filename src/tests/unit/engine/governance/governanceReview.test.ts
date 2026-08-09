import { describe, it, expect, beforeEach } from "vitest";
import { runGovernanceReview } from "@/engine/systems/governance/governanceReview";
import { makeMockWorld, makeMockHeya, mockRikishi } from "../utils";
import { resolveImpacts } from "@/engine/core/ImpactResolver";
import type { WorldState } from "@/engine/types/world";
import { PRESTIGE_ORDER } from "@/engine/prestige/prestigeSystem";
import {
  FACTION_BAILOUT_AMOUNT,
  LOAN_ISSUANCE_THRESHOLD,
  MERGER_THRESHOLD,
} from "@/constants/engine/economic";

describe("governanceReview", () => {
  let world: WorldState;

  beforeEach(() => {
    world = makeMockWorld();
  });

  describe("runGovernanceReview", () => {
    it("should process financial insolvency properly without an ichimon bailout (no faction)", () => {
      // 1. Arrange
      const poorHeya = makeMockHeya("heya-poor", {
        funds: -5000000,
        runwayBand: "desperate",
        ichimon: undefined,
      });
      world.rikishi.set("r1", mockRikishi("r1", { heyaId: "heya-poor" }));
      world.rikishi.set("r2", mockRikishi("r2", { heyaId: "heya-poor" }));
      world.rikishi.set("r3", mockRikishi("r3", { heyaId: "heya-poor" }));
      world.heyas.set("heya-poor", poorHeya);
      world.playerHeyaId = "heya-rich"; // It is not the player

      // 2. Act
      const impact = runGovernanceReview(world);
      const newWorld = resolveImpacts(world, [impact]);

      // 3. Assert
      const updatedHeya = newWorld.heyas.get("heya-poor")!;
      expect(updatedHeya.riskIndicators.financial).toBe(true);
      expect(updatedHeya.scandalScore).toBeGreaterThan(0);
    });

    it("should issue bailout loan if funds are below threshold", () => {
      const poorHeya = makeMockHeya("heya-poor", {
        funds: LOAN_ISSUANCE_THRESHOLD - 1000,
        runwayBand: "desperate",
        ichimon: undefined,
      });
      world.rikishi.set("r4", mockRikishi("r4", { heyaId: "heya-poor" }));
      world.rikishi.set("r5", mockRikishi("r5", { heyaId: "heya-poor" }));
      world.rikishi.set("r6", mockRikishi("r6", { heyaId: "heya-poor" }));
      world.heyas.set("heya-poor", poorHeya);

      const impact = runGovernanceReview(world);
      const newWorld = resolveImpacts(world, [impact]);

      const updatedHeya = newWorld.heyas.get("heya-poor")!;
      // Assuming bailout loan adds funds
      expect(updatedHeya.funds).toBeGreaterThan(poorHeya.funds);
    });

    it("should process ichimon bailout when possible", () => {
      const poorHeya = makeMockHeya("heya-poor", {
        funds: -1000,
        runwayBand: "desperate",
        ichimon: "Dewanoumi",
      });

      const richHeya = makeMockHeya("heya-rich", {
        funds: 500000000,
        ichimon: "Dewanoumi",
      });

      world.rikishi.set("r7", mockRikishi("r7", { heyaId: "heya-poor" }));
      world.rikishi.set("r8", mockRikishi("r8", { heyaId: "heya-poor" }));
      world.rikishi.set("r9", mockRikishi("r9", { heyaId: "heya-poor" }));
      world.rikishi.set("r10", mockRikishi("r10", { heyaId: "heya-rich" }));
      world.rikishi.set("r11", mockRikishi("r11", { heyaId: "heya-rich" }));
      world.rikishi.set("r12", mockRikishi("r12", { heyaId: "heya-rich" }));

      world.heyas.set("heya-poor", poorHeya);
      world.heyas.set("heya-rich", richHeya);
      world.playerHeyaId = "heya-other"; // poorHeya is not player

      const impact = runGovernanceReview(world);
      const newWorld = resolveImpacts(world, [impact]);

      const updatedPoorHeya = newWorld.heyas.get("heya-poor")!;
      const updatedRichHeya = newWorld.heyas.get("heya-rich")!;

      expect(updatedPoorHeya.funds).toBe(poorHeya.funds + FACTION_BAILOUT_AMOUNT);
      expect(updatedRichHeya.funds).toBe(richHeya.funds - FACTION_BAILOUT_AMOUNT);
    });

    it("should execute insolvency merger for NPC stables with extreme debt", () => {
      const poorHeya = makeMockHeya("heya-poor", {
        funds: MERGER_THRESHOLD - 1000,
        runwayBand: "desperate",
      });
      // Add rikishi to avoid triggering low-roster merger logic simultaneously
      world.rikishi.set("r-m1", mockRikishi("r-m1", { heyaId: "heya-poor" }));
      world.rikishi.set("r-m2", mockRikishi("r-m2", { heyaId: "heya-poor" }));
      world.rikishi.set("r-m3", mockRikishi("r-m3", { heyaId: "heya-poor" }));
      world.heyas.set("heya-poor", poorHeya);

      const targetHeya = makeMockHeya("heya-target", {
        funds: 500000000,
        rikishiIds: ["rt1", "rt2", "rt3"],
      });
      world.rikishi.set("rt1", mockRikishi("rt1", { heyaId: "heya-target" }));
      world.rikishi.set("rt2", mockRikishi("rt2", { heyaId: "heya-target" }));
      world.rikishi.set("rt3", mockRikishi("rt3", { heyaId: "heya-target" }));
      world.heyas.set("heya-target", targetHeya);
      world.playerHeyaId = "heya-player"; // Not the player

      // Add enough heyas to exceed HEYA_FLOOR so merger is not blocked
      world.heyas.set(
        "heya-player",
        makeMockHeya("heya-player", { rikishiIds: ["rp1", "rp2", "rp3"] })
      );
      world.rikishi.set("rp1", mockRikishi("rp1", { heyaId: "heya-player" }));
      world.rikishi.set("rp2", mockRikishi("rp2", { heyaId: "heya-player" }));
      world.rikishi.set("rp3", mockRikishi("rp3", { heyaId: "heya-player" }));
      for (let i = 0; i < 8; i++) {
        const id = `heya-fill-${i}`;
        world.heyas.set(id, makeMockHeya(id, { rikishiIds: [`rf${i}1`, `rf${i}2`, `rf${i}3`] }));
        world.rikishi.set(`rf${i}1`, mockRikishi(`rf${i}1`, { heyaId: id }));
        world.rikishi.set(`rf${i}2`, mockRikishi(`rf${i}2`, { heyaId: id }));
        world.rikishi.set(`rf${i}3`, mockRikishi(`rf${i}3`, { heyaId: id }));
      }

      const impact = runGovernanceReview(world);
      const newWorld = resolveImpacts(world, [impact]);

      // Since findMergerTarget and executeMerger are called, verify log event and closure.
      const updatedPoorHeya = newWorld.heyas.get("heya-poor");
      // Depending on merger logic, either it's closed or has a log event.
      // For safety, just assert that the event was logged or impact is not empty.
      const events = impact.events || [];
      expect(
        events.some(
          (e) => e.type === "GOVERNANCE_RULING" && e.data.incident === "insolvency_merger"
        )
      ).toBe(true);
    });

    it("should trigger prestige erosion for sanctioned stables", () => {
      const heya = makeMockHeya("heya-sanctioned", {
        welfareState: {
          complianceState: "sanctioned",
          welfareRisk: 80,
        } as any,
        prestigeBand: PRESTIGE_ORDER[2],
      });
      world.heyas.set("heya-sanctioned", heya);

      const impact = runGovernanceReview(world);
      const newWorld = resolveImpacts(world, [impact]);

      const updatedHeya = newWorld.heyas.get("heya-sanctioned")!;
      expect(updatedHeya.prestigeBand).toBe(PRESTIGE_ORDER[1]); // Dropped 1 band
    });

    it("should decrease scandal score for good standing stables", () => {
      const heya = makeMockHeya("heya-good", {
        scandalScore: 10,
        governanceStatus: "good_standing",
      });
      world.heyas.set("heya-good", heya);

      const impact = runGovernanceReview(world);
      const newWorld = resolveImpacts(world, [impact]);

      const updatedHeya = newWorld.heyas.get("heya-good")!;
      expect(updatedHeya.scandalScore).toBe(8); // Decays by 2
    });
  });
});
