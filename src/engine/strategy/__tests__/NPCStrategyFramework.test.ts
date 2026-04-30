/**
 * NPCStrategyFramework Tests
 * ==========================
 * Comprehensive tests for the shared strategy evaluation framework.
 */

import { describe, it, expect, vi } from "vitest";
import type { StrategyContext, StrategyRule } from "../NPCStrategyFramework";
import {
  evaluateRule,
  evaluateRulesExclusive,
  evaluateRulesCumulative,
  TraitChecks,
  calculateMoodAdjustedThreshold,
  trySpendResource,
  adjustScore,
} from "../NPCStrategyFramework";
import type { Heya } from "../../types/heya";
import type { Oyakata } from "../../types/oyakata";

// ============================================================================
// Test Fixtures
// ============================================================================

const createMockHeya = (overrides: Partial<Heya> = {}): Heya =>
  ({
    id: "heya-1",
    name: "Test Heya",
    funds: 500_000_000,
    politicalCapital: 50,
    scandalScore: 10,
    ...overrides,
  }) as Heya;

const createMockOyakata = (overrides: Partial<Oyakata> = {}): Oyakata =>
  ({
    id: "oya-1",
    name: "Test Oyakata",
    archetype: "traditionalist",
    mood: "content",
    traits: {
      ambition: 50,
      tradition: 50,
      risk: 50,
      patience: 50,
      compassion: 50,
    },
    ...overrides,
  }) as Oyakata;

const createMockContext = (
  heyaOverrides: Partial<Heya> = {},
  oyakataOverrides: Partial<Oyakata> = {}
): StrategyContext => ({
  world: {
    heyas: new Map(),
    rikishi: new Map(),
    year: 2025,
    week: 1,
  } as unknown as StrategyContext["world"],
  heya: createMockHeya(heyaOverrides),
  oyakata: createMockOyakata(oyakataOverrides),
});

// ============================================================================
// evaluateRule Tests
// ============================================================================

describe("evaluateRule", () => {
  it("should return false when condition is not met", () => {
    const rule: StrategyRule = {
      id: "test-rule",
      condition: () => false,
      action: () => ({}) as any,
      buildEvent: () => ({ action: "test", reasoning: "test" }),
    };

    const ctx = createMockContext();
    const result = evaluateRule(ctx, rule);
    const hasChanges =
      (result.entities && Object.keys(result.entities).length > 0) ||
      (result.worldFields && Object.keys(result.worldFields).length > 0) ||
      (result.arrayAppends && result.arrayAppends.length > 0) ||
      (result.events && result.events.length > 0);
    expect(hasChanges).toBeFalsy();
  });

  it("should return false when action fails", () => {
    const rule: StrategyRule = {
      id: "test-rule",
      condition: () => true,
      action: () => false,
      buildEvent: () => ({ action: "test", reasoning: "test" }),
    };

    const ctx = createMockContext();
    expect(evaluateRule(ctx, rule)).toBe(false);
  });

  it("should return true when condition and action succeed", () => {
    const rule: StrategyRule = {
      id: "test-rule",
      condition: () => true,
      action: () => true,
      buildEvent: () => ({ action: "test", reasoning: "test" }),
      importance: "minor",
    };

    const ctx = createMockContext();
    expect(evaluateRule(ctx, rule)).toBe(true);
  });
});

// ============================================================================
// evaluateRulesExclusive Tests
// ============================================================================

