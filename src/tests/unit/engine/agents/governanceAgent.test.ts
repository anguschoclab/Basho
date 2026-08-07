import { describe, it, expect } from "vitest";
import { spawnGovernanceAgent, type GovernanceAgentContext } from "@/engine/agents/GovernanceAgent";
import type { Oyakata } from "@/engine/types/oyakata";
import type { Heya } from "@/engine/types/heya";

function makeOyakata(overrides: Partial<Oyakata> = {}): Oyakata {
  return {
    id: "o1",
    name: "Oya",
    archetype: "strategist",
    traits: { ambition: 50, patience: 50, risk: 50, tradition: 50, compassion: 50 },
    ...overrides,
  } as Oyakata;
}

function makeCtx(overrides: Partial<GovernanceAgentContext> = {}): GovernanceAgentContext {
  return {
    heya: { id: "h1", name: "Heya", funds: 10_000_000 } as Heya,
    oyakata: makeOyakata(),
    world: {} as any,
    scandalScore: 0,
    politicalCapital: 0,
    governanceStatus: "good",
    ...overrides,
  };
}

describe("spawnGovernanceAgent", () => {
  it("ignores low scandal scores", () => {
    const result = spawnGovernanceAgent(makeCtx());
    expect(result.shouldReduceScandal).toBe(false);
    expect(result.shouldUsePoliticalFavor).toBe(false);
    expect(result.shouldSabotageRival).toBe(false);
  });

  it("triggers scandal reduction at high scandal", () => {
    const result = spawnGovernanceAgent(makeCtx({ scandalScore: 35 }));
    expect(result.shouldReduceScandal).toBe(true);
  });

  it("uses political favor when ambitious and has capital", () => {
    const result = spawnGovernanceAgent(
      makeCtx({
        oyakata: makeOyakata({ traits: { ambition: 80, patience: 50, risk: 50, tradition: 30, compassion: 50 } }),
        politicalCapital: 50,
      })
    );
    expect(result.shouldUsePoliticalFavor).toBe(true);
  });

  it("selects governance pardon when sanctioned", () => {
    const result = spawnGovernanceAgent(
      makeCtx({
        oyakata: makeOyakata({ traits: { ambition: 80, patience: 50, risk: 50, tradition: 30, compassion: 50 } }),
        politicalCapital: 50,
        governanceStatus: "sanctioned",
      })
    );
    expect(result.shouldUsePoliticalFavor).toBe(true);
    expect(result.favorType).toBe("governance_pardon");
  });
});
