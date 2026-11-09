/**
 * v18Eligibility.test.ts
 * =======================
 * Failing-first regression pins for two training-domain audit findings:
 *
 *  - Tsukebito eligibility (src/engine/training/TsukebitoService.ts:51-55,65-69):
 *    `isEligibleForTsukebito` uses `rankNumber <= 3` ("sekiwake and above") and
 *    `isJuniorTsukebitoEligible` uses `rankNumber > 10` — both read the position
 *    *within* a rank rather than the rank itself. That lets juryo-1 /
 *    maegashira-3 act as seniors while excluding san'yaku ranked >3, and admits
 *    maegashira-15 sekitori as juniors while excluding low-division rikishi
 *    with rankNumber <= 10. Canonical pattern: MentorshipService.canMentor:102-103
 *    uses `RANK_HIERARCHY[rank].isSekitori`; the san'yaku equivalent is
 *    `RANK_HIERARCHY[rank].isSanyaku`.
 *
 *  - Weight journey breakthrough (src/engine/training/WeightJourney.ts:77,119,122):
 *    `targetKg` is the rikishi's absolute potential weight (potential.weightKg,
 *    ~160kg) but the completion check compares the cumulative `progressKg`
 *    (starting at 0) against it — so a rikishi must "gain" ~160kg to break
 *    through instead of the ~15kg minimum gap (WEIGHT_JOURNEY_MIN_GAP).
 *    `stats.weight` is also never updated during the journey.
 */
import { describe, it, expect } from "vitest";
import { MockFactory } from "@tests/helpers/utils/MockFactory";
import {
  isEligibleForTsukebito,
  isJuniorTsukebitoEligible,
} from "@/engine/training/TsukebitoService";
import { applyWeightJourneyTick } from "@/engine/training/WeightJourney";
import { RANK_HIERARCHY } from "@/engine/types/banzuke";
import { resolveImpacts } from "@/engine/core/ImpactResolver";

// ── Tsukebito eligibility — rank-aware, not rankNumber ──────────────────────

describe("isEligibleForTsukebito — senior eligibility is san'yaku (komusubi+)", () => {
  it("a sekiwake ranked below the third slot is still senior-eligible", () => {
    const sekiwake = MockFactory.createRikishi("sen-sk5", {
      rank: "sekiwake",
      division: "makuuchi",
      rankNumber: 5,
    });
    expect(RANK_HIERARCHY[sekiwake.rank].isSanyaku).toBe(true);
    // PIN (RED): rankNumber 5 > 3 → false under the buggy check.
    expect(isEligibleForTsukebito(sekiwake)).toBe(true);
  });

  it("a komusubi ranked below the third slot is still senior-eligible", () => {
    const komusubi = MockFactory.createRikishi("sen-k4", {
      rank: "komusubi",
      division: "makuuchi",
      rankNumber: 4,
    });
    expect(RANK_HIERARCHY[komusubi.rank].isSanyaku).toBe(true);
    // PIN (RED): rankNumber 4 > 3 → false under the buggy check.
    expect(isEligibleForTsukebito(komusubi)).toBe(true);
  });

  it("a juryo-1 is NOT senior-eligible — sekitori is not san'yaku", () => {
    const juryo = MockFactory.createRikishi("sen-j1", {
      rank: "juryo",
      division: "juryo",
      rankNumber: 1,
    });
    expect(RANK_HIERARCHY[juryo.rank].isSanyaku).toBe(false);
    // PIN (RED): rankNumber 1 <= 3 → true under the buggy check.
    expect(isEligibleForTsukebito(juryo)).toBe(false);
  });

  it("a maegashira-1 is NOT senior-eligible", () => {
    const mae = MockFactory.createRikishi("sen-m1", {
      rank: "maegashira",
      division: "makuuchi",
      rankNumber: 1,
    });
    // PIN (RED): rankNumber 1 <= 3 → true under the buggy check.
    expect(isEligibleForTsukebito(mae)).toBe(false);
  });

  it("san'yaku in the top three slots remain eligible (control)", () => {
    const sekiwake = MockFactory.createRikishi("sen-sk1", {
      rank: "sekiwake",
      division: "makuuchi",
      rankNumber: 1,
    });
    expect(isEligibleForTsukebito(sekiwake)).toBe(true);
  });
});

