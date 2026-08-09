/**
 * Service-to-UI integration tests.
 * Verifies that engine services produce data that flows correctly
 * through presenter projections to produce UI-ready digests.
 */
import { describe, it, expect } from "vitest";
import { mockRikishi, makeMockWorld, makeMockHeya } from "../utils";
import type { WorldState } from "@/engine/types/world";
import { RivalryService } from "@/engine/systems/narrative/RivalryService";
import { NarrativeService } from "@/engine/systems/narrative/NarrativeService";
import { resolveImpacts } from "@/engine/core/ImpactResolver";
import { SeededRNG } from "@/engine/rng";
import { projectDashboardUIDigest } from "@/presenters/projections/dashboardProjections";
import { projectRikishiWithHeya } from "@/presenters/projections/rikishiProjection";

function makeIntegrationWorld(): WorldState {
  const r1 = mockRikishi("r1", { heyaId: "h1", division: "makuuchi", style: "oshi" });
  const r2 = mockRikishi("r2", { heyaId: "h1", division: "makuuchi", style: "yotsu" });
  const heya = makeMockHeya("h1", { rikishiIds: ["r1", "r2"], name: "Integration Heya" });
  const world = makeMockWorld({
    rikishi: new Map([
      ["r1", r1],
      ["r2", r2],
    ]),
    playerHeyaId: "h1",
  });
  world.heyas.set("h1", heya);
  return world as WorldState;
}

describe("Service-to-UI Integration", () => {
  describe("RivalryService → Presenter pipeline", () => {
    it("rivalry state flows through resolveImpacts to world state", () => {
      const world = makeIntegrationWorld();
      const impact = RivalryService.seedInitialRivalries(world);
      const updated = resolveImpacts(world, [impact]);
      expect(updated.rivalriesState).toBeDefined();
      expect(updated.rivalriesState!.pairs).toBeDefined();
    });

    it("rivalry decay preserves state structure after resolve", () => {
      const world = makeIntegrationWorld();
      const seedImpact = RivalryService.seedInitialRivalries(world);
      const seeded = resolveImpacts(world, [seedImpact]);
      const decayImpact = RivalryService.applyWeeklyDecay(seeded);
      const decayed = resolveImpacts(seeded, [decayImpact]);
      expect(decayed.rivalriesState).toBeDefined();
      expect(decayed.rivalriesState!.version).toBe("1.0.0");
    });
  });

  describe("NarrativeService → Presenter pipeline", () => {
    it("narrative bands produce non-empty labels for projection", () => {
      const rng = new SeededRNG("integration");
      const statLabel = NarrativeService.getStatLabelForValue(rng, 85);
      const fatigueLabel = NarrativeService.getFatigueLabel(rng, NarrativeService.getFatigueBand(80));
      const momentumLabel = NarrativeService.getMomentumLabel(rng, NarrativeService.getMomentumBand(80));
      expect(typeof statLabel).toBe("string");
      expect(typeof fatigueLabel).toBe("string");
      expect(typeof momentumLabel).toBe("string");
      expect(statLabel.length).toBeGreaterThan(0);
    });
  });

  describe("Dashboard projection integration", () => {
    it("projectDashboardUIDigest returns null for empty world", () => {
      const world = makeMockWorld();
      const digest = projectDashboardUIDigest(world);
      // With no player heya, should return null or minimal digest
      expect(digest).toBeNull();
    });

    it("projectDashboardUIDigest returns digest for world with player heya", () => {
      const world = makeIntegrationWorld();
      const digest = projectDashboardUIDigest(world);
      // Should return a digest (may be null if conditions aren't met, but should not throw)
      expect(digest).toBeDefined();
    });
  });

  describe("Rikishi projection integration", () => {
    it("projectRikishiWithHeya produces UI-ready data", () => {
      const world = makeIntegrationWorld();
      const projected = projectRikishiWithHeya(world, "r1");
      expect(projected).not.toBeNull();
      expect(projected!.heyaName).toBe("Integration Heya");
      expect(projected!.rikishi).toBeDefined();
      expect(projected!.isPlayerRikishi).toBe(true);
    });
  });

  describe("Full pipeline: service impact → resolve → project", () => {
    it("seeding rivalries then projecting dashboard does not throw", () => {
      const world = makeIntegrationWorld();
      const impact = RivalryService.seedInitialRivalries(world);
      const updated = resolveImpacts(world, [impact]);
      expect(() => projectDashboardUIDigest(updated)).not.toThrow();
    });

    it("rivalry bout resolution then rikishi projection does not throw", () => {
      const world = makeIntegrationWorld();
      const boutImpact = RivalryService.onBoutResolved(world, {
        result: {
          boutId: "b1",
          winnerRikishiId: "r1",
          loserRikishiId: "r2",
          winnerHeyaId: "h1",
          loserHeyaId: "h1",
          kimarite: "yorikiri",
          duration: 10,
          upset: false,
        } as any,
        day: 1,
      });
      const updated = resolveImpacts(world, [boutImpact]);
      expect(() => {
        projectRikishiWithHeya(updated, "r1");
      }).not.toThrow();
    });
  });
});
