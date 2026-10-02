import { describe, it, expect } from "vitest";
import { getSalaryBreakdown } from "@/engine/economics_awards";
import { MOCHIKYUKIN_POINT_VALUE, MOCHIKYUKIN_RANK_FLOORS } from "@/constants/engine/economic";

describe("getSalaryBreakdown — mochikyukin annuity honesty", () => {
  it("kinboshiBonus reflects mochikyukin points × ¥4,000 per basho for sekitori", () => {
    // 1 kinboshi = 10 points → ¥40,000 per basho.
    const b = getSalaryBreakdown(1_400_000, "makuuchi", 10);
    expect(b.kinboshiBonus).toBe(10 * MOCHIKYUKIN_POINT_VALUE);
  });

  it("pays the annuity to juryo rikishi too (sekitori, not makuuchi-only)", () => {
    const b = getSalaryBreakdown(1_100_000, "juryo", 10);
    expect(b.kinboshiBonus).toBe(10 * MOCHIKYUKIN_POINT_VALUE);
  });

  it("pays nothing below juryo (non-sekitori freeze)", () => {
    const b = getSalaryBreakdown(0, "makushita", 50);
    expect(b.kinboshiBonus).toBe(0);
  });

  it("applies rank floors (a yokozuna's ¥150-pt floor exceeds 3 stars' 30 pts)", () => {
    const b = getSalaryBreakdown(3_000_000, "makuuchi", 30, "yokozuna");
    const floor = MOCHIKYUKIN_RANK_FLOORS["yokozuna"] ?? 0;
    expect(b.kinboshiBonus).toBe(Math.max(30, floor) * MOCHIKYUKIN_POINT_VALUE);
  });

  it("stacks kinboshi points (30 pts from 3 stars → ¥120k, or the maegashira floor if higher)", () => {
    const b = getSalaryBreakdown(1_400_000, "makuuchi", 30, "maegashira");
    expect(b.kinboshiBonus).toBe(
      Math.max(30, MOCHIKYUKIN_RANK_FLOORS["maegashira"] ?? 0) * MOCHIKYUKIN_POINT_VALUE
    );
  });
});
