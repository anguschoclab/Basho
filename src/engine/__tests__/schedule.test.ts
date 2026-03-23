import { describe, it, expect, beforeEach } from "vitest";
import { mockRikishi } from "./utils";
import { scheduleDivisionDay } from "../schedule";
import type { WorldState } from "../types/world";
import type { BashoState } from "../types/basho";

describe("scheduleDivisionDay", () => {
  let world: WorldState;
  let basho: BashoState;

  beforeEach(() => {
    // Setup basic world state with some rikishi
    const rikishiMap = new Map();
    for (let i = 1; i <= 6; i++) {
      const id = `r${i}`;
      rikishiMap.set(
        id,
        mockRikishi(id, {
          division: "makuuchi",
          heyaId: `heya-${i}`, // Put them in different heyas to avoid same-heya restrictions by default
        })
      );
    }

    world = {
      rikishi: rikishiMap,
    } as unknown as WorldState;

    basho = {
      matches: [],
      standings: new Map(),
    } as unknown as BashoState;
  });

  it("should schedule the expected number of bouts (boutsPerDay or roster / 2)", () => {
    const matches = scheduleDivisionDay({
      world,
      basho,
      division: "makuuchi",
      day: 1,
      seed: "test-seed",
    });

    // 6 rikishi -> 3 matches
    expect(matches.length).toBe(3);
    expect(basho.matches.length).toBe(3);
    expect(basho.matches).toEqual(matches);
  });

  it("should exclude injured rikishi from the schedule", () => {
    // Mark r1 as injured
    const r1 = world.rikishi.get("r1")!;
    (r1 as any).injured = true;

    const matches = scheduleDivisionDay({
      world,
      basho,
      division: "makuuchi",
      day: 1,
      seed: "test-seed",
    });

    // 5 rikishi active -> Math.floor(5/2) = 2 matches
    expect(matches.length).toBe(2);

    // Ensure r1 is not in any match
    for (const m of matches) {
      expect(m.eastRikishiId).not.toBe("r1");
      expect(m.westRikishiId).not.toBe("r1");
    }
  });

  it("should correctly assign rikishi to matches (no rikishi fights twice in a day)", () => {
    const matches = scheduleDivisionDay({
      world,
      basho,
      division: "makuuchi",
      day: 1,
      seed: "test-seed",
    });

    const seenIds = new Set<string>();
    for (const m of matches) {
      expect(seenIds.has(m.eastRikishiId)).toBe(false);
      seenIds.add(m.eastRikishiId);

      expect(seenIds.has(m.westRikishiId)).toBe(false);
      seenIds.add(m.westRikishiId);
    }
  });

  it("should return early with an empty array if roster is less than 2", () => {
    // Clear rikishi
    world.rikishi.clear();
    world.rikishi.set("r1", mockRikishi("r1", { division: "makuuchi" }));

    const matches = scheduleDivisionDay({
      world,
      basho,
      division: "makuuchi",
      day: 1,
      seed: "test-seed",
    });

    expect(matches.length).toBe(0);
    expect(basho.matches.length).toBe(0);
  });

  it("should fall back to loose rules (allow repeats) if unable to fill the card under strict rules", () => {
    // We only have 4 rikishi in makuuchi to make this easier
    world.rikishi.clear();
    world.rikishi.set("r1", mockRikishi("r1", { heyaId: "h1", division: "makuuchi" }));
    world.rikishi.set("r2", mockRikishi("r2", { heyaId: "h2", division: "makuuchi" }));
    world.rikishi.set("r3", mockRikishi("r3", { heyaId: "h3", division: "makuuchi" }));
    world.rikishi.set("r4", mockRikishi("r4", { heyaId: "h4", division: "makuuchi" }));

    // Simulate they all fought each other somehow except pairs that we block
    // Specifically, let's just make basho.matches have bouts so they are repeat opponents
    // Roster is 4, so boutsPerDay = 2.
    // If we make r1 fight r2, r3, and r4. r1 has no non-repeat opponents.
    basho.matches.push({ day: 1, eastRikishiId: "r1", westRikishiId: "r2" } as any);
    basho.matches.push({ day: 2, eastRikishiId: "r1", westRikishiId: "r3" } as any);
    basho.matches.push({ day: 3, eastRikishiId: "r1", westRikishiId: "r4" } as any);

    const matches = scheduleDivisionDay({
      world,
      basho,
      division: "makuuchi",
      day: 4,
      seed: "test-seed",
      rules: {
        allowForcedRepeats: true
      }
    });

    // Should still produce 2 bouts because it falls back to looser candidates
    expect(matches.length).toBe(2);
  });

  it("should be deterministic based on seed", () => {
    const run1Matches = scheduleDivisionDay({
      world,
      basho,
      division: "makuuchi",
      day: 1,
      seed: "deterministic-seed",
    });

    // Reset basho matches
    basho.matches = [];

    const run2Matches = scheduleDivisionDay({
      world,
      basho,
      division: "makuuchi",
      day: 1,
      seed: "deterministic-seed",
    });

    expect(run1Matches).toEqual(run2Matches);
  });

  it("should respect maxActiveRikishi config", () => {
    const matches = scheduleDivisionDay({
      world,
      basho,
      division: "makuuchi",
      day: 1,
      seed: "test-seed",
      config: {
        division: "makuuchi",
        maxActiveRikishi: 4,
        boutsPerDay: 2
      }
    });

    // Because maxActiveRikishi is 4, only r1 to r4 (sorted by id) are considered.
    expect(matches.length).toBe(2);

    const usedIds = new Set(matches.flatMap(m => [m.eastRikishiId, m.westRikishiId]));
    expect(usedIds.has("r5")).toBe(false);
    expect(usedIds.has("r6")).toBe(false);
  });
});
