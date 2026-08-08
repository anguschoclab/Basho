import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";

const facilitiesSource = readFileSync(
  join(__dirname, "../../../engine/facilities.ts"),
  "utf-8"
);

describe("engine/facilities.ts uses imported constants (not hardcoded)", () => {
  it("imports from constants/engine/facilities", () => {
    expect(facilitiesSource).toContain("from");
    expect(facilitiesSource).toMatch(/constants\/engine\/facilities/);
  });

  it("imports FACILITY_UPGRADE_BASE_COST", () => {
    expect(facilitiesSource).toContain("FACILITY_UPGRADE_BASE_COST");
  });

  it("imports MAINTENANCE_COST_PER_POINT", () => {
    expect(facilitiesSource).toContain("MAINTENANCE_COST_PER_POINT");
  });

  it("imports FACILITY_DECAY_AMOUNT", () => {
    expect(facilitiesSource).toContain("FACILITY_DECAY_AMOUNT");
  });

  it("imports MAX_FACILITY_LEVEL", () => {
    expect(facilitiesSource).toContain("MAX_FACILITY_LEVEL");
  });

  it("imports MIN_FACILITY_LEVEL", () => {
    expect(facilitiesSource).toContain("MIN_FACILITY_LEVEL");
  });

  it("does not hardcode 200_000 as upgrade base", () => {
    expect(facilitiesSource).not.toMatch(/const base = 200_000/);
    expect(facilitiesSource).not.toMatch(/const base = 200000/);
  });

  it("does not hardcode 3_000 in maintenanceCost", () => {
    expect(facilitiesSource).not.toMatch(/level \* 3_000/);
    expect(facilitiesSource).not.toMatch(/level \* 3000/);
  });

  it("does not hardcode DECAY_RATE = 2", () => {
    expect(facilitiesSource).not.toMatch(/DECAY_RATE\s*=\s*2/);
  });

  it("does not hardcode MAX_FACILITY = 100", () => {
    expect(facilitiesSource).not.toMatch(/MAX_FACILITY\s*=\s*100/);
  });

  it("does not hardcode MIN_FACILITY = 5", () => {
    expect(facilitiesSource).not.toMatch(/MIN_FACILITY\s*=\s*5/);
  });
});
