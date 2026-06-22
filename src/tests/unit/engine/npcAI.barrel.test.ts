import { describe, it, expect } from "vitest";
import * as npcAI from "@/engine/npcAI";
import type { AgentDecisions, NPCWeeklyDecision } from "@/engine/npcAI";

describe("npcAI barrel exports", () => {
  it("should NOT export getManagerPersona", () => {
    expect((npcAI as Record<string, unknown>).getManagerPersona).toBeUndefined();
  });

  it("should export all other runtime symbols", () => {
    expect(typeof npcAI.makeNPCWeeklyDecision).toBe("function");
    expect(typeof npcAI.handleNPCCrisis).toBe("function");
    expect(typeof npcAI.handleNPCMediaEvent).toBe("function");
    expect(typeof npcAI.consolidateOyakataMemory).toBe("function");
    expect(typeof npcAI.applyNPCDecision).toBe("function");
    expect(typeof npcAI.tickWeekNPC).toBe("function");
    expect(typeof npcAI.tickMonthlyNPC).toBe("function");
    expect(typeof npcAI.tickYear).toBe("function");
  });

  it("should export type symbols without runtime error", () => {
    const _decisions: AgentDecisions | undefined = undefined;
    const _weekly: NPCWeeklyDecision | undefined = undefined;
    expect(_decisions).toBeUndefined();
    expect(_weekly).toBeUndefined();
  });
});
