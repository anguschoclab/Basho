import { describe, it, expect, vi } from "vitest";
import { checkRetirement } from "@/engine/lifecycle";
import { mockRikishi } from "../utils";

describe("checkRetirement — no debug logging, young guard", () => {
  it("does not call console.error when blocking a young rikishi", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const r = mockRikishi("y1", { birthYear: 1995, rank: "maegashira" }); // age 25 at 2020
    expect(checkRetirement(r, 2020, "seed-young")).toBeNull();
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });

  it("never retires a healthy rikishi under age 18", () => {
    const r = mockRikishi("y2", { birthYear: 2004, rank: "jonokuchi" }); // age 16
    expect(checkRetirement(r, 2020, "seed-16")).toBeNull();
  });
});

describe("checkRetirement — mandatory and natural aging", () => {
  it("forces mandatory retirement at age 45 regardless of seed", () => {
    const r = mockRikishi("m1", { birthYear: 1975, rank: "maegashira", power: 60 }); // 45 at 2020
    expect(checkRetirement(r, 2020, "any-seed-A")).toBe("Mandatory Age Retirement");
    expect(checkRetirement(r, 2020, "any-seed-B")).toBe("Mandatory Age Retirement");
  });

  it("retires >90% of healthy 44-year-olds per year", () => {
    let retired = 0;
    const N = 200;
    for (let i = 0; i < N; i++) {
      if (
        checkRetirement(
          mockRikishi(`a44_${i}`, { birthYear: 1976, rank: "maegashira", power: 60 }),
          2020,
          `c44-${i}`
        )
      )
        retired++;
    }
    expect(retired / N).toBeGreaterThan(0.9);
  });

  it("retires ~half of healthy 39-year-olds", () => {
    let retired = 0;
    const N = 300;
    for (let i = 0; i < N; i++) {
      if (
        checkRetirement(
          mockRikishi(`a39_${i}`, { birthYear: 1981, rank: "maegashira", power: 60 }),
          2020,
          `c39-${i}`
        )
      )
        retired++;
    }
    expect(retired / N).toBeGreaterThan(0.35);
    expect(retired / N).toBeLessThan(0.65);
  });

  it("rarely retires a healthy 35-year-old", () => {
    let retired = 0;
    const N = 300;
    for (let i = 0; i < N; i++) {
      if (
        checkRetirement(
          mockRikishi(`a35_${i}`, { birthYear: 1985, rank: "maegashira", power: 60 }),
          2020,
          `c35-${i}`
        )
      )
        retired++;
    }
    expect(retired / N).toBeLessThan(0.25);
  });
});
