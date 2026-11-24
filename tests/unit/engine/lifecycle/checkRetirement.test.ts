import { describe, it, expect, vi, beforeEach } from "vitest";
import { checkRetirement } from "@/engine/lifecycle/retirementCheck";
import { mockRikishi } from "@tests/unit/engine/utils";
import * as rngModule from "@/engine/core/rng";

vi.mock("@/engine/core/rng", () => ({
  rngFromSeed: vi.fn(),
  rngForWorld: vi.fn(),
  SeededRNG: vi.fn(),
}));

describe("checkRetirement", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("should return 'Mandatory Age Retirement' if age >= 45", () => {
    const rikishi = mockRikishi("r1", { birthYear: 1970 }); // 2025 - 1970 = 55
    const mockRng = {
      next: vi.fn().mockReturnValue(0),
      bool: vi.fn().mockReturnValue(false),
    };
    (rngModule.rngFromSeed as any).mockReturnValue(mockRng);

    const result = checkRetirement(rikishi, 2025, "test-seed");
    expect(result).toBe("Mandatory Age Retirement");
  });

  it("should return 'Career-Ending Injury' if injured and severity > 90", () => {
    const rikishi = mockRikishi("r2", {
      birthYear: 2000, // Age 25
      injured: true,
      injuryWeeksRemaining: 21,
      injuryStatus: {
        type: "fracture",
        isInjured: true,
        severity: "serious",
        weeksRemaining: 21,
      },
    });
    const mockRng = {
      next: vi.fn().mockReturnValue(0),
      bool: vi.fn().mockReturnValue(false),
    };
    (rngModule.rngFromSeed as any).mockReturnValue(mockRng);

    const result = checkRetirement(rikishi, 2025, "test-seed");
    expect(result).toBe("Career-Ending Injury");
  });

  it("should return 'Age & Fatigue' based on natural aging curve probability", () => {
    const rikishi = mockRikishi("r3", { birthYear: 1985 }); // Age 40. Base chance: (40 - 34) * 0.05 = 0.3
    // rng.next() returns a value < base chance
    const mockRng = {
      next: vi.fn().mockReturnValue(0.2),
      bool: vi.fn().mockReturnValue(false),
    };
    (rngModule.rngFromSeed as any).mockReturnValue(mockRng);

    const result = checkRetirement(rikishi, 2025, "test-seed");
    expect(result).toBe("Age & Fatigue");
  });

  it("should return 'Lack of Performance' if rank is jonokuchi, age > 25, and rng bool is true", () => {
    const rikishi = mockRikishi("r4", {
      birthYear: 1995, // Age 30
      rank: "jonokuchi",
    });
    // rng.next() returns > base chance, rng.bool(0.3) returns true
    const mockRng = {
      next: vi.fn().mockReturnValue(0.9),
      bool: vi.fn().mockReturnValue(true),
    };
    (rngModule.rngFromSeed as any).mockReturnValue(mockRng);

    const result = checkRetirement(rikishi, 2025, "test-seed");

    expect(rngModule.rngFromSeed).toHaveBeenCalledWith(
      "test-seed",
      "lifecycle",
      "retirement::r4::2025"
    );
    expect(mockRng.bool).toHaveBeenCalledWith(0.1);
    expect(result).toBe("Lack of Performance");
  });

  it("should return null for young, healthy, high rank rikishi", () => {
    const rikishi = mockRikishi("r5", {
      birthYear: 2005, // Age 20
      rank: "maegashira",
    });
    const mockRng = {
      next: vi.fn().mockReturnValue(0.9),
      bool: vi.fn().mockReturnValue(false),
    };
    (rngModule.rngFromSeed as any).mockReturnValue(mockRng);

    const result = checkRetirement(rikishi, 2025, "test-seed");
    expect(result).toBeNull();
  });

  it("should retire a never-rose stalled prospect under 28 when the pressure roll fires", () => {
    // Age 22, lifetime peak jonidan, a full season of losing jonidan records —
    // the under-28 gate must not shield a washout career.
    const rikishi = mockRikishi("r-stall", {
      birthYear: 2003,
      division: "jonidan",
      careerPeakDivision: "jonidan",
      careerHistory: Array.from({ length: 6 }, () => ({
        division: "jonidan",
        wins: 2,
        losses: 5,
      })) as any,
    });
    const mockRng = {
      next: vi.fn().mockReturnValue(0.9),
      bool: vi.fn().mockReturnValue(true),
    };
    (rngModule.rngFromSeed as any).mockReturnValue(mockRng);

    expect(checkRetirement(rikishi, 2025, "test-seed")).toBe("Lower-Division Stagnation");
    expect(mockRng.bool).toHaveBeenCalledWith(0.12);
  });

  it("should not stall-retire a former makushita man on a slump season", () => {
    // Age 23 stuck in jonidan but careerPeakDivision is makushita — a demoted
    // veteran in a slump, not a washout: the stall check must pass him over
    // and the under-28 gate then returns null.
    const rikishi = mockRikishi("r-slump", {
      birthYear: 2002,
      division: "jonidan",
      careerPeakDivision: "makushita",
      careerHistory: Array.from({ length: 6 }, () => ({
        division: "jonidan",
        wins: 1,
        losses: 6,
      })) as any,
    });
    const mockRng = {
      next: vi.fn().mockReturnValue(0.9),
      bool: vi.fn().mockReturnValue(true),
    };
    (rngModule.rngFromSeed as any).mockReturnValue(mockRng);

    expect(checkRetirement(rikishi, 2025, "test-seed")).toBeNull();
  });

  it("should not stall-retire a stalled prospect under 21", () => {
    const rikishi = mockRikishi("r-too-young", {
      birthYear: 2005, // Age 20
      division: "jonidan",
      careerPeakDivision: "jonidan",
      careerHistory: Array.from({ length: 6 }, () => ({
        division: "jonidan",
        wins: 0,
        losses: 7,
      })) as any,
    });
    const mockRng = {
      next: vi.fn().mockReturnValue(0.9),
      bool: vi.fn().mockReturnValue(true),
    };
    (rngModule.rngFromSeed as any).mockReturnValue(mockRng);

    expect(checkRetirement(rikishi, 2025, "test-seed")).toBeNull();
  });

  it("should not stall-retire a prospect with a winning recent basho", () => {
    // One kachi-koshi in the window breaks the stall streak — he is
    // progressing, not washing out.
    const rikishi = mockRikishi("r-progressing", {
      birthYear: 2003,
      division: "jonidan",
      careerPeakDivision: "jonidan",
      careerHistory: [
        ...Array.from({ length: 5 }, () => ({ division: "jonidan", wins: 2, losses: 5 })),
        { division: "jonidan", wins: 5, losses: 2 },
      ] as any,
    });
    const mockRng = {
      next: vi.fn().mockReturnValue(0.9),
      bool: vi.fn().mockReturnValue(true),
    };
    (rngModule.rngFromSeed as any).mockReturnValue(mockRng);

    expect(checkRetirement(rikishi, 2025, "test-seed")).toBeNull();
  });
});
