 
import { describe, it, expect, beforeEach, vi } from "vitest";
import { phase01_week_npc_ai } from "@/engine/tick/phases/phase01_week_npc_ai";
import * as PersonaService from "@/engine/systems/NPCPersonaService";
import { MockFactory } from "../../../../helpers/utils/MockFactory";
import type { Id } from "@/engine/types/common";
import type { Rikishi } from "@/engine/types/rikishi";
import type { SparringState } from "@/engine/types/training";
import { resolveImpacts } from "@/engine/core/ImpactResolver";

vi.mock("@/engine/systems/NPCPersonaService", () => ({
  getManagerPersona: vi.fn(),
  ensurePersonaForOyakata: vi.fn((_world: any, oyakata: any) => ({
    quirks: [],
    managerFlags: {},
    ...oyakata,
  })),
}));

const basePersona = {
  perception: {
    moraleBand: "neutral",
    runwayBand: "comfortable",
    rosterSize: 5,
    rosterStrengthBand: "competitive",
    welfareRiskBand: "safe",
    rikishiPerceptions: [],
  },
  riskAppetite: 0.5,
  welfareDiscipline: 0.5,
  mood: "content",
  archetype: "traditionalist",
  traits: { ambition: 50, patience: 50, risk: 50, tradition: 50, compassion: 50 },
  quirks: [],
  styleBias: "neutral",
};

