import { describe, it, expect } from "vitest";
import { generateRecommendations, getPlayerDigest } from "@/engine/advisor/AdvisorService";
import { MockFactory } from "@/tests/helpers/utils/MockFactory";
import type { AIRecommendation } from "@/engine/ai/types";

describe("AdvisorService.generateRecommendations — return shape (Step 2 regression)", () => {
  it("returns an array of AIRecommendation objects with valid shape", () => {
    const heya = MockFactory.createHeya("heya-1", { runwayBand: "desperate" });
    const rikishi = MockFactory.createRikishi("r-1", { heyaId: "heya-1" });
    const world = MockFactory.createWorld({
      heyas: new Map([["heya-1", heya]]),
      rikishi: new Map([["r-1", rikishi]]),
      playerHeyaId: "heya-1",
    });

    const recs = generateRecommendations(world, "heya-1");

    expect(Array.isArray(recs)).toBe(true);
    expect(recs.length).toBeGreaterThan(0);

    for (const r of recs) {
      expect(typeof r.id).toBe("string");
      expect(["training", "recruitment", "finance", "bout", "governance", "rivalry"]).toContain(
        r.category
      );
      expect(["low", "medium", "high", "critical"]).toContain(r.priority);
      expect(typeof r.title).toBe("string");
      expect(typeof r.detail).toBe("string");
      expect(Array.isArray(r.reasoning)).toBe(true);
    }
  });

  it("sorts recommendations by priority (critical first)", () => {
    const heya = MockFactory.createHeya("heya-1", { runwayBand: "desperate" });
    const world = MockFactory.createWorld({
      heyas: new Map([["heya-1", heya]]),
      playerHeyaId: "heya-1",
    });

    const recs = generateRecommendations(world, "heya-1");
    const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
    for (let i = 1; i < recs.length; i++) {
      expect(priorityOrder[recs[i].priority]).toBeLessThanOrEqual(
        priorityOrder[recs[i - 1].priority]
      );
    }
  });

  it("returns empty array when no playerHeyaId is set", () => {
    const world = MockFactory.createWorld({ playerHeyaId: undefined } as any);
    const recs = generateRecommendations(world);
    expect(recs).toEqual([]);
  });

  it("satisfies the AIRecommendation interface at compile time", () => {
    const world = MockFactory.createWorld();
    const recs: AIRecommendation[] = generateRecommendations(world);
    expect(Array.isArray(recs)).toBe(true);
  });
});

describe("AdvisorService.getPlayerDigest — return shape", () => {
  it("returns a digest with expected fields", () => {
    const heya = MockFactory.createHeya("heya-1");
    const world = MockFactory.createWorld({
      heyas: new Map([["heya-1", heya]]),
      playerHeyaId: "heya-1",
    });

    const digest = getPlayerDigest(world, "heya-1");

    expect(digest).toBeDefined();
    expect(digest?.heyaId).toBe("heya-1");
    expect(typeof digest?.runwayBand).toBe("string");
    expect(typeof digest?.rosterStrengthBand).toBe("string");
    expect(typeof digest?.moraleBand).toBe("string");
    expect(typeof digest?.rivalryClusters).toBe("number");
    expect(typeof digest?.financiallyFragileHeyas).toBe("number");
    expect(Array.isArray(digest?.recommendations)).toBe(true);
  });

  it("returns undefined when no playerHeyaId is set", () => {
    const world = MockFactory.createWorld({ playerHeyaId: undefined } as any);
    const digest = getPlayerDigest(world);
    expect(digest).toBeUndefined();
  });
});

describe("AdvisorService.generateRecommendations — duplicate rikishiIds (target behavior: deduped)", () => {
  it("counts active roster once per rikishi when ID is duplicated (no false undermanned)", () => {
    // ROSTER_LOW_THRESHOLD = 10. Create 11 unique active rikishi but list one ID twice
    // so the raw count would be 12 — still above threshold either way.
    // To make the test meaningful, use exactly 11 unique IDs but duplicate one to get 12 raw.
    // Actually, to prove dedup: use 9 unique active + duplicate one → 10 raw but 9 unique.
    // 9 unique < 10 threshold → undermanned. 10 raw >= 10 → not undermanned (false negative).
    const rikishiMap = new Map();
    const ids: string[] = [];
    for (let i = 0; i < 9; i++) {
      const id = `r-${i}`;
      const r = MockFactory.createRikishi(id, { heyaId: "h1", isRetired: false });
      rikishiMap.set(id, r);
      ids.push(id);
    }
    // Duplicate r-0 so raw length = 10 but unique = 9 (< threshold 10).
    ids.push("r-0");

    const heya = MockFactory.createHeya("h1", { rikishiIds: ids });
    const world = MockFactory.createWorld({
      heyas: new Map([["h1", heya]]),
      rikishi: rikishiMap,
      playerHeyaId: "h1",
    });

    const recs = generateRecommendations(world, "h1");
    const undermanned = recs.find((r) => r.id === "roster-undermanned");
    // With dedup: 9 unique active < 10 → undermanned should fire.
    // Without dedup: 10 raw >= 10 → would NOT fire (false negative).
    expect(undermanned).toBeDefined();
  });

  it("counts injured roster once per rikishi when ID is duplicated", () => {
    // 5 non-injured active + 2 injured (unique) + 1 duplicate of an injured ID.
    // Without dedup: active=8, injured=3 → 3 > 8/3≈2.67 → injury-wave fires (FALSE).
    // With dedup: active=7, injured=2 → 2 > 7/3≈2.33 → does NOT fire (correct).
    const rikishiMap = new Map();
    const ids: string[] = [];
    for (let i = 0; i < 5; i++) {
      const id = `active-${i}`;
      const r = MockFactory.createRikishi(id, { heyaId: "h1", isRetired: false, injured: false });
      rikishiMap.set(id, r);
      ids.push(id);
    }
    for (let i = 0; i < 2; i++) {
      const id = `injured-${i}`;
      const r = MockFactory.createRikishi(id, { heyaId: "h1", isRetired: false, injured: true });
      rikishiMap.set(id, r);
      ids.push(id);
    }
    ids.push("injured-0"); // duplicate an injured ID

    const heya = MockFactory.createHeya("h1", { rikishiIds: ids });
    const world = MockFactory.createWorld({
      heyas: new Map([["h1", heya]]),
      rikishi: rikishiMap,
      playerHeyaId: "h1",
    });

    const recs = generateRecommendations(world, "h1");
    const injuryWave = recs.find((r) => r.id === "health-injury-wave");
    // With dedup: 2 unique injured, 7 unique active. 2 > 7/3≈2.33 → false → no alarm.
    expect(injuryWave).toBeUndefined();
  });
});
