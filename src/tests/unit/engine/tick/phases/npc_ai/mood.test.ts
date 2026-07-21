/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { describe, it, expect } from "vitest";
import { processOyakataMood } from "@/engine/tick/phases/npc_ai/mood";
import { createImpactBuilder } from "@/engine/core/ImpactBuilder";
import type { Oyakata } from "@/engine/types/oyakata";
import type { NPCWeeklyDecision } from "@/engine/npcAI";

function makeOyakata(mood: string = "content"): Oyakata {
  return {
    id: "o1",
    heyaId: "h1",
    archetype: "mentor",
    traits: { ambition: 50, patience: 50, risk: 50, tradition: 50, compassion: 50 },
    birthYear: 1960,
    mood,
  } as unknown as Oyakata;
}

function makeDecision(mood?: string): NPCWeeklyDecision {
  return {
    heyaId: "h1",
    scoutingPriority: "passive",
    mood,
  } as unknown as NPCWeeklyDecision;
}

describe("Bug L: processOyakataMood does not mutate input oyakata", () => {
  it("returns new mood without mutating the original oyakata", () => {
    const oyakata = makeOyakata("content");
    const builder = createImpactBuilder("test");
    const decision = makeDecision("angry");

    const result = processOyakataMood(oyakata, decision, "h1", builder);

    // Original oyakata should NOT be mutated
    expect(oyakata.mood).toBe("content");
    // Result should be the new mood
    expect(result).toBe("angry");
  });

  it("returns same mood when decision has no mood", () => {
    const oyakata = makeOyakata("content");
    const builder = createImpactBuilder("test");
    const decision = makeDecision(undefined);

    const result = processOyakataMood(oyakata, decision, "h1", builder);

    expect(result).toBe("content");
    expect(oyakata.mood).toBe("content");
  });

  it("logs mood shift event when mood changes", () => {
    const oyakata = makeOyakata("content");
    const builder = createImpactBuilder("test");
    const decision = makeDecision("angry");

    processOyakataMood(oyakata, decision, "h1", builder);
    const impact = builder.build();
    const moodEvent = impact.events?.find((e) => e.type === "OYAKATA_MOOD_SHIFT");
    expect(moodEvent).toBeDefined();
  });

  it("does not log mood shift event when mood is the same", () => {
    const oyakata = makeOyakata("content");
    const builder = createImpactBuilder("test");
    const decision = makeDecision("content");

    processOyakataMood(oyakata, decision, "h1", builder);
    const impact = builder.build();
    const moodEvent = impact.events?.find((e) => e.type === "OYAKATA_MOOD_SHIFT");
    expect(moodEvent).toBeUndefined();
  });
});
