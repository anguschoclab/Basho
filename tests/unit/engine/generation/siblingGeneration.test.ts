/**
 * W H — sibling generation at materialization.
 *
 * A bounded-rate roll mints a sibling rikishi alongside the recruit:
 * same origin, birthYear within the age-gap bound, shared realName
 * surname, cross-linked siblingIds, placed in a different heya when one
 * exists. Deterministic per world seed.
 */
import { describe, it, expect } from "vitest";
import { materializeCandidateToRikishiInternal } from "@/engine/generation/TalentPoolMaterialization";
import { MockFactory } from "@tests/helpers/utils/MockFactory";
import { SeededRNG } from "@/engine/core/rng";
import type { TalentCandidate, TalentPoolState } from "@/engine/types/talent";
import { SIBLING_MAX_AGE_GAP } from "@/constants/engine/generation";

function fixture(seed: string) {
  const candidate: TalentCandidate = MockFactory.createCandidate("cand-1", {
    availabilityState: "signed",
    competingSuitors: [{ heyaId: "heya-1", score: 1 } as never],
    originRegion: "Aomori",
  });
  const heya1 = MockFactory.createHeya("heya-1", { rikishiIds: [] });
  const heya2 = MockFactory.createHeya("heya-2", { rikishiIds: [] });
  const world = MockFactory.createWorld({
    seed,
    heyas: new Map([
      ["heya-1", heya1],
      ["heya-2", heya2],
    ]),
    rikishi: new Map(),
    year: 2026,
  });
  const pools: Record<string, TalentPoolState> = {};
  return { candidate, world, pools };
}

const addedRikishiIds = (impact: ReturnType<typeof materializeCandidateToRikishiInternal>["impact"]) =>
  (impact.collections as { rikishiToAdd?: unknown[] } | undefined)?.rikishiToAdd ?? [];

describe("sibling generation", () => {
  it("finds at least one seed that mints a sibling pair", () => {
    let minted = false;
    for (let i = 0; i < 50 && !minted; i++) {
      const { candidate, world, pools } = fixture(`sib-seed-${i}`);
      const res = materializeCandidateToRikishiInternal(
        world,
        candidate.candidateId,
        "heya-1",
        { [candidate.candidateId]: candidate },
        pools as never
      );
      const added = addedRikishiIds(res.impact);
      minted = added.length > 1;
      if (minted) {
        expect(added.length).toBe(2);
      }
    }
    expect(minted).toBe(true);
  });

  it("sibling shares origin, bounded age gap, surname, and cross-links", () => {
    for (let i = 0; i < 50; i++) {
      const { candidate, world, pools } = fixture(`sib-seed-${i}`);
      const res = materializeCandidateToRikishiInternal(
        world,
        candidate.candidateId,
        "heya-1",
        { [candidate.candidateId]: candidate },
        pools as never
      );
      const updates = res.impact.collections?.rikishiToAdd ?? [];
      if (updates.length < 2) continue;
      const [a, b] = updates;
      const sib = a.siblingIds?.length ? a : b;
      const other = a.siblingIds?.length ? b : a;
      expect(sib.siblingIds).toContain(other.id);
      expect(other.siblingIds ?? []).toEqual(expect.arrayContaining([sib.id]));
      expect(sib.origin).toBe(other.origin);
      expect(Math.abs(sib.birthYear - other.birthYear)).toBeLessThanOrEqual(
        SIBLING_MAX_AGE_GAP
      );
      if (sib.realName && other.realName) {
        expect(sib.realName.split(" ").pop()).toBe(other.realName.split(" ").pop());
      }
      // sibling should land in the other heya's roster
      const heyaUpdates = res.impact.entities?.heyaUpdates ?? new Map();
      const roster2 = heyaUpdates.get("heya-2")?.rikishiIds as string[] | undefined;
      const roster1 = heyaUpdates.get("heya-1")?.rikishiIds as string[] | undefined;
      const siblingInOther =
        (roster2?.includes(sib.id) || roster2?.includes(other.id)) ?? false;
      expect(roster1).toBeDefined();
      expect(siblingInOther).toBe(true);
      return;
    }
    throw new Error("no seed produced a sibling pair");
  });

  it("is bounded: most intakes mint exactly one rikishi", () => {
    let pairs = 0;
    for (let i = 0; i < 40; i++) {
      const { candidate, world, pools } = fixture(`rate-seed-${i}`);
      const res = materializeCandidateToRikishiInternal(
        world,
        candidate.candidateId,
        "heya-1",
        { [candidate.candidateId]: candidate },
        pools as never
      );
      if ((res.impact.collections?.rikishiToAdd ?? []).length > 1) pairs++;
    }
    expect(pairs).toBeLessThan(10);
  });
});