describe("isJuniorTsukebitoEligible — junior eligibility is non-sekitori", () => {
  it("a sandanme rikishi IS junior-eligible", () => {
    const sandanme = MockFactory.createRikishi("jr-sd5", {
      rank: "sandanme",
      division: "sandanme",
      rankNumber: 5,
    });
    expect(RANK_HIERARCHY[sandanme.rank].isSekitori).toBe(false);
    // PIN (RED): rankNumber 5 <= 10 → false under the buggy check.
    expect(isJuniorTsukebitoEligible(sandanme)).toBe(true);
  });

  it("a makushita rikishi IS junior-eligible", () => {
    const makushita = MockFactory.createRikishi("jr-ms5", {
      rank: "makushita",
      division: "makushita",
      rankNumber: 5,
    });
    expect(RANK_HIERARCHY[makushita.rank].isSekitori).toBe(false);
    // PIN (RED): rankNumber 5 <= 10 → false under the buggy check.
    expect(isJuniorTsukebitoEligible(makushita)).toBe(true);
  });

  it("a maegashira-15 sekitori is NOT junior-eligible", () => {
    const mae = MockFactory.createRikishi("jr-m15", {
      rank: "maegashira",
      division: "makuuchi",
      rankNumber: 15,
    });
    expect(RANK_HIERARCHY[mae.rank].isSekitori).toBe(true);
    // PIN (RED): rankNumber 15 > 10 → true under the buggy check — a top-
    // division sekitori becomes an attendant.
    expect(isJuniorTsukebitoEligible(mae)).toBe(false);
  });

  it("a juryo-12 sekitori is NOT junior-eligible", () => {
    const juryo = MockFactory.createRikishi("jr-j12", {
      rank: "juryo",
      division: "juryo",
      rankNumber: 12,
    });
    expect(RANK_HIERARCHY[juryo.rank].isSekitori).toBe(true);
    // PIN (RED): rankNumber 12 > 10 → true under the buggy check.
    expect(isJuniorTsukebitoEligible(juryo)).toBe(false);
  });

  it("a deep jonidan rikishi remains junior-eligible (control)", () => {
    const jonidan = MockFactory.createRikishi("jr-jd40", {
      rank: "jonidan",
      division: "jonidan",
      rankNumber: 40,
    });
    expect(isJuniorTsukebitoEligible(jonidan)).toBe(true);
  });
});

// ── Weight journey — breakthrough at the gap, not the absolute target ───────

describe("applyWeightJourneyTick — breakthrough threshold (S7 WeightJourney)", () => {
  const HEYA = "h-gym";

  function journeyWorld(progressKg: number) {
    const rikishi = MockFactory.createRikishi("wj-1", {
      stats: {
        power: 50,
        technique: 50,
        speed: 50,
        weight: 100,
        stamina: 50,
        mental: 50,
        adaptability: 50,
        balance: 50,
        aggression: 50,
        experience: 10,
      },
      potential: {
        stats: {
          power: 80,
          technique: 80,
          speed: 80,
          weight: 160,
          stamina: 80,
          mental: 80,
          adaptability: 80,
          balance: 80,
          aggression: 50,
          experience: 10,
        },
        heightCm: 190,
        weightKg: 160,
        developmentSpeed: 1,
        peakAgeOffset: 0,
        ceilingFraction: 1,
        profile: "standard",
      },
      weightJourney: {
        targetKg: 160,
        progressKg,
        stalled: false,
        phases: ["bulking"],
      },
    });
    const heya = MockFactory.createHeya(HEYA, {
      funds: 5_000_000,
      facilities: { training: 10, recovery: 10, nutrition: 10 },
    });
    const world = MockFactory.createWorld({
      heyas: new Map([[HEYA, heya]]),
      rikishi: new Map([["wj-1", rikishi]]),
    });
    return { rikishi, heya, world };
  }

  it("completes the journey once the rikishi has gained the intended gap (targetKg - startWeight)", () => {
    // startWeight 100 → target 160 → gap 60kg. progressKg 59.5 + one weekly
    // tick (~0.75kg) crosses the gap, so the breakthrough must fire.
    const { rikishi, heya, world } = journeyWorld(59.5);
    const next = resolveImpacts(world, [applyWeightJourneyTick(rikishi, heya, world)]);
    const journey = next.rikishi.get("wj-1")?.weightJourney;

    // PIN (RED): completion compares progressKg (≈60.2) against the absolute
    // targetKg (160), so no breakthrough fires until ~160kg is "gained".
    expect(journey?.phases).toContain("complete");
  });

  it("keeps the journey incomplete before the gap is reached (control)", () => {
    const { rikishi, heya, world } = journeyWorld(10);
    const next = resolveImpacts(world, [applyWeightJourneyTick(rikishi, heya, world)]);
    const journey = next.rikishi.get("wj-1")?.weightJourney;
    expect(journey?.phases).not.toContain("complete");
  });

  it("updates stats.weight as the bulk progresses", () => {
    const { rikishi, heya, world } = journeyWorld(0);
    const next = resolveImpacts(world, [applyWeightJourneyTick(rikishi, heya, world)]);
    const after = next.rikishi.get("wj-1");

    // PIN (RED): progressKg accumulates but stats.weight is never written —
    // the rikishi bulks on paper while staying 100kg forever.
    expect(after?.stats.weight).toBeGreaterThan(100);
  });
});