describe("evaluateRulesExclusive", () => {
  it("should stop after first executed rule", () => {
    const action1 = vi.fn(() => ({ events: [{ type: "test" }] }) as any);
    const action2 = vi.fn(() => ({ events: [{ type: "test2" }] }) as any);

    const rules: StrategyRule[] = [
      {
        id: "rule-1",
        condition: () => true,
        action: action1,
        buildEvent: () => ({ action: "test", reasoning: "test" }),
      },
      {
        id: "rule-2",
        condition: () => true,
        action: action2,
        buildEvent: () => ({ action: "test", reasoning: "test" }),
      },
    ];

    const ctx = createMockContext();
    const result = evaluateRulesExclusive(ctx, rules);

    expect(result.events?.some((e) => e.type === "test" || e.type === "rule-1")).toBe(true);
    expect(action1).toHaveBeenCalledTimes(1);
    expect(action2).not.toHaveBeenCalled();
  });

  it("should try subsequent rules if earlier ones fail", () => {
    const action1 = vi.fn(() => ({ events: [] }) as any); // Action runs but produces no events (fails execution)
    const action2 = vi.fn(() => ({ events: [{ type: "test2" }] }) as any);

    const rules: StrategyRule[] = [
      {
        id: "rule-1",
        condition: () => true, // Condition passes but action does nothing
        action: action1,
        buildEvent: () => ({ action: "test", reasoning: "test" }),
      },
      {
        id: "rule-2",
        condition: () => true,
        action: action2,
        buildEvent: () => ({ action: "test", reasoning: "test" }),
      },
    ];

    const ctx = createMockContext();
    const result = evaluateRulesExclusive(ctx, rules);

    expect(result.events?.some((e) => e.type === "test2" || e.type === "rule-2")).toBe(true);
    expect(action1).toHaveBeenCalledTimes(1);
    expect(action2).toHaveBeenCalledTimes(1);
  });

  it("should return false if no rules execute", () => {
    const rules: StrategyRule[] = [
      {
        id: "rule-1",
        condition: () => false,
        action: () => true,
        buildEvent: () => ({ action: "test", reasoning: "test" }),
      },
    ];

    const ctx = createMockContext();
    const result = evaluateRulesExclusive(ctx, rules);
    const hasChanges =
      (result.entities && Object.keys(result.entities).length > 0) ||
      (result.worldFields && Object.keys(result.worldFields).length > 0) ||
      (result.arrayAppends && result.arrayAppends.length > 0) ||
      (result.events && result.events.length > 0);
    expect(hasChanges).toBeFalsy();
  });
});

// ============================================================================
// evaluateRulesCumulative Tests
// ============================================================================

describe("evaluateRulesCumulative", () => {
  it("should execute all matching rules", () => {
    const action1 = vi.fn(() => ({ events: [{ type: "test" }] }) as any);
    const action2 = vi.fn(() => ({ events: [{ type: "test2" }] }) as any);

    const rules: StrategyRule[] = [
      {
        id: "rule-1",
        condition: () => true,
        action: action1,
        buildEvent: () => ({ action: "test", reasoning: "test" }),
      },
      {
        id: "rule-2",
        condition: () => true,
        action: action2,
        buildEvent: () => ({ action: "test", reasoning: "test" }),
      },
    ];

    const ctx = createMockContext();
    const result = evaluateRulesCumulative(ctx, rules);

    expect(result.events?.some((e) => e.type === "test" || e.type === "rule-1")).toBe(true);
    expect(result.events?.some((e) => e.type === "test2" || e.type === "rule-2")).toBe(true);
    expect(action1).toHaveBeenCalledTimes(1);
    expect(action2).toHaveBeenCalledTimes(1);
  });

  it("should count only successful executions", () => {
    const action1 = vi.fn(() => ({ events: [{ type: "test" }] }) as any);
    const action2 = vi.fn(() => ({ events: [{ type: "test2" }] }) as any);

    const rules: StrategyRule[] = [
      {
        id: "rule-1",
        condition: () => false, // will fail condition
        action: action1,
        buildEvent: () => ({ action: "test", reasoning: "test" }),
      },
      {
        id: "rule-2",
        condition: () => true,
        action: action2,
        buildEvent: () => ({ action: "test", reasoning: "test" }),
      },
    ];

    const ctx = createMockContext();
    const result = evaluateRulesCumulative(ctx, rules);

    expect(result.events?.some((e) => e.type === "test" || e.type === "rule-1")).toBe(false);
    expect(result.events?.some((e) => e.type === "test2" || e.type === "rule-2")).toBe(true);
  });
});

// ============================================================================
// TraitChecks Tests
// ============================================================================

