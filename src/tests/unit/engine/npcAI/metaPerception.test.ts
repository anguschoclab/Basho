/**
 * WS1 — Meta-drift perception (canon §§6–8).
 *
 * world.meta already computes era tone + per-kimarite drift yearly and feeds
 * bout physics, but no manager ever *perceives* the meta. buildMetaPerception
 * is the non-cheating interface: it reads only completed yearly assessments
 * (meta.history), bands everything, and never exposes raw drift factors or
 * kimarite counts.
 */

import { describe, it, expect } from "vitest";
import { buildMetaPerception } from "@/engine/npcAI/MetaPerception";
import { buildLeaguePerception } from "@/engine/npcAI/LeaguePerception";
import { processYearlyEraDrift } from "@/engine/systems/meta/EraDriftService";
import { resolveImpacts } from "@/engine/core/ImpactResolver";
import { SerializationService } from "@/engine/persistence/SerializationService";
import { MockFactory } from "@/tests/helpers/utils/MockFactory";

// Registry families: oshidashi → push; uwatenage/shitatenage → belt.
const PUSH_HEAVY_STATS = {
  oshidashi: 1200,
  uwatenage: 150,
  shitatenage: 100,
};

describe("buildMetaPerception", () => {
  it("exposes banded meta signals only — no raw drift factors or counts", () => {
    const world = MockFactory.createWorld({
      meta: {
        tone: "explosive",
        drift: { oshidashi: 1.4 },
        history: [
          { year: 2030, tone: "explosive", familyShares: { push: 0.62, belt: 0.2, speed: 0.1, trick: 0.08 } },
        ],
      },
    });

    const meta = buildMetaPerception(world);

    expect(meta.eraTone).toBe("explosive");
    expect(meta.dominantFamily).toBe("push");
    expect(["unclear", "emerging", "established"]).toContain(meta.dominanceBand);
    expect(["strengthening", "stable", "reversing"]).toContain(meta.trend);
    for (const band of Object.values(meta.familyPresence)) {
      expect(["ascendant", "present", "waning", "absent"]).toContain(band);
    }
    // No raw numeric signal leaks: serialized perception carries no floats
    // derived from drift factors or share ratios.
    for (const [key, value] of Object.entries(meta)) {
      expect(typeof value, `field ${key} leaks a raw number`).not.toBe("number");
    }
  });

  it("reads only completed yearly assessments — live mid-year stats do not leak", () => {
    const world = MockFactory.createWorld({
      meta: {
        tone: "classic",
        drift: {},
        history: [
          { year: 2030, tone: "classic", familyShares: { push: 0.25, belt: 0.5, speed: 0.15, trick: 0.1 } },
        ],
      },
      globalKimariteStats: {},
    });

    const before = buildMetaPerception(world);
    expect(before.dominantFamily).toBe("belt");

    // Mid-year the crowd suddenly starts spamming push wins. Perception must
    // not react until EraDriftService completes the yearly assessment.
    world.globalKimariteStats = { ...PUSH_HEAVY_STATS };
    const after = buildMetaPerception(world);
    expect(after.dominantFamily).toBe("belt");
    expect(after).toEqual(before);
  });

  it("detects a strengthening trend when the dominant family grows across years", () => {
    const world = MockFactory.createWorld({
      meta: {
        tone: "explosive",
        drift: {},
        history: [
          { year: 2029, tone: "explosive", familyShares: { push: 0.45, belt: 0.3, speed: 0.15, trick: 0.1 } },
          { year: 2030, tone: "explosive", familyShares: { push: 0.6, belt: 0.22, speed: 0.1, trick: 0.08 } },
        ],
      },
    });

    const meta = buildMetaPerception(world);
    expect(meta.dominantFamily).toBe("push");
    expect(meta.trend).toBe("strengthening");
    expect(meta.familyPresence.push).toBe("ascendant");
  });

  it("detects a reversing trend when the dominant family share collapses", () => {
    const world = MockFactory.createWorld({
      meta: {
        tone: "explosive",
        drift: {},
        history: [
          { year: 2029, tone: "explosive", familyShares: { push: 0.6, belt: 0.2, speed: 0.1, trick: 0.1 } },
          { year: 2030, tone: "explosive", familyShares: { push: 0.38, belt: 0.34, speed: 0.15, trick: 0.13 } },
        ],
      },
    });

    const meta = buildMetaPerception(world);
    expect(meta.trend).toBe("reversing");
    expect(meta.familyPresence.push).toBe("waning");
  });

  it("reports no dominant family and unclear dominance on empty history", () => {
    const world = MockFactory.createWorld({
      meta: { tone: "classic", drift: {} },
    });

    const meta = buildMetaPerception(world);
    expect(meta.dominantFamily).toBe("none");
    expect(meta.dominanceBand).toBe("unclear");
    expect(meta.trend).toBe("stable");
  });

  it("bands injury climate from active roster injury counts", () => {
    const healthy = MockFactory.createWorld({
      rikishi: new Map(
        Array.from({ length: 10 }, (_, i) => [
          `r${i}`,
          MockFactory.createRikishi({ id: `r${i}`, injured: false, isKyujo: false }),
        ])
      ),
      meta: { tone: "classic", drift: {} },
    });
    expect(buildMetaPerception(healthy).injuryClimate).toBe("low");

    const battered = MockFactory.createWorld({
      rikishi: new Map(
        Array.from({ length: 10 }, (_, i) => [
          `r${i}`,
          MockFactory.createRikishi({ id: `r${i}`, injured: i < 4, isKyujo: i < 4 }),
        ])
      ),
      meta: { tone: "classic", drift: {} },
    });
    expect(buildMetaPerception(battered).injuryClimate).toBe("elevated");
  });
});

