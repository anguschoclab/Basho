import { describe, it, expect } from "vitest";
import { offSeasonPipeline } from "@/engine/tick/pipelines/offSeasonPipeline";
import * as phases from "@/engine/tick/phases";

describe("offSeasonPipeline", () => {
  it("includes phase02_context after economy", () => {
    expect(offSeasonPipeline).toContain(phases.phase02_context);
    const economyIdx = offSeasonPipeline.indexOf(phases.phase01_week_economy);
    const contextIdx = offSeasonPipeline.indexOf(phases.phase02_context);
    expect(economyIdx).toBeGreaterThanOrEqual(0);
    expect(contextIdx).toBeGreaterThan(economyIdx);
  });

  it("places phase02_context before phase01_week_training", () => {
    const contextIdx = offSeasonPipeline.indexOf(phases.phase02_context);
    const trainingIdx = offSeasonPipeline.indexOf(phases.phase01_week_training);
    expect(contextIdx).toBeGreaterThanOrEqual(0);
    expect(trainingIdx).toBeGreaterThanOrEqual(0);
    expect(contextIdx).toBeLessThan(trainingIdx);
  });

  it("places phase02_context before phase01_week_health", () => {
    const contextIdx = offSeasonPipeline.indexOf(phases.phase02_context);
    const healthIdx = offSeasonPipeline.indexOf(phases.phase01_week_health);
    expect(contextIdx).toBeLessThan(healthIdx);
  });

  it("includes economy as the first phase", () => {
    expect(offSeasonPipeline[0]).toBe(phases.phase01_week_economy);
  });

  it("includes narrative as the last phase", () => {
    expect(offSeasonPipeline[offSeasonPipeline.length - 1]).toBe(phases.phase06_narrative);
  });

  it("includes phase01_week_training", () => {
    expect(offSeasonPipeline).toContain(phases.phase01_week_training);
  });

  it("includes phase01_week_health", () => {
    expect(offSeasonPipeline).toContain(phases.phase01_week_health);
  });
});