describe("TraitChecks", () => {
  describe("isAmbitious", () => {
    it("should return true when ambition exceeds threshold", () => {
      const oya = createMockOyakata({
        traits: { ambition: 60, tradition: 50, risk: 50, patience: 50, compassion: 50 },
      });
      expect(TraitChecks.isAmbitious(50)(oya)).toBe(true);
    });

    it("should return false when ambition is below threshold", () => {
      const oya = createMockOyakata({
        traits: { ambition: 40, tradition: 50, risk: 50, patience: 50, compassion: 50 },
      });
      expect(TraitChecks.isAmbitious(50)(oya)).toBe(false);
    });
  });

  describe("isHoarder", () => {
    it("should return true when risk is below threshold", () => {
      const oya = createMockOyakata({
        traits: { risk: 20, ambition: 50, tradition: 50, patience: 50, compassion: 50 },
      });
      expect(TraitChecks.isHoarder(30)(oya)).toBe(true);
    });

    it("should return false when risk exceeds threshold", () => {
      const oya = createMockOyakata({
        traits: { risk: 50, ambition: 50, tradition: 50, patience: 50, compassion: 50 },
      });
      expect(TraitChecks.isHoarder(30)(oya)).toBe(false);
    });
  });

  describe("isTraditionalist", () => {
    it("should return true when tradition exceeds threshold", () => {
      const oya = createMockOyakata({
        traits: { tradition: 80, ambition: 50, risk: 50, patience: 50, compassion: 50 },
      });
      expect(TraitChecks.isTraditionalist(70)(oya)).toBe(true);
    });
  });

  describe("isRiskTaker", () => {
    it("should return true when risk exceeds threshold", () => {
      const oya = createMockOyakata({
        traits: { risk: 70, ambition: 50, tradition: 50, patience: 50, compassion: 50 },
      });
      expect(TraitChecks.isRiskTaker(60)(oya)).toBe(true);
    });
  });

  describe("hasMood", () => {
    it("should return true when mood matches", () => {
      const oya = createMockOyakata({ mood: "furious" });
      expect(TraitChecks.hasMood("furious")(oya)).toBe(true);
    });

    it("should return false when mood does not match", () => {
      const oya = createMockOyakata({ mood: "content" });
      expect(TraitChecks.hasMood("furious")(oya)).toBe(false);
    });
  });
});

// ============================================================================
// calculateMoodAdjustedThreshold Tests
// ============================================================================

describe("calculateMoodAdjustedThreshold", () => {
  it("should increase threshold for anxious mood", () => {
    const oya = createMockOyakata({ mood: "anxious" });
    const result = calculateMoodAdjustedThreshold(100, oya);
    expect(result).toBe(150); // 100 * 1.5
  });

  it("should decrease threshold for obsessed mood", () => {
    const oya = createMockOyakata({ mood: "obsessed" });
    const result = calculateMoodAdjustedThreshold(100, oya);
    expect(result).toBe(80); // 100 * 0.8
  });

  it("should decrease threshold for furious mood", () => {
    const oya = createMockOyakata({ mood: "furious" });
    const result = calculateMoodAdjustedThreshold(100, oya);
    expect(result).toBe(70); // 100 * 0.7
  });

  it("should not adjust for content mood", () => {
    const oya = createMockOyakata({ mood: "content" });
    const result = calculateMoodAdjustedThreshold(100, oya);
    expect(result).toBe(100);
  });
});

// ============================================================================
// trySpendResource Tests
// ============================================================================

describe("trySpendResource", () => {
  it("should deduct funds when sufficient", () => {
    const heya = createMockHeya({ funds: 1000 });
    const result = trySpendResource(heya, "funds", 500);

    expect(result).toBe(true);
    expect(heya.funds).toBe(500);
  });

  it("should return false when funds insufficient", () => {
    const heya = createMockHeya({ funds: 100 });
    const result = trySpendResource(heya, "funds", 500);

    expect(result).toBe(false);
    expect(heya.funds).toBe(100); // unchanged
  });

  it("should deduct political capital when sufficient", () => {
    const heya = createMockHeya({ politicalCapital: 50 });
    const result = trySpendResource(heya, "politicalCapital", 20);

    expect(result).toBe(true);
    expect(heya.politicalCapital).toBe(30);
  });
});

// ============================================================================
// adjustScore Tests
// ============================================================================

describe("adjustScore", () => {
  it("should add delta to score", () => {
    expect(adjustScore(50, 10, 0, 100)).toBe(60);
  });

  it("should subtract delta from score", () => {
    expect(adjustScore(50, -10, 0, 100)).toBe(40);
  });

  it("should respect minimum bound", () => {
    expect(adjustScore(5, -10, 0, 100)).toBe(0);
  });

  it("should respect maximum bound", () => {
    expect(adjustScore(95, 10, 0, 100)).toBe(100);
  });

  it("should use default bounds when not specified", () => {
    expect(adjustScore(95, 10)).toBe(100);
    expect(adjustScore(5, -10)).toBe(0);
  });
});
