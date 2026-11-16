import { describe, it, expect } from "vitest";
import { simulateBout } from "@/engine/bout/boutResolver";
import { MockFactory } from "@tests/helpers/utils/MockFactory";

/**
 * `simulateBout` contract — the world-less measurement harness.
 *
 * Deliberately runs physics + narrative only: no officials pools, verdicts,
 * or injury application (world-less → no shimpanPool/gyojiPool). Measurement
 * scripts (compare-engines, measure-*) rely on this remaining pure.
 */
describe("simulateBout — world-less harness contract", () => {
  const east = MockFactory.createRikishi("east");
  const west = MockFactory.createRikishi("west");

  it("resolves a decisive bout", () => {
    const { result } = simulateBout(east, west, "contract-1");
    expect(result.winnerRikishiId).not.toBe("");
    expect(result.kimarite).not.toBe("fusensho");
  });

  it("is deterministic for the same seed", () => {
    const a = simulateBout(east, west, "contract-seed");
    const b = simulateBout(east, west, "contract-seed");
    expect(a.result.winnerRikishiId).toBe(b.result.winnerRikishiId);
    expect(a.result.kimarite).toBe(b.result.kimarite);
  });

  it("varies outcome across seeds (seed actually reaches physics)", () => {
    const winners = new Set<string>();
    const kimarite = new Set<string>();
    for (let i = 0; i < 40; i++) {
      const { result } = simulateBout(east, west, `contract-${i}`);
      winners.add(result.winnerRikishiId);
      kimarite.add(result.kimarite);
    }
    expect(winners.size).toBeGreaterThan(1);
    expect(kimarite.size).toBeGreaterThan(1);
  });

  it("produces no mono-ii verdict without a world (no officials pools)", () => {
    // Even over many bouts, a world-less resolution must never emit a
    // panel verdict — pools are world state.
    for (let i = 0; i < 30; i++) {
      const { result } = simulateBout(east, west, `monoii-${i}`);
      expect(result.monoiiOutcome).toBeUndefined();
    }
  });
});