describe("NPC Sparring Pair Assignment", () => {
  const heyaId = "heya-spar-1" as Id;
  const oyakataId = "oyakata-spar-1" as Id;
  let world: ReturnType<typeof MockFactory.createWorld>;
  let heya: ReturnType<typeof MockFactory.createHeya>;
  let oyakata: ReturnType<typeof MockFactory.createOyakata>;

  beforeEach(() => {
    vi.mocked(PersonaService.getManagerPersona).mockReturnValue(basePersona as any);
    vi.mocked(PersonaService.ensurePersonaForOyakata).mockReturnValue({
      quirks: [],
      managerFlags: {},
    } as any);
    world = MockFactory.createWorld({ week: 1, year: 1990 });
    heya = MockFactory.createHeya(heyaId, { oyakataId });
    oyakata = MockFactory.createOyakata(oyakataId, { heyaId, archetype: "traditionalist" });
    world.heyas.set(heyaId, heya);
    world.oyakata.set(oyakataId, oyakata);
    world.playerHeyaId = "player-heya";
  });

  function makeRikishi(id: string, arch: string, overrides: Partial<Rikishi> = {}): Rikishi {
    return MockFactory.createRikishi(id, {
      heyaId,
      rank: "maegashira",
      division: "makuuchi",
      combatProfile: {
        archetype: arch as any,
        familyPreferences: { push: 10, belt: 0, trick: 0, speed: 0 },
        preferredGrip: "none",
        preferredGripDepth: "standard",
        statModifiers: {},
        counterFamily: "push",
        archetypeBehavior: {
          tachiaiSpeedBonus: 0,
          lateralMovementBonus: 0,
          edgeEscapeBonus: 0,
          beltTorqueBonus: 0,
          pushVelocityBonus: 0,
        },
      } as any,
      ...overrides,
    });
  }

  it("assigns sparring pairs for NPC heya with 2+ eligible rikishi", () => {
    const r1 = makeRikishi("spar-r1", "oshi");
    const r2 = makeRikishi("spar-r2", "yotsu");
    world.rikishi.set("spar-r1", r1);
    world.rikishi.set("spar-r2", r2);
    heya.rikishiIds = ["spar-r1", "spar-r2"];

    const impact = phase01_week_npc_ai(world);
    const updatedWorld = resolveImpacts(world, [impact]);

    const sparringState = updatedWorld.sparringPairs?.get(heyaId);
    expect(sparringState).toBeDefined();
    const pairKeys = Object.keys(sparringState!.pairs);
    expect(pairKeys.length).toBe(1);
  });

  it("prefers friction chemistry (push vs tech archetype) when pairing", () => {
    const r1 = makeRikishi("spar-r1", "oshi");
    const r2 = makeRikishi("spar-r2", "yotsu");
    const r3 = makeRikishi("spar-r3", "oshi");
    const r4 = makeRikishi("spar-r4", "yotsu");
    world.rikishi.set("spar-r1", r1);
    world.rikishi.set("spar-r2", r2);
    world.rikishi.set("spar-r3", r3);
    world.rikishi.set("spar-r4", r4);
    heya.rikishiIds = ["spar-r1", "spar-r2", "spar-r3", "spar-r4"];

    const impact = phase01_week_npc_ai(world);
    const updatedWorld = resolveImpacts(world, [impact]);

    const sparringState = updatedWorld.sparringPairs?.get(heyaId);
    expect(sparringState).toBeDefined();
    const pairs = Object.values(sparringState!.pairs);
    expect(pairs.length).toBe(2);

    // Each pair should have friction chemistry (oshi vs yotsu)
    for (const pair of pairs) {
      expect(pair.chemistry).toBe("friction");
    }
  });

  it("does not assign pairs for rikishi already in existing pairs", () => {
    const r1 = makeRikishi("spar-r1", "oshi");
    const r2 = makeRikishi("spar-r2", "yotsu");
    const r3 = makeRikishi("spar-r3", "oshi");
    world.rikishi.set("spar-r1", r1);
    world.rikishi.set("spar-r2", r2);
    world.rikishi.set("spar-r3", r3);
    heya.rikishiIds = ["spar-r1", "spar-r2", "spar-r3"];

    // Pre-assign r1+r2 as a pair
    const existingState: SparringState = {
      heyaId,
      pairs: {
        "spar-r1|spar-r2": {
          key: "spar-r1|spar-r2",
          aId: "spar-r1",
          bId: "spar-r2",
          chemistry: "friction",
          weeksActive: 3,
          establishedWeek: 1,
        },
      },
    };
    world.sparringPairs = new Map([[heyaId, existingState]]);

    const impact = phase01_week_npc_ai(world);
    const updatedWorld = resolveImpacts(world, [impact]);

    const sparringState = updatedWorld.sparringPairs?.get(heyaId);
    expect(sparringState).toBeDefined();
    const pairKeys = Object.keys(sparringState!.pairs);
    // r1 and r2 are already paired; r3 is alone — no new pair should be created
    expect(pairKeys.length).toBe(1);
    expect(pairKeys).toContain("spar-r1|spar-r2");
  });

  it("does not assign pairs for injured or retired rikishi", () => {
    const r1 = makeRikishi("spar-r1", "oshi", { injured: true });
    const r2 = makeRikishi("spar-r2", "yotsu");
    world.rikishi.set("spar-r1", r1);
    world.rikishi.set("spar-r2", r2);
    heya.rikishiIds = ["spar-r1", "spar-r2"];

    const impact = phase01_week_npc_ai(world);
    const updatedWorld = resolveImpacts(world, [impact]);

    const sparringState = updatedWorld.sparringPairs?.get(heyaId);
    // r1 is injured, r2 alone — no pairs
    expect(sparringState).toBeUndefined();
  });

  it("does not assign pairs for player heya", () => {
    const playerHeyaId = "player-heya" as Id;
    const playerOyakataId = "player-oyakata" as Id;
    const playerHeya = MockFactory.createHeya(playerHeyaId, { oyakataId: playerOyakataId });
    const playerOyakata = MockFactory.createOyakata(playerOyakataId, {
      heyaId: playerHeyaId,
      archetype: "traditionalist",
    });
    world.heyas.set(playerHeyaId, playerHeya);
    world.oyakata.set(playerOyakataId, playerOyakata);
    world.playerHeyaId = playerHeyaId;

    const r1 = makeRikishi("spar-r1", "oshi", { heyaId: playerHeyaId });
    const r2 = makeRikishi("spar-r2", "yotsu", { heyaId: playerHeyaId });
    world.rikishi.set("spar-r1", r1);
    world.rikishi.set("spar-r2", r2);
    playerHeya.rikishiIds = ["spar-r1", "spar-r2"];

    const impact = phase01_week_npc_ai(world);
    const updatedWorld = resolveImpacts(world, [impact]);

    const sparringState = updatedWorld.sparringPairs?.get(playerHeyaId);
    expect(sparringState).toBeUndefined();
  });

  it("assigns no pairs when fewer than 2 eligible rikishi available", () => {
    const r1 = makeRikishi("spar-r1", "oshi");
    world.rikishi.set("spar-r1", r1);
    heya.rikishiIds = ["spar-r1"];

    const impact = phase01_week_npc_ai(world);
    const updatedWorld = resolveImpacts(world, [impact]);

    const sparringState = updatedWorld.sparringPairs?.get(heyaId);
    expect(sparringState).toBeUndefined();
  });

  it("handles odd number of rikishi (one left unpaired)", () => {
    const r1 = makeRikishi("spar-r1", "oshi");
    const r2 = makeRikishi("spar-r2", "yotsu");
    const r3 = makeRikishi("spar-r3", "oshi");
    world.rikishi.set("spar-r1", r1);
    world.rikishi.set("spar-r2", r2);
    world.rikishi.set("spar-r3", r3);
    heya.rikishiIds = ["spar-r1", "spar-r2", "spar-r3"];

    const impact = phase01_week_npc_ai(world);
    const updatedWorld = resolveImpacts(world, [impact]);

    const sparringState = updatedWorld.sparringPairs?.get(heyaId);
    expect(sparringState).toBeDefined();
    const pairKeys = Object.keys(sparringState!.pairs);
    expect(pairKeys.length).toBe(1); // Only one pair, one rikishi left out
  });
});
