import { describe, it, expect } from "vitest";
import { advanceOneDay } from "@/engine/tick/tickDaily";
import { runPipeline } from "@/engine/tick/pipelineRunner";
import * as phases from "@/engine/tick/phases";
import { makeMockWorld } from "../utils";
import type { WorldState } from "@/engine/types/world";

/**
 * Deep-freeze an object recursively to detect mutations in development.
 */
function deepFreeze<T>(obj: T): T {
  if (obj === null || typeof obj !== "object") return obj;
  if (obj instanceof Map) {
    obj.forEach((v) => deepFreeze(v));
    return obj;
  }
  if (obj instanceof Set) {
    obj.forEach((v) => deepFreeze(v));
    return obj;
  }
  const propNames = Object.getOwnPropertyNames(obj);
  for (const name of propNames) {
    const value = (obj as any)[name];
    if (value && typeof value === "object") {
      deepFreeze(value);
    }
  }
  return Object.freeze(obj) as T;
}

describe("pipeline immutability", () => {
  it("advanceOneDay does not mutate the input world", () => {
    const world = makeMockWorld({
      dayIndexGlobal: 0,
      calendar: { month: 1, currentWeek: 1, currentDay: 1 },
    });

    const frozen = deepFreeze(world);

    // Should not throw; if any phase mutates frozen state, this will error
    expect(() => advanceOneDay(frozen)).not.toThrow();
  });

  it("runPipeline does not mutate the input world for each phase", () => {
    const world = makeMockWorld({
      dayIndexGlobal: 0,
      calendar: { month: 1, currentWeek: 1, currentDay: 1 },
    });

    const frozen = deepFreeze(world);

    const activePhases = [
      phases.phase00_preflight,
      phases.phase01_daily_economy,
      phases.phase01_daily_welfare,
      phases.phase01_daily_sponsors,
      phases.phase01_daily_drama,
      phases.phase01_monthly_market,
    ];

    expect(() => runPipeline(frozen, activePhases)).not.toThrow();
  });
});
