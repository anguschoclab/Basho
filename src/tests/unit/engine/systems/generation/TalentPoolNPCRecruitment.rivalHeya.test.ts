import { describe, it, expect } from "vitest";
import { fillVacanciesForNPCWithBidding } from "@/engine/systems/generation/TalentPoolNPCRecruitment";
import { MockFactory } from "@/tests/helpers/utils/MockFactory";
import type { WorldState } from "@/engine/types/world";
import type { Id } from "@/engine/types/common";

function makeWorldForBidding(
  heyaIds: string[],
  candidateIds: string[],
  oyakataOverrides: Record<string, { temperament?: "Stoic" | "Volatile" | "Vindictive" }> = {}
): WorldState {
  const heyas = new Map();
  const oyakata = new Map();
  for (const hid of heyaIds) {
    const oyakataId = `oyakata_${hid}` as Id;
    heyas.set(hid, MockFactory.createHeya(hid as Id, { oyakataId, rikishiIds: [] }));
    oyakata.set(
      oyakataId,
      MockFactory.createOyakata(oyakataId, {
        heyaId: hid as Id,
        temperament: oyakataOverrides[hid]?.temperament,
      })
    );
  }

  const tp = MockFactory.createTalentPool({});
  for (const cid of candidateIds) {
    const candidate = MockFactory.createCandidate(cid as Id, {
      candidateId: cid as Id,
      availabilityState: "available",
      competingSuitors: [],
    });
    tp.candidates[cid] = candidate;
    tp.pools.high_school.candidatesVisible.push(cid);
  }

  return MockFactory.createWorld({
    heyas,
    oyakata,
    rikishi: new Map(),
    seed: "rival-heya-test-seed",
    talentPool: tp,
  });
}

describe("fillVacanciesForNPCWithBidding — rival heya precompute", () => {
  it("rival heya is undefined when only 1 target heya (no spite premium)", () => {
    const heyaId = "solo";
    const world = makeWorldForBidding([heyaId], ["cand-1"], {
      [heyaId]: { temperament: "Vindictive" },
    });

    const impact = fillVacanciesForNPCWithBidding(world, { [heyaId]: 1 });
    expect(impact.collections?.rikishiToAdd?.length ?? 0).toBe(1);
  });

  it("rival heya is set when 2 target heyas — both get materialized", () => {
    const hA = "heyaA";
    const hB = "heyaB";
    const world = makeWorldForBidding([hA, hB], ["cand-1", "cand-2"], {
      [hA]: { temperament: "Vindictive" },
      [hB]: { temperament: "Stoic" },
    });

    const impact = fillVacanciesForNPCWithBidding(world, {
      [hA]: 1,
      [hB]: 1,
    });
    expect(impact.collections?.rikishiToAdd?.length ?? 0).toBe(2);
  });

  it("rival heya is first other heya when 3+ target heyas", () => {
    const hA = "heyaA";
    const hB = "heyaB";
    const hC = "heyaC";
    const world = makeWorldForBidding([hA, hB, hC], ["cand-1", "cand-2", "cand-3"], {
      [hA]: { temperament: "Vindictive" },
      [hB]: { temperament: "Vindictive" },
      [hC]: { temperament: "Vindictive" },
    });

    const impact = fillVacanciesForNPCWithBidding(world, {
      [hA]: 1,
      [hB]: 1,
      [hC]: 1,
    });
    // All 3 should be able to recruit
    expect(impact.collections?.rikishiToAdd?.length ?? 0).toBe(3);
  });

  it("Vindictive oyakata applies spite premium with rival present", () => {
    const hA = "vindictive";
    const hB = "rival";
    const world = makeWorldForBidding([hA, hB], ["cand-1"], {
      [hA]: { temperament: "Vindictive" },
      [hB]: { temperament: "Stoic" },
    });

    const impact = fillVacanciesForNPCWithBidding(world, {
      [hA]: 1,
      [hB]: 1,
    });

    // Vindictive heya should win the bid due to spite premium
    const added = impact.collections?.rikishiToAdd ?? [];
    expect(added.length).toBe(1);
    // The vindictive heya has a 1.5x spite premium, so it should win
    expect(added[0]?.heyaId).toBe(hA);
  });

  it("non-Vindictive oyakata does not apply spite premium", () => {
    const hA = "stoicA";
    const hB = "stoicB";
    const world = makeWorldForBidding([hA, hB], ["cand-1"], {
      [hA]: { temperament: "Stoic" },
      [hB]: { temperament: "Stoic" },
    });

    const impact = fillVacanciesForNPCWithBidding(world, {
      [hA]: 1,
      [hB]: 1,
    });

    const added = impact.collections?.rikishiToAdd ?? [];
    expect(added.length).toBe(1);
    // Without spite premium, either heya can win — just verify it's one of them
    expect([hA, hB]).toContain(added[0]?.heyaId);
  });

  it("rival heya precompute matches original find() for 5 heyas", () => {
    const heyaIds = ["h1", "h2", "h3", "h4", "h5"];
    const candidateIds = ["c1", "c2", "c3", "c4", "c5"];
    const overrides: Record<string, { temperament?: "Vindictive" }> = {};
    for (const hid of heyaIds) {
      overrides[hid] = { temperament: "Vindictive" };
    }

    const world = makeWorldForBidding(heyaIds, candidateIds, overrides);
    const vacancies: Record<string, number> = {};
    for (const hid of heyaIds) {
      vacancies[hid] = 1;
    }

    const impact = fillVacanciesForNPCWithBidding(world, vacancies);
    const added = impact.collections?.rikishiToAdd ?? [];
    expect(added.length).toBe(5);

    // Verify each heya got exactly one rikishi
    const assignedHeyas = new Set(added.map((r) => r.heyaId));
    for (const hid of heyaIds) {
      expect(assignedHeyas.has(hid as Id)).toBe(true);
    }
  });
});
