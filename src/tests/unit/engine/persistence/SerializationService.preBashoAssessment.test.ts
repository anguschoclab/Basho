/**
 * SerializationService.preBashoAssessment.test.ts
 *
 * Regression tests for nested-Map serialization loss (audit WS5-02) and
 * hollow-save validation (audit WS5-07).
 *
 * `_preBashoAssessment.rikishiAssessments` is a `Map` nested inside a field
 * that serializeWorld copies verbatim. `JSON.stringify` reduces the Map to
 * `{}`, and deserializeWorld copies the husk back — so a save taken during
 * `pre_basho` yields a world whose `rikishiAssessments` is a plain object,
 * and `PreBashoAssessment.tsx` crashes on `.size`/`.entries()`.
 */
import { describe, it, expect } from "vitest";
import { SerializationService } from "@/engine/persistence/SerializationService";
import { SaveSlotService } from "@/engine/persistence/SaveSlotService";
import { MockFactory } from "../../../helpers/utils/MockFactory";
import { CURRENT_SAVE_VERSION } from "@/engine/types/save";
import type { PreBashoAssessment } from "@/engine/types/world";

function makeAssessment(): PreBashoAssessment {
  return {
    assessedAtWeek: 3,
    overallHealthScore: 72,
    withdrawalsThisAssessment: 1,
    rikishiAssessments: new Map([
      [
        "r1",
        {
          rikishiId: "r1",
          healthScore: 55,
          injuryRisk: "high",
          recommendedFocus: "protect",
          withdrawalRecommended: true,
        },
      ],
      [
        "r2",
        {
          rikishiId: "r2",
          healthScore: 90,
          injuryRisk: "low",
          recommendedFocus: "normal",
          withdrawalRecommended: false,
        },
      ],
    ]),
  };
}

describe("SerializationService — _preBashoAssessment nested Map", () => {
  it("survives a JSON round trip with rikishiAssessments intact as a Map", () => {
    const world = MockFactory.createWorld({
      _preBashoAssessment: makeAssessment(),
    });

    const serialized = SerializationService.serializeWorld(world);
    const rehydrated = SerializationService.deserializeWorld(
      JSON.parse(JSON.stringify(serialized))
    );

    const restored = rehydrated._preBashoAssessment;
    expect(restored).toBeDefined();
    expect(restored!.rikishiAssessments).toBeInstanceOf(Map);
    expect(restored!.rikishiAssessments.size).toBe(2);
    expect(restored!.rikishiAssessments.get("r1")?.injuryRisk).toBe("high");
    expect(restored!.rikishiAssessments.get("r2")?.recommendedFocus).toBe("normal");
  });

  it("round-trips cleanly when _preBashoAssessment is absent", () => {
    const world = MockFactory.createWorld({});
    const serialized = SerializationService.serializeWorld(world);
    const rehydrated = SerializationService.deserializeWorld(
      JSON.parse(JSON.stringify(serialized))
    );
    expect(rehydrated._preBashoAssessment).toBeUndefined();
  });
});

describe("SaveSlotService.isValidSave — hollow world rejection", () => {
  it("rejects a version-valid save whose world lacks required shape", () => {
    const hollow = { version: CURRENT_SAVE_VERSION, world: {} };
    expect(SaveSlotService.isValidSave(hollow)).toBe(false);
  });

  it("rejects a save whose world is missing the seed", () => {
    const world = MockFactory.createWorld({});
    const serialized = SerializationService.serializeWorld(world);
    const noSeed = { ...serialized, seed: undefined };
    expect(SaveSlotService.isValidSave({ version: CURRENT_SAVE_VERSION, world: noSeed })).toBe(
      false
    );
  });

  it("still accepts a real serialized save", () => {
    const world = MockFactory.createWorld({});
    const serialized = SerializationService.serializeWorld(world);
    expect(SaveSlotService.isValidSave({ version: CURRENT_SAVE_VERSION, world: serialized })).toBe(
      true
    );
  });
});
