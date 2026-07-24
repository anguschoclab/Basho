import { describe, it, expect } from "vitest";
import { bashoPipeline } from "@/engine/tick/pipelines/bashoPipeline";
import * as phases from "@/engine/tick/phases";

describe("bashoPipeline", () => {
  it("includes phase02_context after economy (recoveryMultiplier needed by health)", () => {
    expect(bashoPipeline).toContain(phases.phase02_context);
    const economyIdx = bashoPipeline.indexOf(phases.phase01_week_economy);
    const contextIdx = bashoPipeline.indexOf(phases.phase02_context);
    expect(economyIdx).toBeGreaterThanOrEqual(0);
    expect(contextIdx).toBeGreaterThan(economyIdx);
  });

  it("places phase02_context before phase01_week_health", () => {
    const contextIdx = bashoPipeline.indexOf(phases.phase02_context);
    const healthIdx = bashoPipeline.indexOf(phases.phase01_week_health);
    expect(contextIdx).toBeLessThan(healthIdx);
  });

  it("includes phase01_week_health for injury recovery during basho", () => {
    expect(bashoPipeline).toContain(phases.phase01_week_health);
  });

  it("does not include phase01_week_training (rikishi are competing)", () => {
    expect(bashoPipeline).not.toContain(phases.phase01_week_training);
  });

  it("includes economy as the first phase", () => {
    expect(bashoPipeline[0]).toBe(phases.phase01_week_economy);
  });

  it("includes narrative as the last phase", () => {
    expect(bashoPipeline[bashoPipeline.length - 1]).toBe(phases.phase06_narrative);
  });
});
