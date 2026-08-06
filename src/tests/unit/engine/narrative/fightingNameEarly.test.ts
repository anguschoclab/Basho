 
import { describe, it, expect } from "vitest";
import { maybeAssignEarlyShikona, getEarlyShikonaMotivationBoost } from "@/engine/systems/generation/FightingNameEarly";
import { mockRikishi } from "../utils";
import type { SeededRNG } from "@/engine/rng";

function mockRng(seed: string): SeededRNG {
  return {
    seed,
    next: () => Math.random(),
    gaussian: (m: number, s: number) => m + s * (Math.random() * 2 - 1),
    int: (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min,
    range: (min: number, max: number) => Math.random() * (max - min) + min,
    pick: <T>(arr: T[]) => arr[Math.floor(Math.random() * arr.length)],
    shuffle: <T>(arr: T[]) => [...arr].sort(() => Math.random() - 0.5),
    fork: (label: string) => mockRng(`${seed}:${label}`),
  } as any;
}

describe("Fighting Name Early System (B11)", () => {
  it("maybeAssignEarlyShikona sets flag for lower-division rikishi with some probability", () => {
    const r = mockRikishi("fn-1", {
      division: "makushita",
      shikona: "TestRikishi",
    } as any);
    const rng = mockRng("test-early-shikona-1");

    // Run multiple times to check it can set the flag
    let wasSet = false;
    for (let i = 0; i < 100; i++) {
      const result = maybeAssignEarlyShikona(r, rng);
      if (result.shikonaConferredEarly === true) {
        wasSet = true;
        break;
      }
    }
    expect(wasSet).toBe(true);
  });

  it("maybeAssignEarlyShikona does not set flag for sekitori (juryo+)", () => {
    const r = mockRikishi("fn-2", {
      division: "juryo",
      shikona: "TestRikishi",
    } as any);
    const rng = mockRng("test-early-shikona-2");

    for (let i = 0; i < 100; i++) {
      const result = maybeAssignEarlyShikona(r, rng);
      expect(result.shikonaConferredEarly).not.toBe(true);
    }
  });

  it("maybeAssignEarlyShikona does not set flag for makuuchi", () => {
    const r = mockRikishi("fn-3", {
      division: "makuuchi",
      shikona: "TestRikishi",
    } as any);
    const rng = mockRng("test-early-shikona-3");

    const result = maybeAssignEarlyShikona(r, rng);
    expect(result.shikonaConferredEarly).not.toBe(true);
  });

  it("maybeAssignEarlyShikona does not override existing flag", () => {
    const r = mockRikishi("fn-4", {
      division: "makushita",
      shikonaConferredEarly: true,
    } as any);
    const rng = mockRng("test-early-shikona-4");

    const result = maybeAssignEarlyShikona(r, rng);
    expect(result.shikonaConferredEarly).toBe(true);
  });

  it("getEarlyShikonaMotivationBoost returns positive boost for lower divisions with flag", () => {
    const r = mockRikishi("fn-5", {
      division: "makushita",
      shikonaConferredEarly: true,
    } as any);

    const boost = getEarlyShikonaMotivationBoost(r);
    expect(boost).toBeGreaterThan(0);
  });

  it("getEarlyShikonaMotivationBoost returns 0 for sekitori with flag", () => {
    const r = mockRikishi("fn-6", {
      division: "juryo",
      shikonaConferredEarly: true,
    } as any);

    const boost = getEarlyShikonaMotivationBoost(r);
    expect(boost).toBe(0);
  });

  it("getEarlyShikonaMotivationBoost returns 0 without flag", () => {
    const r = mockRikishi("fn-7", {
      division: "makushita",
    } as any);

    const boost = getEarlyShikonaMotivationBoost(r);
    expect(boost).toBe(0);
  });
});
