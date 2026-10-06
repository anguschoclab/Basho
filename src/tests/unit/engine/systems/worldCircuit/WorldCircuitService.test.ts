import { describe, it, expect, vi } from "vitest";
import { WorldCircuitService } from "@/engine/systems/worldCircuit/WorldCircuitService";
import { MockFactory } from "@/tests/helpers/utils/MockFactory";

describe("WorldCircuitService", () => {
  describe("generateYearlyInvitations", () => {
    it("should append invitations to pendingExhibitions", () => {
      const world = MockFactory.createWorld({
        heyas: new Map([["h1", MockFactory.createHeya("h1")]]),
      });
      const impact = WorldCircuitService.generateYearlyInvitations(world, "h1");
      const appends = impact.arrayAppends;
      expect(appends).toBeDefined();
      expect(appends?.some((op) => op.field === "pendingExhibitions")).toBe(true);
    });
  });

  describe("processExhibitionResult", () => {
    it("updates regional presence upon result", () => {
      const heya = MockFactory.createHeya("h1", {
        regionalPresence: { Mongolia: 10 },
      });
      const rikishi = MockFactory.createRikishi("r1", {
        stats: {
          technique: 50,
          speed: 50,
          mental: 50,
          power: 50,
          stamina: 50,
          weight: 150,
          adaptability: 50,
          balance: 50,
          aggression: 50,
          experience: 50,
        },
      });
      const world = MockFactory.createWorld({
        heyas: new Map([["h1", heya]]),
        rikishi: new Map([["r1", rikishi]]),
      });
      const impact = WorldCircuitService.processExhibitionResult(world, "h1", "r1", {
        id: "ex1",
        heyaId: "h1",
        region: "Mongolia",
        prestige: 50,
        expiresAtWeek: 10,
      });
      const updatedHeya = impact.entities?.heyaUpdates?.get("h1");
      expect(updatedHeya).toBeDefined();
      expect(updatedHeya?.regionalPresence?.Mongolia).toBeGreaterThan(10);
    });
  });

  describe("applyStyleDrift", () => {
    it("applies style drift to trainingPhilosophy if presence is above threshold", () => {
      const heya = MockFactory.createHeya("h1", {
        regionalPresence: { Mongolia: 60 },
        trainingPhilosophy: {
          focusBias: "balanced",
          intensityBias: "moderate",
          recruitmentBias: "domestic",
          powerBias: 0,
          techniqueBias: 0,
          speedBias: 0,
        },
      });
      const world = MockFactory.createWorld({
        heyas: new Map([["h1", heya]]),
        settings: { archiveMode: "standard", enableStyleDrift: true },
      });
      const impact = WorldCircuitService.applyStyleDrift(world, "h1");
      const updatedHeya = impact.entities?.heyaUpdates?.get("h1");
      expect(updatedHeya).toBeDefined();
      expect(updatedHeya?.trainingPhilosophy?.speedBias).toBeGreaterThan(0);
      expect(updatedHeya?.trainingPhilosophy?.powerBias).toBeLessThan(0);
    });
  });
});
