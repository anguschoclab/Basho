import { describe, it, expect } from "vitest";
import { makeMockWorld, makeMockHeya, mockRikishi } from "../utils";
import { makeNPCWeeklyDecision } from "@/engine/npcAI";

function setupWorld(archetype = "traditionalist") {
  const world = makeMockWorld();
  const heya = makeMockHeya("h1", {
    oyakataId: "o1",
    runwayBand: "comfortable",
    rikishiIds: [],
  });
  world.heyas.set("h1", heya);
  world.oyakata.set("o1", {
    id: "o1",
    name: "Oya",
    archetype,
    traits: { ambition: 50, risk: 50, tradition: 50, patience: 50, compassion: 50 },
  } as any);
  world.playerHeyaId = "player";
  return { world, heya };
}

describe("makeNPCWeeklyDecision — applyInjuryRiskReduction", () => {
  it("adds high-risk rikishi to individualProtects", () => {
    const { world, heya } = setupWorld();
    const r1 = mockRikishi("r1", {
      heyaId: "h1",
      condition: 20,
      fatigue: 50,
    });
    world.rikishi.set("r1", r1);
    heya.rikishiIds = ["r1"];

    const decision = makeNPCWeeklyDecision(world, "h1");
    expect(decision.individualProtects).toContain("r1");
  });

  it("removes protected IDs from individualPushes", () => {
    const { world, heya } = setupWorld();
    const r1 = mockRikishi("r1", {
      heyaId: "h1",
      condition: 10,
      fatigue: 60,
    });
    world.rikishi.set("r1", r1);
    heya.rikishiIds = ["r1"];

    const decision = makeNPCWeeklyDecision(world, "h1");
    expect(decision.individualProtects).toContain("r1");
    expect(decision.individualPushes).not.toContain("r1");
    expect(decision.individualDevelops).not.toContain("r1");
  });

  it("does not duplicate already-protected IDs", () => {
    const { world, heya } = setupWorld();
    const r1 = mockRikishi("r1", {
      heyaId: "h1",
      condition: 10,
      fatigue: 60,
      rank: "ozeki",
    });
    world.rikishi.set("r1", r1);
    heya.rikishiIds = ["r1"];
    world.ozekiKadoban = { r1: { isKadoban: true, consecutiveMakeKoshi: 1 } } as any;

    const decision = makeNPCWeeklyDecision(world, "h1");
    const protectCount = decision.individualProtects.filter((id) => id === "r1").length;
    expect(protectCount).toBe(1);
  });

  it("does not add healthy rikishi to protects via injury risk reasoning", () => {
    const { world, heya } = setupWorld();
    const r1 = mockRikishi("r1", {
      heyaId: "h1",
      condition: 95,
      fatigue: 5,
    });
    world.rikishi.set("r1", r1);
    heya.rikishiIds = ["r1"];

    const decision = makeNPCWeeklyDecision(world, "h1");
    expect(decision.reasoning).not.toContain(expect.stringContaining("[InjuryRisk]"));
  });

  it("reduces training intensity when high-risk ratio exceeds threshold", () => {
    const { world, heya } = setupWorld("aggressive");
    const r1 = mockRikishi("r1", { heyaId: "h1", condition: 10, fatigue: 60 });
    const r2 = mockRikishi("r2", { heyaId: "h1", condition: 10, fatigue: 60 });
    world.rikishi.set("r1", r1);
    world.rikishi.set("r2", r2);
    heya.rikishiIds = ["r1", "r2"];

    const decision = makeNPCWeeklyDecision(world, "h1");
    expect(decision.trainingIntensity).not.toBe("punishing");
  });
});

describe("makeNPCWeeklyDecision — applyPromotionAwareness", () => {
  it("adds kadoban ozeki to protects and removes from pushes/develops", () => {
    const { world, heya } = setupWorld();
    const r1 = mockRikishi("r1", {
      heyaId: "h1",
      rank: "ozeki",
      condition: 90,
      fatigue: 5,
    });
    world.rikishi.set("r1", r1);
    heya.rikishiIds = ["r1"];
    world.ozekiKadoban = { r1: { isKadoban: true, consecutiveMakeKoshi: 1 } } as any;

    const decision = makeNPCWeeklyDecision(world, "h1");
    expect(decision.individualProtects).toContain("r1");
    expect(decision.individualPushes).not.toContain("r1");
    expect(decision.individualDevelops).not.toContain("r1");
  });

  it("adds non-kadoban ozeki to pushes for Yokozuna run", () => {
    const { world, heya } = setupWorld();
    const r1 = mockRikishi("r1", {
      heyaId: "h1",
      rank: "ozeki",
      condition: 90,
      fatigue: 5,
    });
    world.rikishi.set("r1", r1);
    heya.rikishiIds = ["r1"];

    const decision = makeNPCWeeklyDecision(world, "h1");
    expect(decision.individualPushes).toContain("r1");
  });

  it("adds yokozuna with council warnings to protects", () => {
    const { world, heya } = setupWorld();
    const r1 = mockRikishi("r1", {
      heyaId: "h1",
      rank: "yokozuna",
      councilWarnings: 1,
      condition: 90,
      fatigue: 5,
    });
    world.rikishi.set("r1", r1);
    heya.rikishiIds = ["r1"];

    const decision = makeNPCWeeklyDecision(world, "h1");
    expect(decision.individualProtects).toContain("r1");
    expect(decision.individualPushes).not.toContain("r1");
  });

  it("adds sekiwake to develops as Ozeki candidate", () => {
    const { world, heya } = setupWorld();
    const r1 = mockRikishi("r1", {
      heyaId: "h1",
      rank: "sekiwake",
      condition: 90,
      fatigue: 5,
    });
    world.rikishi.set("r1", r1);
    heya.rikishiIds = ["r1"];

    const decision = makeNPCWeeklyDecision(world, "h1");
    expect(decision.individualDevelops).toContain("r1");
  });

  it("does not add retired or injured rikishi to protects via promotion awareness", () => {
    const { world, heya } = setupWorld();
    const r1 = mockRikishi("r1", {
      heyaId: "h1",
      rank: "ozeki",
      isRetired: true,
      condition: 90,
      fatigue: 5,
    });
    world.rikishi.set("r1", r1);
    heya.rikishiIds = ["r1"];
    world.ozekiKadoban = { r1: { isKadoban: true, consecutiveMakeKoshi: 1 } } as any;

    const decision = makeNPCWeeklyDecision(world, "h1");
    expect(decision.reasoning).not.toContain(expect.stringContaining("[PromotionAwareness]"));
  });
});
