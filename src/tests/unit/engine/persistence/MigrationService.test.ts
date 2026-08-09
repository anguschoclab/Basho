import { describe, it, expect, vi, beforeEach } from "vitest";
import { MigrationService } from "@/engine/persistence/MigrationService";
import { CURRENT_SAVE_VERSION, KNOWN_SAVE_VERSIONS } from "@/engine/types/save";
import type { SaveGame, SaveVersion } from "@/engine/types/save";
import { logger } from "@/engine/utils/Logger";

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

describe("MigrationService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("identity / no-op", () => {
    it("passes a current-version save through unchanged", () => {
      const save = makeMinimalSave(CURRENT_SAVE_VERSION);
      const result = MigrationService.migrateSave(save);
      expect(result.save.version).toBe(CURRENT_SAVE_VERSION);
      expect(result.save).toEqual(save);
      expect(result.context.logs).toHaveLength(0);
    });

    it("does not mutate the original save object", () => {
      const save = makeMinimalSave("1.0.0");
      const originalVersion = save.version;
      MigrationService.migrateSave(save);
      expect(save.version).toBe(originalVersion);
    });
  });

  describe("version bump 1.0.0 → 1.1.0", () => {
    it("upgrades a 1.0.0 save to CURRENT_SAVE_VERSION", () => {
      const save = makeMinimalSave("1.0.0");
      const result = MigrationService.migrateSave(save);
      expect(result.save.version).toBe(CURRENT_SAVE_VERSION);
      expect(result.context.fromVersion).toBe("1.0.0");
      expect(result.context.toVersion).toBe(CURRENT_SAVE_VERSION);
      expect(result.context.logs.length).toBeGreaterThan(0);
    });
  });

  describe("metadata defaults", () => {
    it("populates missing createdAtISO from lastSavedAtISO", () => {
      const save = makeMinimalSave("1.0.0", {
        createdAtISO: undefined as unknown as string,
        lastSavedAtISO: "2025-06-01T00:00:00Z",
      });
      const result = MigrationService.migrateSave(save);
      expect(result.save.createdAtISO).toBe("2025-06-01T00:00:00Z");
    });

    it("populates missing ruleset with defaults", () => {
      const save = makeMinimalSave("1.0.0", {
        ruleset: undefined as unknown as SaveGame["ruleset"],
      });
      const result = MigrationService.migrateSave(save);
      expect(result.save.ruleset).toEqual({
        banzukeAlgorithm: "slot_fill_v1",
        kimariteRegistryVersion: "82_official_v1",
      });
    });

    it("defaults missing playTimeMinutes to 0", () => {
      const save = makeMinimalSave("1.0.0");
      delete (save as Partial<SaveGame>).playTimeMinutes;
      const result = MigrationService.migrateSave(save);
      expect(result.save.playTimeMinutes).toBe(0);
    });
  });

  describe("events.version fix", () => {
    it("sets events.version to 1.0.0 when missing", () => {
      const save = makeMinimalSave("1.0.0");
      const events = { log: [], dedupe: {} } as unknown as SaveGame["world"]["events"];
      (save.world as { events: unknown }).events = events;
      const result = MigrationService.migrateSave(save);
      const worldEvents = result.save.world.events as { version?: string };
      expect(worldEvents.version).toBe("1.0.0");
    });
  });

  describe("sponsor pool normalization", () => {
    it("detects Rikishi-shaped sponsor entries and drops them", () => {
      const save = makeMinimalSave("1.0.0");
      (save.world as { sponsorPool?: unknown }).sponsorPool = {
        sponsors: {
          "sp_1": {
            id: "rikishi-1",
            shikona: "Test Rikishi",
            heyaId: "heya-1",
            rank: "maegashira",
            stats: { power: 50 },
          },
        },
        koenkais: {},
      };
      const warnSpy = vi.spyOn(logger, "warn").mockImplementation(() => {});
      const result = MigrationService.migrateSave(save);
      const pool = result.save.world.sponsorPool as { sponsors: Record<string, unknown> };
      expect(Object.keys(pool.sponsors)).toHaveLength(0);
      expect(warnSpy).toHaveBeenCalled();
      warnSpy.mockRestore();
    });

    it("preserves valid Sponsor-shaped entries", () => {
      const validSponsor = {
        sponsorId: "sp_1",
        displayName: "Test Sponsor",
        category: "local_business",
        tier: "T1",
        originRegionId: "tokyo",
        industryTag: "retail",
        toneTag: "traditional",
        prestigeAffinity: 50,
        loyalty: 50,
        scandalTolerance: 50,
        riskAppetite: 50,
        visibilityPreference: 1,
        active: true,
        satisfaction: 80,
        createdAtTick: 1,
        lastSeenTick: 10,
        relationships: [],
      };
      const save = makeMinimalSave("1.0.0");
      (save.world as { sponsorPool?: unknown }).sponsorPool = {
        sponsors: { sp_1: validSponsor },
        koenkais: {},
      };
      const result = MigrationService.migrateSave(save);
      const pool = result.save.world.sponsorPool as { sponsors: Record<string, typeof validSponsor> };
      expect(pool.sponsors["sp_1"]).toEqual(validSponsor);
    });

    it("preserves valid koenkai entries", () => {
      const validKoenkai = {
        koenkaiId: "k_1",
        heyaId: "heya-1",
        strengthBand: "moderate",
        members: [],
        createdAtTick: 1,
        lastChangedTick: 10,
      };
      const save = makeMinimalSave("1.0.0");
      (save.world as { sponsorPool?: unknown }).sponsorPool = {
        sponsors: {},
        koenkais: { k_1: validKoenkai },
      };
      const result = MigrationService.migrateSave(save);
      const pool = result.save.world.sponsorPool as { koenkais: Record<string, typeof validKoenkai> };
      expect(pool.koenkais["k_1"]).toEqual(validKoenkai);
    });
  });

  describe("fault tolerance", () => {
    it("does not abort migration when sponsorPool is corrupt", () => {
      const save = makeMinimalSave("1.0.0");
      (save.world as { sponsorPool?: unknown }).sponsorPool = "not-an-object";
      const warnSpy = vi.spyOn(logger, "warn").mockImplementation(() => {});
      const result = MigrationService.migrateSave(save);
      expect(result.save.version).toBe(CURRENT_SAVE_VERSION);
      expect(warnSpy).toHaveBeenCalled();
      warnSpy.mockRestore();
    });

    it("does not abort migration when events is corrupt", () => {
      const save = makeMinimalSave("1.0.0");
      (save.world as { events?: unknown }).events = "corrupt";
      const warnSpy = vi.spyOn(logger, "warn").mockImplementation(() => {});
      const result = MigrationService.migrateSave(save);
      expect(result.save.version).toBe(CURRENT_SAVE_VERSION);
      expect(warnSpy).toHaveBeenCalled();
      warnSpy.mockRestore();
    });
  });

  describe("unknown version rejection", () => {
    it("throws for a version not in KNOWN_SAVE_VERSIONS", () => {
      const save = makeMinimalSave("1.0.0");
      (save as { version: string }).version = "0.9.0";
      expect(() => MigrationService.migrateSave(save)).toThrow();
    });
  });

  describe("KNOWN_SAVE_VERSIONS", () => {
    it("includes both 1.0.0 and 1.1.0", () => {
      expect(KNOWN_SAVE_VERSIONS).toContain("1.0.0");
      expect(KNOWN_SAVE_VERSIONS).toContain("1.1.0");
    });
  });
});
