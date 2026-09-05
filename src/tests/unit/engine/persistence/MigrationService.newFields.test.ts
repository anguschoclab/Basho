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
      heyas: {
        "h1": {
          id: "h1",
          name: "Test Heya",
          funds: 1_000_000,
          rikishiIds: ["r1"],
        },
      } as any,
      closedHeyas: {},
      rikishi: {
        "r1": {
          id: "r1",
          name: "Test Rikishi",
          heyaId: "h1",
        },
      } as any,
      historicalRikishi: {},
      activeRikishiIds: ["r1"],
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

  it("explicitly initializes heya.jungyoOptOut on existing saves", () => {
    const save = makeV1_2_0Save();
    const result = MigrationService.migrateSave(save);
    const heya = (result.save.world as any).heyas["h1"];
    expect(heya).toBeDefined();
    expect("jungyoOptOut" in heya).toBe(true);
    expect(heya.jungyoOptOut).toBeUndefined();
  });

  it("explicitly initializes heya.foreignAcademies on existing saves", () => {
    const save = makeV1_2_0Save();
    const result = MigrationService.migrateSave(save);
    const heya = (result.save.world as any).heyas["h1"];
    expect("foreignAcademies" in heya).toBe(true);
    expect(heya.foreignAcademies).toBeUndefined();
  });

  it("explicitly initializes heya.youthAcademy on existing saves", () => {
    const save = makeV1_2_0Save();
    const result = MigrationService.migrateSave(save);
    const heya = (result.save.world as any).heyas["h1"];
    expect("youthAcademy" in heya).toBe(true);
    expect(heya.youthAcademy).toBeUndefined();
  });

  it("explicitly initializes rikishi.tsukebitoPlayerSet on existing saves", () => {
    const save = makeV1_2_0Save();
    const result = MigrationService.migrateSave(save);
    const r = (result.save.world as any).rikishi["r1"];
    expect(r).toBeDefined();
    expect("tsukebitoPlayerSet" in r).toBe(true);
    expect(r.tsukebitoPlayerSet).toBeUndefined();
  });

  it("preserves existing heya data (funds, name) during migration", () => {
    const save = makeV1_2_0Save();
    const result = MigrationService.migrateSave(save);
    const heya = (result.save.world as any).heyas["h1"];
    expect(heya.name).toBe("Test Heya");
    expect(heya.funds).toBe(1_000_000);
  });
});
