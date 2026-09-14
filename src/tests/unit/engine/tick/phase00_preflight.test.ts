import { describe, it, expect } from "vitest";
import { phase00_preflight } from "@/engine/tick/phases/phase00_preflight";
import { MockFactory } from "@/tests/helpers/utils/MockFactory";
import { INTERIM_WEEKS, DAYS_PER_WEEK } from "@/constants/engine/calendar";

describe("phase00_preflight", () => {
  it("transitions from post_basho to interim with calculated _interimDaysRemaining", () => {
    const world = MockFactory.createWorld({
      cyclePhase: "post_basho",
      currentBashoName: "natsu",
    });
    world._postBashoDays = 0;

    const impact = phase00_preflight(world);
    const expectedDays = INTERIM_WEEKS * DAYS_PER_WEEK - 7; // 35

    expect(impact.worldFields?.cyclePhase).toBe("interim");
    expect(impact.worldFields?._interimDaysRemaining).toBe(expectedDays);
  });

  it("transitions from interim to banzuke_reveal when threshold is reached", () => {
    const world = MockFactory.createWorld({
      cyclePhase: "interim",
    });
    world._interimDaysRemaining = 14;

    const impact = phase00_preflight(world);
    expect(impact.worldFields?.cyclePhase).toBe("banzuke_reveal");
  });

  it("transitions from banzuke_reveal to pre_basho when <= 7 days remain", () => {
    const world = MockFactory.createWorld({
      cyclePhase: "banzuke_reveal",
    });
    world._interimDaysRemaining = 7;

    const impact = phase00_preflight(world);
    expect(impact.worldFields?.cyclePhase).toBe("pre_basho");
  });
});
