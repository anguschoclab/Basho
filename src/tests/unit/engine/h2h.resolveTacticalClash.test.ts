import { describe, it, expect } from "vitest";
import { resolveTacticalClash } from "@/engine/h2h";
import { TACTICAL_ADVANTAGE_SHIFT } from "@/constants/engine/generation";

describe("resolveTacticalClash", () => {
  it("returns NEUTRAL when both tactics are the same", () => {
    const result = resolveTacticalClash("YOTSU_BELT", "YOTSU_BELT");
    expect(result.advantage).toBe("NEUTRAL");
    expect(result.winProbabilityShift).toBe(0);
  });

  it("returns NEUTRAL when either tactic is STANDARD", () => {
    expect(resolveTacticalClash("STANDARD", "HENKA").advantage).toBe("NEUTRAL");
    expect(resolveTacticalClash("OSHI_THRUST", "STANDARD").advantage).toBe("NEUTRAL");
  });

  it("applies correct advantage for the classic 3-point RPS", () => {
    // YOTSU_BELT > OSHI_THRUST
    expect(resolveTacticalClash("YOTSU_BELT", "OSHI_THRUST").advantage).toBe("PLAYER");
    expect(resolveTacticalClash("OSHI_THRUST", "YOTSU_BELT").advantage).toBe("CPU");

    // OSHI_THRUST > HENKA
    expect(resolveTacticalClash("OSHI_THRUST", "HENKA").advantage).toBe("PLAYER");
    expect(resolveTacticalClash("HENKA", "OSHI_THRUST").advantage).toBe("CPU");

    // HENKA > YOTSU_BELT
    expect(resolveTacticalClash("HENKA", "YOTSU_BELT").advantage).toBe("PLAYER");
    expect(resolveTacticalClash("YOTSU_BELT", "HENKA").advantage).toBe("CPU");
  });

  it("implements asymmetric advantage for NEKODAMASHI", () => {
    // Counters YOTSU_BELT
    expect(resolveTacticalClash("NEKODAMASHI", "YOTSU_BELT").advantage).toBe("PLAYER");
    expect(resolveTacticalClash("YOTSU_BELT", "NEKODAMASHI").advantage).toBe("CPU");

    // Counters OSHI_THRUST
    expect(resolveTacticalClash("NEKODAMASHI", "OSHI_THRUST").advantage).toBe("PLAYER");
    expect(resolveTacticalClash("OSHI_THRUST", "NEKODAMASHI").advantage).toBe("CPU");

    // Neutral to HENKA
    expect(resolveTacticalClash("NEKODAMASHI", "HENKA").advantage).toBe("NEUTRAL");
    expect(resolveTacticalClash("HENKA", "NEKODAMASHI").advantage).toBe("NEUTRAL");
  });

  it("applies the correct win probability shift value", () => {
    const playerAdvantage = resolveTacticalClash("YOTSU_BELT", "OSHI_THRUST");
    expect(playerAdvantage.winProbabilityShift).toBe(TACTICAL_ADVANTAGE_SHIFT);

    const cpuAdvantage = resolveTacticalClash("OSHI_THRUST", "YOTSU_BELT");
    expect(cpuAdvantage.winProbabilityShift).toBe(-TACTICAL_ADVANTAGE_SHIFT);
  });
});
