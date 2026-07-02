import { describe, it, expect } from "vitest";
import {
  FIXED_OPERATING_OVERHEAD_WEEKLY,
  SEKITORI_OVERHEAD_MONTHLY,
  NON_SEKITORI_OVERHEAD_MONTHLY,
  DEBT_LIMIT,
  MERGER_THRESHOLD,
} from "@/constants/engine/economic";

describe("Operating overhead constants", () => {
  it("exports a positive fixed weekly overhead", () => {
    expect(FIXED_OPERATING_OVERHEAD_WEEKLY).toBeGreaterThan(0);
  });

  it("exports a sekitori overhead record ordered by rank", () => {
    expect(SEKITORI_OVERHEAD_MONTHLY.yokozuna).toBeGreaterThanOrEqual(1_000_000);
    expect(SEKITORI_OVERHEAD_MONTHLY.yokozuna).toBeGreaterThan(SEKITORI_OVERHEAD_MONTHLY.ozeki);
    expect(SEKITORI_OVERHEAD_MONTHLY.ozeki).toBeGreaterThan(SEKITORI_OVERHEAD_MONTHLY.sekiwake);
    expect(SEKITORI_OVERHEAD_MONTHLY.sekiwake).toBeGreaterThan(SEKITORI_OVERHEAD_MONTHLY.komusubi);
    expect(SEKITORI_OVERHEAD_MONTHLY.komusubi).toBeGreaterThan(
      SEKITORI_OVERHEAD_MONTHLY.maegashira
    );
    expect(SEKITORI_OVERHEAD_MONTHLY.maegashira).toBeGreaterThan(SEKITORI_OVERHEAD_MONTHLY.juryo);
  });

  it("exports a positive non-sekitori overhead", () => {
    expect(NON_SEKITORI_OVERHEAD_MONTHLY).toBeGreaterThan(0);
  });

  it("regression-guards the debt floor and merger threshold", () => {
    expect(DEBT_LIMIT).toBe(-20_000_000);
    expect(MERGER_THRESHOLD).toBe(-15_000_000);
  });
});
