import { describe, it, expect, vi, beforeEach } from "vitest";
import { checkRetirement } from "../lifecycle";
import { mockRikishi } from "./utils";
import * as rngModule from "../rng";

vi.mock("../rng", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../rng")>();
  return {
    ...actual,
    rngFromSeed: vi.fn(),
  };
});

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
    vi.mocked(rngModule.rngFromSeed).mockReturnValue(mockRng as any);

    const result = checkRetirement(rikishi, 2025, "test-seed");
    expect(result).toBe("Mandatory Age Retirement");
  });

  it("should return 'Career-Ending Injury' if injured and severity > 90", () => {
    const rikishi = mockRikishi("r2", {
      birthYear: 2000, // Age 25
      injuryStatus: {
        type: "knee",
        isInjured: true,
        severity: 95,
        location: undefined,
        weeksRemaining: 5,
        weeksToHeal: 5,
      },
    });
    const mockRng = {
      next: vi.fn().mockReturnValue(0),
      bool: vi.fn().mockReturnValue(false),
    };
    vi.mocked(rngModule.rngFromSeed).mockReturnValue(mockRng as any);

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
    vi.mocked(rngModule.rngFromSeed).mockReturnValue(mockRng as any);

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
    vi.mocked(rngModule.rngFromSeed).mockReturnValue(mockRng as any);

    const result = checkRetirement(rikishi, 2025, "test-seed");
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
    vi.mocked(rngModule.rngFromSeed).mockReturnValue(mockRng as any);

    const result = checkRetirement(rikishi, 2025, "test-seed");
    expect(result).toBeNull();
  });
});
