import { describe, it, expect } from "vitest";
import {
  isRecruitmentPlayerRelevant,
  isMyosekiPlayerRelevant,
  isGovernancePlayerRelevant,
  isSponsorPlayerRelevant,
} from "@/engine/npcAI/eventSurfacing";
import { generateInitialWorld } from "@/engine/systems/generation/WorldFactory";

describe("NPC Activity Surfacing Heuristics", () => {
  const world = generateInitialWorld("test-seed");
  const playerHeyaId = "heya-player";
  world.playerHeyaId = playerHeyaId;

  describe("Recruitment Surfacing", () => {
    it("surfaces headline importance for player-competed talent", () => {
      const candidate = {
        candidateId: "c1",
        competingSuitors: [{ heyaId: playerHeyaId }],
      } as any;
      const importance = isRecruitmentPlayerRelevant(world, candidate);
      expect(importance).toBe("headline");
    });

    it("surfaces major importance for scouted talent", () => {
      const candidate = { candidateId: "c2" } as any;
      world.talentPool = {
        playerScouting: {
          c2: { scoutingLevel: 2 },
        },
      } as any;
      const importance = isRecruitmentPlayerRelevant(world, candidate);
      expect(importance).toBe("major");
    });

    it("surfaces notable importance for prodigies", () => {
      const candidate = { candidateId: "c3", isEmergentProdigy: true } as any;
      const importance = isRecruitmentPlayerRelevant(world, candidate);
      expect(importance).toBe("notable");
    });
  });

  describe("Myoseki Surfacing", () => {
    it("surfaces major for elite tier shares", () => {
      const playerHeya = { id: playerHeyaId, funds: 0, oyakataId: "o1" } as any;
      world.heyas.set(playerHeyaId, playerHeya);

      const stock = { prestigeTier: "elite" } as any;
      const importance = isMyosekiPlayerRelevant(world, stock);
      expect(importance).toBe("major");
    });

    it("surfaces notable for affordable shares with high ambition", () => {
      const playerHeya = world.heyas.get(playerHeyaId)!;
      playerHeya.funds = 1000000;
      playerHeya.oyakataId = "o1";
      const oyakata = { id: "o1", name: "Test Oyakata", age: 50, traits: { ambition: 80 } };
      world.oyakata.set("o1", oyakata as any);

      const stock = { prestigeTier: "respected", askingPrice: 500000 } as any;
      const importance = isMyosekiPlayerRelevant(world, stock);
      expect(importance).toBe("notable");
    });
  });

  describe("Governance Surfacing", () => {
    it("surfaces headline for critical rulings", () => {
      const importance = isGovernancePlayerRelevant("some-heya", "critical");
      expect(importance).toBe("headline");
    });

    it("surfaces major for major rulings", () => {
      const importance = isGovernancePlayerRelevant("some-heya", "major");
      expect(importance).toBe("major");
    });
  });

  describe("Sponsorship Surfacing", () => {
    it("surfaces notable for high tier sponsors", () => {
      const importance = isSponsorPlayerRelevant("T5");
      expect(importance).toBe("notable");
    });

    it("surfaces minor for low tier sponsors", () => {
      const importance = isSponsorPlayerRelevant("T1");
      expect(importance).toBe("minor");
    });
  });
});
