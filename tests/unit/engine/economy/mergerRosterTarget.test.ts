/**
 * Spec (RED) — merger capacity transfer.
 *
 * The replacement controller's population floor is Σ per-heya
 * rosterTarget. A closure deletes the dying stable's target while its
 * men move to an absorber whose target does not grow — every merger
 * shrinks league capacity and the population slides (measured: 722 →
 * 540 over 25yr, tracking 45 → 41 stables).
 *
 * Real rule (Isegahama precedent): the absorbing stable physically
 * expands to hold the transferred roster — 37 men after the Miyagino
 * absorption, still 33 two years on. The absorber's target must rise to
 * at least its post-merge roster size; a stable already at/above that
 * size keeps its existing target.
 */
import { describe, it, expect } from "vitest";
import { executeMerger } from "@/engine/economy/mergers";
import { resolveImpacts } from "@/engine/core/ImpactResolver";
import { getHeyaRosterTarget } from "@/engine/generation/RecruitmentController";
import { makeMockWorld, makeMockHeya, mockRikishi } from "@tests/unit/engine/utils";

function worldWithTwoHeyas(opts?: { targetRosterSize?: number; sourceRosterSize?: number }) {
  const targetRosterSize = opts?.targetRosterSize ?? 4;
  const sourceRosterSize = opts?.sourceRosterSize ?? 8;
  const world = makeMockWorld({ year: 2026 });
  const target = makeMockHeya("heya-target", { rosterTarget: 20 });
  const source = makeMockHeya("heya-source", { rosterTarget: 12 });
  world.heyas.set(target.id, target);
  world.heyas.set(source.id, source);

  target.rikishiIds = [];
  for (let i = 0; i < targetRosterSize; i++) {
    const id = `target-r${i}`;
    world.rikishi.set(id, mockRikishi(id, { heyaId: target.id, birthYear: 2005, division: "jonidan" }));
    world.activeRikishiIds.add(id);
    target.rikishiIds.push(id);
  }
  source.rikishiIds = [];
  for (let i = 0; i < sourceRosterSize; i++) {
    const id = `source-r${i}`;
    world.rikishi.set(id, mockRikishi(id, { heyaId: source.id, birthYear: 2005, division: "jonidan" }));
    world.activeRikishiIds.add(id);
    source.rikishiIds.push(id);
  }
  return { world, target, source };
}

describe("executeMerger — capacity follows the men", () => {
  it("absorber's rosterTarget rises to its post-merge roster size", () => {
    const { world, target, source } = worldWithTwoHeyas();
    const next = resolveImpacts(world, [
      executeMerger(world, source.id, target.id, "succession_no_heir"),
    ]);

    const merged = next.heyas.get(target.id)!;
    const postMergeRoster = (merged.rikishiIds ?? []).length;
    expect(postMergeRoster).toBe(12); // 4 + 8
    expect(getHeyaRosterTarget(merged)).toBeGreaterThanOrEqual(postMergeRoster);
  });

  it("league capacity (Σ rosterTarget) is preserved across the merger", () => {
    const { world, target, source } = worldWithTwoHeyas();
    const before = getHeyaRosterTarget(target) + getHeyaRosterTarget(source); // 20 + 12
    const next = resolveImpacts(world, [
      executeMerger(world, source.id, target.id, "succession_no_heir"),
    ]);

    const merged = next.heyas.get(target.id)!;
    // The dying stable's remaining men move with their implied capacity;
    // only its unfilled headroom (12 - 8) dies with it.
    expect(getHeyaRosterTarget(merged)).toBeGreaterThanOrEqual(before - (12 - 8));
  });

  it("transferred men carry their slots even into a large absorber", () => {
    const { world, target, source } = worldWithTwoHeyas({
      targetRosterSize: 15,
      sourceRosterSize: 3,
    });
    const next = resolveImpacts(world, [
      executeMerger(world, source.id, target.id, "succession_no_heir"),
    ]);
    const merged = next.heyas.get(target.id)!;
    // 3 men moved → their implied capacity moves with them; the
    // absorber's pre-existing headroom is its own, not a substitute.
    expect(getHeyaRosterTarget(merged)).toBe(23);
  });
});
