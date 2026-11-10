import { describe, it, expect } from "vitest";
import { MigrationService } from "@/engine/persistence/MigrationService";
import { CURRENT_SAVE_VERSION, KNOWN_SAVE_VERSIONS } from "@/engine/types/save";
import type { SaveGame, SaveVersion } from "@/engine/types/save";

function makeMinimalSave(version: SaveVersion, overrides: Partial<SaveGame> = {}): SaveGame {
  return {
    version,
    createdAtISO: "2025-01-01T00:00:00Z",
    lastSavedAtISO: "2025-06-01T00:00:00Z",
    ruleset: {
      banzukeAlgorithm: "slot_fill_v1",
      kimariteRegistryVersion: "82_official_v1",
    },
    world: {
      seed: "test-seed",
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
    ...overrides,
  } as SaveGame;
}

describe("MigrationService — version gate", () => {
  describe("current version", () => {
    it("passes a current-version save through unchanged", () => {
      const save = makeMinimalSave(CURRENT_SAVE_VERSION);
      const result = MigrationService.migrateSave(save);
      expect(result.save).toBe(save);
      expect(result.context.fromVersion).toBe(CURRENT_SAVE_VERSION);
      expect(result.context.toVersion).toBe(CURRENT_SAVE_VERSION);
    });

    it("does not mutate the original save object", () => {
      const save = makeMinimalSave(CURRENT_SAVE_VERSION);
      const snapshot = JSON.stringify(save);
      MigrationService.migrateSave(save);
      expect(JSON.stringify(save)).toBe(snapshot);
    });
  });

  describe("prior versions — rejected, not migrated", () => {
    it.each(KNOWN_SAVE_VERSIONS.filter((v) => v !== CURRENT_SAVE_VERSION))(
      "throws a no-longer-supported error for known version %s",
      (version) => {
        const save = makeMinimalSave(version);
        expect(() => MigrationService.migrateSave(save)).toThrow(/no longer supported/i);
      }
    );

    it("throws an unknown-version error for unrecognized versions", () => {
      const save = makeMinimalSave("9.9.9" as SaveVersion);
      expect(() => MigrationService.migrateSave(save)).toThrow(/unknown save version/i);
    });

    it("rejects rather than partially upgrading a 1.0.0 save", () => {
      const save = makeMinimalSave("1.0.0");
      expect(() => MigrationService.migrateSave(save)).toThrow(/no longer supported/i);
    });
  });
});
