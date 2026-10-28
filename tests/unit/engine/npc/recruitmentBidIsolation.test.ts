import { describe, it, expect, vi, beforeEach } from "vitest";
import { makeNPCWeeklyDecision } from "@/engine/npc/weekly";
import * as PersonaService from "@/engine/npc/personas/NPCPersonaService";
import { MockFactory } from "@tests/helpers/utils/MockFactory";
import type { Id } from "@/engine/types/common";
import type { AIPlan } from "@/engine/npc/types";

vi.mock("@/engine/npc/personas/NPCPersonaService", () => ({
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

/**
 * V14-B10 — runRecruitmentPass returned the module-level NO_VACANCY_RESULT
 * singleton by reference, and TacticalCoordinator.boostRecruitment mutates
 * `recruitment.shouldBid` on it. Once any heya with a recruitment_blitz plan
 * hit the no-vacancy path, the shared const flipped to `true` for every later
 * heya in the process — including subsequent worlds in a same-process
 * double-run (the determinism leak caught by determinism-double-run.ts).
 */
describe("Recruitment bid policy isolation (V14-B10)", () => {
  const heyaA = "heya-a" as Id;
  const heyaB = "heya-b" as Id;
  const oyaA = "oya-a" as Id;
  const oyaB = "oya-b" as Id;

  let world: ReturnType<typeof MockFactory.createWorld>;

  beforeEach(() => {
    vi.mocked(PersonaService.getManagerPersona).mockReturnValue(basePersona as any);
    world = MockFactory.createWorld({ week: 1, year: 1990 });
    for (const [hid, oid] of [
      [heyaA, oyaA],
      [heyaB, oyaB],
    ] as const) {
      const heya = MockFactory.createHeya(hid, { oyakataId: oid });
      const oya = MockFactory.createOyakata(oid, { heyaId: hid });
      world.heyas.set(hid, heya);
      world.oyakata.set(oid, oya);
    }
    // No talentPool → runRecruitmentPass takes the no-vacancy path.
    world.talentPool = undefined;
  });

  it("a blitz plan's boostRecruitment must not leak shouldBid into other heyas' results", () => {
    const blitzPlan: AIPlan = {
      heyaId: heyaA,
      archetype: "traditionalist",
      planId: "recruitment_blitz",
      goals: [],
      constraints: [],
      estimatedWeeks: 8,
      startedWeek: 1,
      reasoning: ["test"],
    };

    const blitzDecision = makeNPCWeeklyDecision(world, heyaA, blitzPlan);
    expect(blitzDecision.agentDecisions?.recruitment.shouldBid).toBe(true);

    // A later no-plan heya must still get the pristine no-vacancy result —
    // currently FAILS: the shared singleton carries shouldBid=true.
    const laterDecision = makeNPCWeeklyDecision(world, heyaB);
    expect(laterDecision.agentDecisions?.recruitment.shouldBid).toBe(false);
  });

  it("successive no-vacancy results are independent objects", () => {
    const first = makeNPCWeeklyDecision(world, heyaA);
    const second = makeNPCWeeklyDecision(world, heyaB);
    expect(first.agentDecisions?.recruitment).not.toBe(second.agentDecisions?.recruitment);
    expect(first.agentDecisions?.recruitment.shouldBid).toBe(false);
    expect(second.agentDecisions?.recruitment.shouldBid).toBe(false);
  });
});
