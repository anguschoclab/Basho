import { describe, it, expect, vi } from "vitest";
import { advanceOneDay } from "@/engine/tick/tickDaily";
import { makeMockWorld } from "../utils";
import * as Logger from "@/engine/utils/Logger";

describe("P1.5: Phase transition logging", () => {
  it("interim → banzuke_reveal produces a log via info()", () => {
    const spy = vi.spyOn(Logger, "info").mockImplementation(() => {});
    const world = makeMockWorld({
      cyclePhase: "interim",
      calendar: { year: 2025, month: 1, currentDay: 1, currentWeek: 1 } as any,
    });

    advanceOneDay(world);

    const transitionCall = spy.mock.calls.find(
      (call) => typeof call[0] === "string" && call[0].includes("Phase transition")
    );
    expect(transitionCall).toBeDefined();

    spy.mockRestore();
  });

  it("pre_basho → active_basho produces a log with basho name", () => {
    const spy = vi.spyOn(Logger, "info").mockImplementation(() => {});
    const world = makeMockWorld({
      cyclePhase: "pre_basho",
      currentBashoName: "hatsu",
      calendar: { year: 2025, month: 1, currentDay: 1, currentWeek: 1 } as any,
    });

    advanceOneDay(world);

    const transitionCall = spy.mock.calls.find(
      (call) =>
        typeof call[0] === "string" &&
        call[0].includes("Phase transition") &&
        call[0].includes("active_basho")
    );
    expect(transitionCall).toBeDefined();

    spy.mockRestore();
  });
});