describe("EraDriftService meta history", () => {
  it("appends a history entry with computed family shares on yearly assessment", () => {
    const world = MockFactory.createWorld({
      year: 2031,
      meta: { tone: "classic", drift: {} },
      globalKimariteStats: { ...PUSH_HEAVY_STATS },
    });

    const next = resolveImpacts(world, [processYearlyEraDrift(world)]);

    expect(next.meta.history).toHaveLength(1);
    const entry = next.meta.history![0];
    expect(entry.year).toBe(2031);
    expect(entry.tone).toBe("explosive"); // push-dominant year
    expect(entry.familyShares.push).toBeGreaterThan(entry.familyShares.belt);
    expect(entry.familyShares.push + entry.familyShares.belt + entry.familyShares.speed + entry.familyShares.trick).toBeCloseTo(1, 5);
  });

  it("preserves prior history across the yearly meta overwrite and caps the window", () => {
    let world = MockFactory.createWorld({
      year: 2025,
      meta: { tone: "classic", drift: {} },
      globalKimariteStats: { ...PUSH_HEAVY_STATS },
    });

    for (let y = 0; y < 8; y++) {
      world.year += 1;
      // EraDriftService resets globalKimariteStats after each assessment.
      world.globalKimariteStats = { ...PUSH_HEAVY_STATS };
      world = resolveImpacts(world, [processYearlyEraDrift(world)]);
    }

    expect(world.meta.history!.length).toBeLessThanOrEqual(5);
    // Most recent entry corresponds to the latest completed year.
    expect(world.meta.history!.at(-1)!.year).toBe(world.year);
  });
});

describe("meta serialization", () => {
  it("meta.history survives a serialize/deserialize round-trip", () => {
    const world = MockFactory.createWorld({
      meta: {
        tone: "explosive",
        drift: { oshidashi: 1.2 },
        history: [
          { year: 2030, tone: "explosive", familyShares: { push: 0.6, belt: 0.2, speed: 0.1, trick: 0.1 } },
        ],
      },
    });

    const restored = SerializationService.deserializeWorld(
      SerializationService.serializeWorld(world)
    );

    expect(restored.meta).toEqual(world.meta);
    expect(restored.meta.history).toHaveLength(1);
    expect(restored.meta.history![0].familyShares.push).toBeCloseTo(0.6, 5);
  });
});

describe("buildLeaguePerception", () => {
  it("includes the meta perception snapshot", () => {
    const world = MockFactory.createWorld({
      meta: {
        tone: "explosive",
        drift: {},
        history: [
          { year: 2030, tone: "explosive", familyShares: { push: 0.6, belt: 0.2, speed: 0.1, trick: 0.1 } },
        ],
      },
      heyas: new Map(),
      rivalriesState: { pairs: {} } as never,
    });

    const perception = buildLeaguePerception(world);
    expect(perception.meta).toBeDefined();
    expect(perception.meta!.dominantFamily).toBe("push");
  });
});
