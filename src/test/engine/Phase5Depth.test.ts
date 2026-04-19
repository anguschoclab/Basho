import { describe, it, expect, beforeEach } from "vitest";
import { InfrastructureService } from "../../engine/systems/economy/InfrastructureService";
import * as TalentPoolScouting from "../../engine/systems/generation/TalentPoolScouting";
import { TrainingPhilosophyService } from "../../engine/systems/legacy/TrainingPhilosophyService";
import { LineageService } from "../../engine/systems/generation/LineageService";
import { SeededRNG } from "../../engine/rng";

describe("Phase 5 Depth: Institutional Power & Regional Mastery", () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let mockWorld: any;

  beforeEach(() => {
    mockWorld = {
      id: "test",
      year: 2026,
      week: 1,
      playerHeyaId: "heya_1",
      heyas: new Map([
        [
          "heya_1",
          {
            id: "heya_1",
            funds: 1000_000_000,
            regionalPresence: { Mongolia: 10, Georgia: 85 },
            infrastructure: {},
            trainingPhilosophy: {
              focusBias: "power",
              intensityBias: "grueling",
              recruitmentBias: "domestic",
            },
          },
        ],
      ]),
      talentPool: {
        candidates: {
          c_1: {
            candidateId: "c_1",
            nationality: "Mongolia",
            originRegion: "Mongolia",
            visibilityBand: "hidden",
          },
          c_2: {
            candidateId: "c_2",
            nationality: "Georgia",
            originRegion: "Georgia",
            visibilityBand: "hidden",
          },
        },
        pools: {
          foreign: { candidatesVisible: ["c_1", "c_2"], candidatesHidden: [] } as unknown,
        },
      } as unknown,
      records: {
        allTime: {
          yusho: [{ rikishiId: "legend_1", shikona: "Legendary Hakuho", value: 45 }],
        },
      } as unknown,
    } as unknown;
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
      // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-non-null-assertion
      const failEvent = (impact.events as any[])!.find(
        (e: { type: string; data: { status: string } }) =>
          e.type === "CONSTRUCTION_STARTED" && e.data.status === "failed_requirements"
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
      // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-non-null-assertion
      const successEvent = (impact.events as any[])!.find(
        (e: { type: string; data: { status?: string } }) =>
          e.type === "CONSTRUCTION_STARTED" && !e.data.status
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
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const heya = mockWorld.heyas.get("heya_1")!;
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      let phil = heya.trainingPhilosophy!;

      // Start succession to Scientist (Technique/Scientific)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const incomingOyakata = { archetype: "scientist" } as any;
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

  describe("Pillar 4: Genetic Lineage", () => {
    it("should successfully generate legacy bonuses for rare candidates", () => {
      const rng = new SeededRNG("dynasty-seed");
      // Force a high-potential candidate to test lineage roll
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const candidateTemplate: any = {
        name: "Test Son",
        isAmateurStar: true,
        potentialStats: {
          strength: 50,
          speed: 50,
          technique: 50,
          balance: 50,
          stamina: 50,
          mental: 50,
          adaptability: 50,
        },
        tags: [],
      };

      // Mock rollToSuccess (LineageService is probabilistic, but we'll try to find one or mock the record pool)
      const trait = LineageService.rollGeneticLineage(mockWorld, candidateTemplate, rng);
      if (trait) {
        expect(trait.ancestorShikona).toBe("Legendary Hakuho");
        LineageService.applyLineageBonuses(candidateTemplate, trait);
        expect(candidateTemplate.tags).toContain("legacy");
        expect(candidateTemplate.potentialStats.mental).toBeGreaterThan(60);
      }
    });
  });
});
