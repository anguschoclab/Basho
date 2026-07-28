import { describe, it, expect, beforeEach } from "vitest";
import { InfrastructureService } from "@/engine/systems/economy/InfrastructureService";
import * as TalentPoolScouting from "@/engine/systems/generation/TalentPoolScouting";
import { TrainingPhilosophyService } from "@/engine/systems/legacy/TrainingPhilosophyService";
import { MockFactory } from "../../../helpers/utils/MockFactory";
import type { WorldState } from "@/engine/types/world";
import type { Heya } from "@/engine/types/heya";
import type { Id } from "@/engine/types/common";

describe("Phase 5 Depth: Institutional Power & Regional Mastery", () => {
  let mockWorld: WorldState;

  beforeEach(() => {
    mockWorld = MockFactory.createWorld({
      year: 2026,
      week: 1,
      playerHeyaId: "heya_1",
      heyas: new Map<string, Heya>([
        [
          "heya_1",
          MockFactory.createHeya("heya_1", {
            funds: 1000_000_000,
            regionalPresence: { Mongolia: 10, Georgia: 85 },
            trainingPhilosophy: {
              focusBias: "power",
              intensityBias: "grueling",
              recruitmentBias: "domestic",
              transitionProgress: 0,
            },
          }),
        ],
      ]),
      talentPool: {
        candidates: {
          c_1: {
            candidateId: "c_1",
            id: "c_1" as Id,
            name: "Candidate 1",
            nationality: "Mongolia",
            originRegion: "Mongolia",
            visibilityBand: "hidden",
            birthYear: 2006,
            talentSeed: 50,
            weightPotentialKg: 140,
            poolType: "foreign",
            style: "yotsu",
            archetype: "yotsu",
          },
          c_2: {
            candidateId: "c_2",
            id: "c_2" as Id,
            name: "Candidate 2",
            nationality: "Georgia",
            originRegion: "Georgia",
            visibilityBand: "hidden",
            birthYear: 2006,
            talentSeed: 50,
            weightPotentialKg: 140,
            poolType: "foreign",
            style: "oshi",
            archetype: "oshi",
          },
        },
        pools: {
          foreign: {
            candidatesVisible: ["c_1", "c_2"],
            candidatesHidden: [],
            poolType: "foreign",
            visibilityCap: 10,
            hiddenReserveCap: 20,
          },
          high_school: {
            candidatesVisible: [],
            candidatesHidden: [],
            poolType: "high_school",
            visibilityCap: 10,
            hiddenReserveCap: 20,
          },
          university: {
            candidatesVisible: [],
            candidatesHidden: [],
            poolType: "university",
            visibilityCap: 10,
            hiddenReserveCap: 20,
          },
        },
        lastYearlyRefreshYear: 2025,
      },
    });

    // Mock records separately if needed, but WorldState now has proper structures
    mockWorld.history = [
      {
        id: "basho-2025-kyushu",
        year: 2025,
        bashoNumber: 6,
        bashoName: "kyushu",
        yusho: "legend_1" as Id,
        junYusho: ["rival_1" as Id],
        prizes: { yushoAmount: 0, junYushoAmount: 0, specialPrizes: 0 },
        nextBanzuke: {
          year: 2025,
          bashoNumber: 6,
          divisions: {
            makuuchi: {
              division: "makuuchi",
              slots: [],
              assignments: [
                {
                  rikishiId: "legend_1" as Id,
                  position: { rank: "yokozuna", side: "east" },
                },
              ],
            },
            juryo: { division: "juryo", slots: [], assignments: [] },
            makushita: { division: "makushita", slots: [], assignments: [] },
            sandanme: { division: "sandanme", slots: [], assignments: [] },
            jonidan: { division: "jonidan", slots: [], assignments: [] },
            jonokuchi: { division: "jonokuchi", slots: [], assignments: [] },
          },
        },
      },
    ];
  });

  describe("Pillar 1: Foreign Academy Gating", () => {
    it("should prevent building an academy if presence is below 80", () => {
      // Mongolia presence is 10
      const impact = InfrastructureService.startConstruction(
        mockWorld,
        "heya_1",
        "academy_mongolia"
      );
      // Finding log for failed requirements
      const events = impact.events || [];
      const failEvent = events.find(
        (e) =>
          e.type === "CONSTRUCTION_STARTED" &&
          (e.data as { status?: string }).status === "failed_requirements"
      );
      expect(failEvent).toBeDefined();
    });

    it("should allow building an academy if presence is 80 or higher", () => {
      // Georgia presence is 85
      const impact = InfrastructureService.startConstruction(
        mockWorld,
        "heya_1",
        "academy_georgia"
      );
      // Success case
      const events = impact.events || [];
      const successEvent = events.find(
        (e) => e.type === "CONSTRUCTION_STARTED" && !(e.data as { status?: string }).status
      );
      expect(successEvent).toBeDefined();
    });
  });

  describe("Pillar 2: Regional Scouting Gating (Fog of War)", () => {
    it("should hide foreign candidates from regions with low presence (< 40)", () => {
      const visible = TalentPoolScouting.listVisibleCandidates(mockWorld, "foreign");
      // c_1 is Mongolia (10 presence) -> should be hidden
      // c_2 is Georgia (85 presence) -> should be visible
      expect(visible.map((c: { candidateId: string }) => c.candidateId)).not.toContain("c_1");
      expect(visible.map((c: { candidateId: string }) => c.candidateId)).toContain("c_2");
    });
  });

  describe("Pillar 3: Institutional Style Drift", () => {
    it("should gradually transition training philosophy over multiple ticks", () => {
      const heya = mockWorld.heyas.get("heya_1");
      if (!heya) throw new Error("Heya not found");
      let phil = heya.trainingPhilosophy;
      if (!phil) throw new Error("Philosophy not found");

      // Start succession to Scientist (Technique/Scientific)
      const incomingOyakata = MockFactory.createOyakata("new_oyakata" as Id, {
        archetype: "scientist",
      });
      phil = TrainingPhilosophyService.evolveForSuccessor(phil, incomingOyakata);

      expect(phil.transitionProgress).toBe(0);
      expect(phil.targetFocusBias).toBe("technique");

      // Tick 1 (Year 1) -> 25%
      phil = TrainingPhilosophyService.tickPhilosophyDrift(phil);
      expect(phil.transitionProgress).toBe(0.25);
      expect(phil.focusBias).toBe("power"); // Still power

      // Tick 4 (Year 4) -> 100%
      phil = TrainingPhilosophyService.tickPhilosophyDrift(phil); // 0.5
      phil = TrainingPhilosophyService.tickPhilosophyDrift(phil); // 0.75
      phil = TrainingPhilosophyService.tickPhilosophyDrift(phil); // 1.0

      expect(phil.transitionProgress).toBe(1.0);
      expect(phil.focusBias).toBe("technique"); // Finally transitioned
      expect(phil.targetFocusBias).toBeUndefined();
    });
  });
});
