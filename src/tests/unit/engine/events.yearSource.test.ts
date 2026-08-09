import { describe, it, expect } from "vitest";
import { logEngineEvent } from "@/engine/events";
import { makeMockWorld } from "./utils";

describe("events year source of truth", () => {
  it("logEngineEvent uses world.year even when calendar.year differs", () => {
    const world = makeMockWorld({
      year: 2026,
      calendar: { currentWeek: 1, month: 1, currentDay: 1 } as any,
    });

    const event = logEngineEvent(world, {
      type: "LIFECYCLE_EVENT",
      category: "career",
      title: "Year Source Test",
      summary: "Checking that world.year is authoritative",
      data: {},
    });

    expect(event.year).toBe(2026);
  });

  it("logEngineEvent falls back to world.year when calendar.year is absent", () => {
    const world = makeMockWorld({
      year: 2026,
      calendar: { currentWeek: 1, month: 1, currentDay: 1 } as any,
    });

    const event = logEngineEvent(world, {
      type: "LIFECYCLE_EVENT",
      category: "career",
      title: "Year Source Test",
      summary: "Checking fallback to world.year",
      data: {},
    });

    expect(event.year).toBe(2026);
  });
});
