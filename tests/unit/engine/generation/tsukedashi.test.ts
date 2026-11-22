/**
 * Spec (RED) — tsukedashi credential = proven quality + expiry.
 *
 * Real post-2023 rules: makushita TD enters at Ms60 (already implemented),
 * the credential expires one year after qualifying, and TDs are elite
 * amateurs — PA/devSpeed floors, ~8–12 MsTD per year league-wide, never
 * foreign at MsTD level (SdTD rare e.g. Kinbozan).
 */
import { describe, it, expect } from "vitest";
import { isCandidateSignable } from "@/engine/generation/talentPoolReads";
import { MockFactory } from "@tests/helpers/utils/MockFactory";
import type { TalentCandidate } from "@/engine/types/talent";

const baseWorld = () => {
  const world = MockFactory.createWorld({ year: 2026 });
  world.heyas.set("h1", MockFactory.createHeya("h1", {}));
  return world;
};

describe("tsukedashi expiry gate", () => {
  it("a candidate whose credential expired last year is not signable", () => {
    const world = baseWorld();
    const cand = MockFactory.createCandidate("c1", {
      tsukedashi: "makushita",
    } as Partial<TalentCandidate>);
    (cand as TalentCandidate & { tsukedashiExpiryYear?: number }).tsukedashiExpiryYear = 2025;
    expect(isCandidateSignable(world, cand, "h1")).toBe(false);
  });

  it("a candidate with a live credential remains signable", () => {
    const world = baseWorld();
    const cand = MockFactory.createCandidate("c2", {
      tags: ["tsukedashi_makushita"],
    });
    (cand as TalentCandidate & { tsukedashiExpiryYear?: number }).tsukedashiExpiryYear = 2026;
    expect(isCandidateSignable(world, cand, "h1")).toBe(true);
  });
});
