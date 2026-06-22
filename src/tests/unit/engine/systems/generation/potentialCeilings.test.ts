import { describe, it, expect } from "vitest";
import { PA_BY_RANK } from "@/constants/engine/development";
import { getStatCeiling } from "@/engine/systems/training/TrainingMath";

describe("lower-division potential", () => {
  it("gives amateur divisions headroom to reach sekitori", () => {
    expect(PA_BY_RANK.makushita.mean).toBeGreaterThanOrEqual(54);
    expect(PA_BY_RANK.sandanme.mean).toBeGreaterThanOrEqual(48);
    expect(PA_BY_RANK.jonidan.mean).toBeGreaterThanOrEqual(44);
    expect(PA_BY_RANK.jonokuchi.mean).toBeGreaterThanOrEqual(42);
  });

  it("keeps the top genuinely elite", () => {
    expect(PA_BY_RANK.yokozuna.mean).toBeGreaterThanOrEqual(88);
    expect(PA_BY_RANK.yokozuna.mean + 2 * PA_BY_RANK.yokozuna.stdDev).toBeGreaterThan(95);
  });

  it("getStatCeiling tracks talent into the elite range", () => {
    expect(getStatCeiling(95, "power")).toBeGreaterThan(80);
  });
});
