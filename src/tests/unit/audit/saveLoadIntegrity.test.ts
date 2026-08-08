import { describe, it, expect } from "vitest";
import { SerializationService } from "@/engine/persistence/SerializationService";
import { boundHistoryArrays, HISTORY_MAX_ENTRIES } from "@/engine/tick/phases/boundHistoryArrays";
import { MockFactory } from "@/tests/helpers/utils/MockFactory";
import type { BashoResult } from "@/engine/types/basho";

function makeMockWorld() {
  const world = MockFactory.createWorld({ seed: "save-load-test" });
  for (let i = 0; i < 5; i++) {
    const id = `rik-${i}`;
    world.rikishi.set(id, MockFactory.createRikishi(id, { shikona: `Rikishi ${i}` }));
  }
  world.heyas.set("heya-0", {
    id: "heya-0",
    name: "Test Heya",
    rikishiIds: ["rik-0", "rik-1", "rik-2", "rik-3", "rik-4"],
  } as never);
  return world;
}

describe("L4.9: save/load integrity — serialization round-trip", () => {
  it("serialize → deserialize preserves world state", () => {
    const world = makeMockWorld();
    const serialized = SerializationService.serializeWorld(world);
    const deserialized = SerializationService.deserializeWorld(serialized);

    expect(deserialized.seed).toBe(world.seed);
    expect(deserialized.year).toBe(world.year);
    expect(deserialized.rikishi.size).toBe(world.rikishi.size);
    expect(deserialized.heyas.size).toBe(world.heyas.size);

    for (const [id, riki] of world.rikishi) {
      const loaded = deserialized.rikishi.get(id);
      expect(loaded).toBeDefined();
      expect(loaded?.shikona).toBe(riki.shikona);
    }

    for (const [id, heya] of world.heyas) {
      const loaded = deserialized.heyas.get(id);
      expect(loaded).toBeDefined();
      expect(loaded?.name).toBe(heya.name);
    }
  });

  it("serialize → deserialize is idempotent (double round-trip)", () => {
    const world = makeMockWorld();
    const serialized1 = SerializationService.serializeWorld(world);
    const deserialized1 = SerializationService.deserializeWorld(serialized1);
    const serialized2 = SerializationService.serializeWorld(deserialized1);
    const deserialized2 = SerializationService.deserializeWorld(serialized2);

    expect(deserialized2.seed).toBe(deserialized1.seed);
    expect(deserialized2.rikishi.size).toBe(deserialized1.rikishi.size);
    expect(deserialized2.heyas.size).toBe(deserialized1.heyas.size);
  });

  it("serialized world is JSON-safe (no Map objects)", () => {
    const world = makeMockWorld();
    const serialized = SerializationService.serializeWorld(world);
    const json = JSON.stringify(serialized);
    const parsed = JSON.parse(json);
    expect(parsed.rikishi).toBeDefined();
    expect(parsed.heyas).toBeDefined();
    expect(typeof parsed.rikishi).toBe("object");
    expect(parsed.rikishi instanceof Map).toBe(false);
  });
});

describe("L4.9: save/load integrity — unbounded growth", () => {
  it("boundHistoryArrays caps world.history to HISTORY_MAX_ENTRIES (production code)", () => {
    const world = makeMockWorld();
    world.history = [];
    for (let i = 0; i < HISTORY_MAX_ENTRIES + 200; i++) {
      world.history.push({
        id: `b${i}`,
        year: 2020 + Math.floor(i / 6),
        bashoNumber: (i % 6) as 1 | 2 | 3 | 4 | 5 | 6,
        bashoName: "hatsu",
        yusho: "r1",
        junYusho: [],
        prizes: { yushoAmount: 0, junYushoAmount: 0, specialPrizes: 0 },
      } as BashoResult);
    }

    const bounded = boundHistoryArrays(world);

    expect(bounded.history.length).toBeLessThanOrEqual(HISTORY_MAX_ENTRIES);
    expect(bounded.history[bounded.history.length - 1].id).toBe(`b${HISTORY_MAX_ENTRIES + 199}`);
  });

  it("boundHistoryArrays is idempotent — serializing a bounded world round-trips correctly", () => {
    const world = makeMockWorld();
    world.history = [];
    for (let i = 0; i < HISTORY_MAX_ENTRIES + 100; i++) {
      world.history.push({
        id: `b${i}`,
        year: 2020 + Math.floor(i / 6),
        bashoNumber: (i % 6) as 1 | 2 | 3 | 4 | 5 | 6,
        bashoName: "hatsu",
        yusho: "r1",
        junYusho: [],
        prizes: { yushoAmount: 0, junYushoAmount: 0, specialPrizes: 0 },
      } as BashoResult);
    }

    const bounded = boundHistoryArrays(world);
    const serialized = SerializationService.serializeWorld(bounded);
    const deserialized = SerializationService.deserializeWorld(serialized);

    expect(deserialized.history.length).toBe(HISTORY_MAX_ENTRIES);
  });

  it("serialization handles large world without throwing", () => {
    const world = makeMockWorld();
    world.history = [];
    for (let i = 0; i < 1000; i++) {
      world.history.push({
        id: `b${i}`,
        year: 2020 + Math.floor(i / 6),
        bashoNumber: (i % 6) as 1 | 2 | 3 | 4 | 5 | 6,
        bashoName: "hatsu",
        yusho: "r1",
        junYusho: [],
        prizes: { yushoAmount: 0, junYushoAmount: 0, specialPrizes: 0 },
      } as BashoResult);
    }

    expect(() => {
      const serialized = SerializationService.serializeWorld(world);
      const deserialized = SerializationService.deserializeWorld(serialized);
      expect(deserialized.history?.length).toBe(1000);
    }).not.toThrow();
  });
});
