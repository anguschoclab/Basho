import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { SerializationService } from "@/engine/persistence/SerializationService";
import { NON_PERSISTED_WORLD_FIELDS } from "@/engine/types/save";
import { boundHistoryArrays, HISTORY_MAX_ENTRIES } from "@/engine/tick/phases/boundHistoryArrays";
import { MockFactory } from "@/tests/helpers/utils/MockFactory";
import type { BashoResult } from "@/engine/types/basho";

const SRC = join(import.meta.dirname, "../../..");

/**
 * Extracts top-level property names from an exported interface in a .ts source
 * file. Nested object-literal members are indented deeper than two spaces, so
 * anchoring on exactly two spaces yields only the interface's own fields.
 */
function interfaceFields(relPath: string, interfaceName: string): string[] {
  const source = readFileSync(join(SRC, relPath), "utf-8");
  const start = source.indexOf(`export interface ${interfaceName} {`);
  if (start === -1) throw new Error(`Interface ${interfaceName} not found in ${relPath}`);
  const end = source.indexOf("\n}", start);
  const body = source.slice(start, end);
  const fields = new Set<string>();
  for (const line of body.split("\n")) {
    const m = /^ {2}([_a-zA-Z][_a-zA-Z0-9]*)\??:/.exec(line);
    if (m) fields.add(m[1]);
  }
  return [...fields].sort();
}

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

describe("L4.9: save/load integrity — field parity", () => {
  it("every WorldState field is persisted or explicitly excluded", () => {
    const worldFields = interfaceFields("engine/types/world.ts", "WorldState");
    const serializedFields = new Set(
      interfaceFields("engine/types/save.ts", "SerializedWorldState")
    );

    const unaccounted = worldFields.filter(
      (f) => !serializedFields.has(f) && !(f in NON_PERSISTED_WORLD_FIELDS)
    );

    expect(
      unaccounted,
      `WorldState fields are neither serialized nor listed in NON_PERSISTED_WORLD_FIELDS:\n` +
        `${unaccounted.join("\n")}\n\n` +
        `Add each to SerializedWorldState (and to serializeWorld/deserializeWorld), ` +
        `or to NON_PERSISTED_WORLD_FIELDS with a reason.`
    ).toEqual([]);
  });

  it("NON_PERSISTED_WORLD_FIELDS has no stale entries", () => {
    const worldFields = new Set(interfaceFields("engine/types/world.ts", "WorldState"));
    const stale = Object.keys(NON_PERSISTED_WORLD_FIELDS).filter((f) => !worldFields.has(f));
    expect(stale, `Listed as excluded but no longer on WorldState: ${stale.join(", ")}`).toEqual(
      []
    );
  });

  it("serializeWorld writes every field declared on SerializedWorldState", () => {
    const declared = interfaceFields("engine/types/save.ts", "SerializedWorldState");
    const world = makeMockWorld();
    const written = new Set(Object.keys(SerializationService.serializeWorld(world)));

    const missing = declared.filter((f) => !written.has(f));
    expect(
      missing,
      `Declared on SerializedWorldState but never written by serializeWorld: ${missing.join(", ")}`
    ).toEqual([]);
  });

  it("round-trips calendar, phase counters, era drift and player knowledge", () => {
    const world = makeMockWorld();
    world.calendar = { currentWeek: 7, month: 3, currentDay: 4 };
    world._interimDaysRemaining = 5;
    world._postBashoDays = 2;
    world._daysSinceLastWeeklyTick = 3;
    world.meta = { tone: "technical", drift: { yorikiri: 0.4 } };
    world.globalKimariteStats = { yorikiri: 12 };
    world.playerKnowledge = { scouting: {}, bookmarks: [] };
    world.governanceLog = [];
    world.yokozunaVacancyStreak = 4;
    world._populationTarget = 640;

    const loaded = SerializationService.deserializeWorld(
      JSON.parse(JSON.stringify(SerializationService.serializeWorld(world)))
    );

    expect(loaded.calendar).toEqual({ currentWeek: 7, month: 3, currentDay: 4 });
    expect(loaded._interimDaysRemaining).toBe(5);
    expect(loaded._postBashoDays).toBe(2);
    expect(loaded._daysSinceLastWeeklyTick).toBe(3);
    expect(loaded.meta).toEqual({ tone: "technical", drift: { yorikiri: 0.4 } });
    expect(loaded.globalKimariteStats).toEqual({ yorikiri: 12 });
    expect(loaded.playerKnowledge).toEqual({ scouting: {}, bookmarks: [] });
    expect(loaded.governanceLog).toEqual([]);
    expect(loaded.yokozunaVacancyStreak).toBe(4);
    expect(loaded._populationTarget).toBe(640);
  });

  it("rehydrates Map-typed fields as Maps, not records", () => {
    const world = makeMockWorld();
    world.sparringPairs = new Map([["heya-0", { pairs: [] } as never]]);

    const loaded = SerializationService.deserializeWorld(
      JSON.parse(JSON.stringify(SerializationService.serializeWorld(world)))
    );

    expect(loaded.sparringPairs).toBeInstanceOf(Map);
    expect(loaded.sparringPairs?.get("heya-0")).toEqual({ pairs: [] });
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
