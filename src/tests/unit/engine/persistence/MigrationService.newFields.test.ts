import { describe, it, expect, vi, beforeEach } from "vitest";
import { MigrationService } from "@/engine/persistence/MigrationService";
import { CURRENT_SAVE_VERSION, KNOWN_SAVE_VERSIONS } from "@/engine/types/save";
import type { SaveGame, SaveVersion } from "@/engine/types/save";

function makeV1_2_0Save(): SaveGame {
  return {
    version: "1.2.0",
    createdAtISO: "2025-01-01T00:00:00Z",
    lastSavedAtISO: "2025-06-01T00:00:00Z",
    ruleset: {
      banzukeAlgorithm: "slot_fill_v1",
      kimariteRegistryVersion: "82_official_v1",
    },
    world: {
      seed: "test-migration",
      year: 2025,
      week: 1,
      cyclePhase: "interim",
      heyas: {},
      closedHeyas: {},
      rikishi: {},
      historicalRikishi: {},
      activeRikishiIds: [],
      oyakata: {},
      staff: {},
      history: [],
      lineage: [],
      records: {
        allTime: {
          careerWins: [],
          makuuchiWins: [],
          yusho: [],
          consecutiveYusho: [],
          kinboshi: [],
        },
        active: { careerWins: [], makuuchiWins: [], yusho: [], consecutiveYusho: [], kinboshi: [] },
      },
      events: { version: "1.0.0", log: [], dedupe: {} },
      dayIndexGlobal: 0,
      almanacSnapshots: [],
      settings: { archiveMode: "standard" },
    },
  } as SaveGame;
}

describe("MigrationService — new fields (1.2.0 → 1.3.0)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("migrates 1.2.0 to 1.3.0", () => {
    const save = makeV1_2_0Save();
    const result = MigrationService.migrateSave(save);
    expect(result.save.version).toBe("1.3.0");
  });

  it("does not corrupt existing world data during migration", () => {
    const save = makeV1_2_0Save();
    const seedBefore = save.world.seed;
    const result = MigrationService.migrateSave(save);
    expect(result.save.world.seed).toBe(seedBefore);
  });

  it("idempotent: migrating a 1.3.0 save is a no-op", () => {
    const save = makeV1_2_0Save();
    const migrated = MigrationService.migrateSave(save);
    const migratedAgain = MigrationService.migrateSave(migrated.save);
    expect(migratedAgain.save.version).toBe("1.3.0");
    expect(migratedAgain.context.logs).toHaveLength(0);
  });

  it("CURRENT_SAVE_VERSION is 1.3.0", () => {
    expect(CURRENT_SAVE_VERSION).toBe("1.3.0");
  });

  it("KNOWN_SAVE_VERSIONS includes 1.3.0", () => {
    expect(KNOWN_SAVE_VERSIONS).toContain("1.3.0");
  });

  it("migration path from 1.2.0 to 1.3.0 has exactly one step", () => {
    const steps = MigrationService.getMigrationPath("1.2.0", "1.3.0");
    expect(steps).toHaveLength(1);
  });
});
