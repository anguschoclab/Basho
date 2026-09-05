import { describe, it, expect } from "vitest";
import { MigrationService } from "@/engine/persistence/MigrationService";
import { CURRENT_SAVE_VERSION } from "@/engine/types/save";
import type { SerializedSave } from "@/engine/types/save";

function makeV1_2_0Save(): SerializedSave {
  return {
    version: "1.2.0",
    world: {
      seed: "test-migration",
      year: 2024,
      heyas: {},
      rikishi: {},
    } as any,
    metadata: {
      createdAt: Date.now(),
      lastSavedAt: Date.now(),
    },
  } as any;
}

describe("MigrationService — new fields (1.2.0 → 1.3.0)", () => {
  it("migrates 1.2.0 to 1.3.0", () => {
    const save = makeV1_2_0Save();
    const result = MigrationService.migrate(save);
    expect(result.version).toBe("1.3.0");
  });

  it("does not corrupt existing world data during migration", () => {
    const save = makeV1_2_0Save();
    const worldBefore = save.world;
    const result = MigrationService.migrate(save);
    expect(result.world).toEqual(worldBefore);
  });

  it("idempotent: migrating a 1.3.0 save is a no-op", () => {
    const save = makeV1_2_0Save();
    const migrated = MigrationService.migrate(save);
    const migratedAgain = MigrationService.migrate(migrated);
    expect(migratedAgain.version).toBe("1.3.0");
    expect(migratedAgain).toEqual(migrated);
  });

  it("CURRENT_SAVE_VERSION is 1.3.0", () => {
    expect(CURRENT_SAVE_VERSION).toBe("1.3.0");
  });
});
