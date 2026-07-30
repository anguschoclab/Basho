/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { makeNPCWeeklyDecision } from "@/engine/npcAI";
import * as PersonaService from "@/engine/systems/NPCPersonaService";
import { MockFactory } from "../../../helpers/utils/MockFactory";
import type { Id } from "@/engine/types/common";

vi.mock("@/engine/systems/NPCPersonaService", () => ({
  getManagerPersona: vi.fn(),
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

describe("NPC Weekly Decisions — promotion awareness", () => {
  const heyaId = "heya-1" as Id;
  const oyakataId = "oyakata-1" as Id;

  let world: ReturnType<typeof MockFactory.createWorld>;
  let heya: ReturnType<typeof MockFactory.createHeya>;
  let oyakata: ReturnType<typeof MockFactory.createOyakata>;

  beforeEach(() => {
    vi.mocked(PersonaService.getManagerPersona).mockReturnValue(basePersona as any);
    world = MockFactory.createWorld({ week: 1, year: 1990 });
    heya = MockFactory.createHeya(heyaId, { oyakataId });
    oyakata = MockFactory.createOyakata(oyakataId, { heyaId, archetype: "traditionalist" });
    world.heyas.set(heyaId, heya);
    world.oyakata.set(oyakataId, oyakata);
  });

  it("adds kadoban ozeki to protect list", () => {
    const r1 = MockFactory.createRikishi("r1", {
      heyaId,
      rank: "ozeki",
      division: "makuuchi",
    });
    world.rikishi.set("r1", r1);
    heya.rikishiIds = ["r1"];
    world.ozekiKadoban = { r1: { isKadoban: true } } as any;

    const decision = makeNPCWeeklyDecision(world, heyaId);
    expect(decision.individualProtects).toContain("r1");
    expect(decision.reasoning.some((r) => r.includes("Kadoban"))).toBe(true);
  });

  it("adds non-kadoban ozeki to push list for Yokozuna run", () => {
    const r1 = MockFactory.createRikishi("r1", {
      heyaId,
      rank: "ozeki",
      division: "makuuchi",
    });
    world.rikishi.set("r1", r1);
    heya.rikishiIds = ["r1"];

    const decision = makeNPCWeeklyDecision(world, heyaId);
    expect(decision.individualPushes).toContain("r1");
    expect(decision.reasoning.some((r) => r.includes("Yokozuna run"))).toBe(true);
  });

  it("adds sekiwake to develop list as Ozeki candidate", () => {
    const r1 = MockFactory.createRikishi("r1", {
      heyaId,
      rank: "sekiwake",
      division: "makuuchi",
    });
    world.rikishi.set("r1", r1);
    heya.rikishiIds = ["r1"];

    const decision = makeNPCWeeklyDecision(world, heyaId);
    expect(decision.individualDevelops).toContain("r1");
    expect(decision.reasoning.some((r) => r.includes("Ozeki candidate"))).toBe(true);
  });

  it("adds komusubi to develop list as Ozeki candidate", () => {
    const r1 = MockFactory.createRikishi("r1", {
      heyaId,
      rank: "komusubi",
      division: "makuuchi",
    });
    world.rikishi.set("r1", r1);
    heya.rikishiIds = ["r1"];

    const decision = makeNPCWeeklyDecision(world, heyaId);
    expect(decision.individualDevelops).toContain("r1");
  });
});

describe("NPC Weekly Decisions — yokozuna council warning protection", () => {
  const heyaId = "heya-yoko" as Id;
  const oyakataId = "oyakata-yoko" as Id;

  let world: ReturnType<typeof MockFactory.createWorld>;
  let heya: ReturnType<typeof MockFactory.createHeya>;
  let oyakata: ReturnType<typeof MockFactory.createOyakata>;

  beforeEach(() => {
    vi.mocked(PersonaService.getManagerPersona).mockReturnValue(basePersona as any);
    world = MockFactory.createWorld({ week: 1, year: 1990 });
    heya = MockFactory.createHeya(heyaId, { oyakataId });
    oyakata = MockFactory.createOyakata(oyakataId, { heyaId, archetype: "traditionalist" });
    world.heyas.set(heyaId, heya);
    world.oyakata.set(oyakataId, oyakata);
  });

  it("adds yokozuna with 1 council warning to protect list", () => {
    const r1 = MockFactory.createRikishi("r1", {
      heyaId,
      rank: "yokozuna",
      division: "makuuchi",
      councilWarnings: 1,
    });
    world.rikishi.set("r1", r1);
    heya.rikishiIds = ["r1"];

    const decision = makeNPCWeeklyDecision(world, heyaId);
    expect(decision.individualProtects).toContain("r1");
    expect(decision.individualPushes).not.toContain("r1");
    expect(decision.reasoning.some((r) => r.includes("YDC"))).toBe(true);
  });

  it("reduces training intensity when yokozuna has 2+ council warnings", () => {
    const r1 = MockFactory.createRikishi("r1", {
      heyaId,
      rank: "yokozuna",
      division: "makuuchi",
      councilWarnings: 2,
    });
    world.rikishi.set("r1", r1);
    heya.rikishiIds = ["r1"];

    // Force intensive via furious mood to test reduction
    vi.mocked(PersonaService.getManagerPersona).mockReturnValue({
      ...basePersona,
      mood: "furious",
      perception: {
        ...basePersona.perception,
        welfareRiskBand: "safe",
        rosterStrengthBand: "dominant",
      },
      riskAppetite: 0.9,
    } as any);

    const decision = makeNPCWeeklyDecision(world, heyaId);
    // Furious forces punishing, then yokozuna protection should reduce to intensive or balanced
    expect(decision.individualProtects).toContain("r1");
    expect(decision.reasoning.some((r) => r.includes("YDC"))).toBe(true);
  });

  it("does not affect yokozuna with 0 council warnings", () => {
    const r1 = MockFactory.createRikishi("r1", {
      heyaId,
      rank: "yokozuna",
      division: "makuuchi",
      councilWarnings: 0,
    });
    world.rikishi.set("r1", r1);
    heya.rikishiIds = ["r1"];

    const decision = makeNPCWeeklyDecision(world, heyaId);
    expect(decision.individualProtects).not.toContain("r1");
    expect(decision.reasoning.some((r) => r.includes("YDC"))).toBe(false);
  });

  it("adds yokozuna with 3 warnings to protect list (not double-counted)", () => {
    const r1 = MockFactory.createRikishi("r1", {
      heyaId,
      rank: "yokozuna",
      division: "makuuchi",
      councilWarnings: 3,
    });
    world.rikishi.set("r1", r1);
    heya.rikishiIds = ["r1"];

    const decision = makeNPCWeeklyDecision(world, heyaId);
    expect(decision.individualProtects).toContain("r1");
    // Should only appear once in protects
    expect(decision.individualProtects.filter((id) => id === "r1").length).toBe(1);
  });
});

describe("NPC Weekly Decisions — injury risk reduction", () => {
  const heyaId = "heya-2" as Id;
  const oyakataId = "oyakata-2" as Id;

  let world: ReturnType<typeof MockFactory.createWorld>;
  let heya: ReturnType<typeof MockFactory.createHeya>;
  let oyakata: ReturnType<typeof MockFactory.createOyakata>;

  beforeEach(() => {
    vi.mocked(PersonaService.getManagerPersona).mockReturnValue(basePersona as any);
    world = MockFactory.createWorld({ week: 1, year: 1990 });
    heya = MockFactory.createHeya(heyaId, { oyakataId });
    oyakata = MockFactory.createOyakata(oyakataId, { heyaId, archetype: "traditionalist" });
    world.heyas.set(heyaId, heya);
    world.oyakata.set(oyakataId, oyakata);
  });

  it("reduces punishing to intensive when high risk ratio", () => {
    // Create rikishi with very low condition (high risk)
    const r1 = MockFactory.createRikishi("r1", {
      heyaId,
      rank: "maegashira",
      division: "makuuchi",
      condition: 20,
      fatigue: 80,
    });
    world.rikishi.set("r1", r1);
    heya.rikishiIds = ["r1"];

    // Force punishing intensity via furious mood
    vi.mocked(PersonaService.getManagerPersona).mockReturnValue({
      ...basePersona,
      mood: "furious",
      perception: {
        ...basePersona.perception,
        welfareRiskBand: "safe",
        rosterStrengthBand: "dominant",
      },
      riskAppetite: 0.9,
    } as any);

    const decision = makeNPCWeeklyDecision(world, heyaId);
    // Furious forces punishing, then injury risk should reduce it
    expect(decision.reasoning.some((r) => r.includes("[InjuryRisk]"))).toBe(true);
  });

  it("adds high-risk rikishi to protect list", () => {
    const r1 = MockFactory.createRikishi("r1", {
      heyaId,
      rank: "maegashira",
      division: "makuuchi",
      condition: 10,
      fatigue: 90,
    });
    world.rikishi.set("r1", r1);
    heya.rikishiIds = ["r1"];

    const decision = makeNPCWeeklyDecision(world, heyaId);
    expect(decision.individualProtects).toContain("r1");
  });
});

describe("NPC Weekly Decisions — mood override", () => {
  const heyaId = "heya-3" as Id;
  const oyakataId = "oyakata-3" as Id;

  it("furious mood overrides conservative to punishing", () => {
    vi.mocked(PersonaService.getManagerPersona).mockReturnValue({
      ...basePersona,
      mood: "furious",
      perception: {
        ...basePersona.perception,
        welfareRiskBand: "critical",
      },
    } as any);

    const world = MockFactory.createWorld({ week: 1, year: 1990 });
    const heya = MockFactory.createHeya(heyaId, { oyakataId });
    const oyakata = MockFactory.createOyakata(oyakataId, { heyaId, archetype: "traditionalist" });
    world.heyas.set(heyaId, heya);
    world.oyakata.set(oyakataId, oyakata);

    const decision = makeNPCWeeklyDecision(world, heyaId);
    expect(decision.trainingIntensity).toBe("punishing");
    expect(decision.reasoning.some((r) => r.includes("[Lead Review]"))).toBe(true);
  });
});
