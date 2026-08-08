import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";

const source = readFileSync(
  join(__dirname, "../../../../engine/systems/economy/sponsorshipMutations.ts"),
  "utf-8"
);

describe("sponsorshipMutations.ts uses SPONSOR_RECRUITMENT_COSTS constant", () => {
  it("imports SPONSOR_RECRUITMENT_COSTS", () => {
    expect(source).toContain("SPONSOR_RECRUITMENT_COSTS");
  });

  it("does not hardcode recruitment cost map inline", () => {
    expect(source).not.toMatch(/T0:\s*50_000/);
    expect(source).not.toMatch(/T1:\s*150_000/);
    expect(source).not.toMatch(/T2:\s*400_000/);
    expect(source).not.toMatch(/T3:\s*800_000/);
    expect(source).not.toMatch(/T4:\s*1_500_000/);
    expect(source).not.toMatch(/T5:\s*4_000_000/);
  });
});
