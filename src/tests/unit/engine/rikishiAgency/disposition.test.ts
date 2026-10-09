/**
 * WS4 — Rikishi-level agency: disposition derivation.
 *
 * Rikishi are actors, not stat blocks. `deriveDisposition` folds motivation,
 * behavior.stress, momentum, mentorship, and accumulated deny/grant history
 * into a deterministic banded disposition that gates requests and incidents.
 */

import { describe, it, expect } from "vitest";
import { deriveDisposition } from "@/engine/rikishiAgency/RikishiAgencyService";
import { MockFactory } from "@/tests/helpers/utils/MockFactory";
import type { Rikishi } from "@/engine/types/rikishi";

function rikishi(over: Partial<Rikishi>): Rikishi {
  return MockFactory.createRikishi({ id: "r1", heyaId: "h1", ...over } as Partial<Rikishi>);
}

describe("deriveDisposition", () => {
  it("content rikishi — high motivation, low stress — is loyal and settled", () => {
    const world = MockFactory.createWorld();
    const r = rikishi({
      motivation: 80,
      momentum: 60,
      fatigue: 10,
      behavior: { discipline: 70, mediaSavvy: 50, stress: 10 },
    });
    const d = deriveDisposition(world, r);
    expect(d.satisfaction).toBeGreaterThanOrEqual(65);
    expect(d.loyaltyBand).toBe("loyal");
    expect(d.restlessness).toBeLessThan(45);
  });

  it("high stress + prior denials drive discontent", () => {
    const world = MockFactory.createWorld();
    const r = rikishi({
      motivation: 25,
      momentum: 10,
      fatigue: 80,
      behavior: { discipline: 40, mediaSavvy: 50, stress: 85 },
      agency: {
        satisfaction: 30,
        restlessness: 70,
        loyaltyBand: "restless",
        deniedCount: 2,
        grantedCount: 0,
      },
    });
    const d = deriveDisposition(world, r);
    expect(d.satisfaction).toBeLessThan(45);
    expect(["restless", "discontent"]).toContain(d.loyaltyBand);
    expect(d.restlessness).toBeGreaterThanOrEqual(70);
  });

  it("an assigned mentor raises satisfaction", () => {
    const world = MockFactory.createWorld();
    const base = {
      motivation: 50,
      behavior: { discipline: 50, mediaSavvy: 50, stress: 40 },
    };
    const alone = deriveDisposition(world, rikishi({ ...base }));
    const mentored = deriveDisposition(world, rikishi({ ...base, mentorId: "m1" }));
    expect(mentored.satisfaction).toBeGreaterThan(alone.satisfaction);
  });

  it("is deterministic — same inputs, same disposition", () => {
    const world = MockFactory.createWorld();
    const r = rikishi({
      motivation: 55,
      behavior: { discipline: 50, mediaSavvy: 50, stress: 60 },
    });
    expect(deriveDisposition(world, r)).toEqual(deriveDisposition(world, r));
  });
});
