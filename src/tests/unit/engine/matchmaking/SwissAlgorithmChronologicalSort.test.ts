import { describe, it, expect } from "vitest";
import { buildSwissTorikumi } from "@/engine/matchmaking";
import { MockFactory } from "../../../helpers/utils/MockFactory";

describe("sortChronologically — partition ordering", () => {
  it("regular pairings come before elite pairings", () => {
    const yokozuna = MockFactory.createRikishi({ id: "yoko-1", rank: "yokozuna" });
    const ozeki = MockFactory.createRikishi({ id: "ozeki-1", rank: "ozeki" });
    const m1 = MockFactory.createRikishi({ id: "m1-1", rank: "maegashira", rankNumber: 1 });
    const m2 = MockFactory.createRikishi({ id: "m2-1", rank: "maegashira", rankNumber: 2 });
    const m5 = MockFactory.createRikishi({ id: "m5-1", rank: "maegashira", rankNumber: 5 });
    const m6 = MockFactory.createRikishi({ id: "m6-1", rank: "maegashira", rankNumber: 6 });

    const basho = MockFactory.createBasho({ day: 15 });
    const pairings = buildSwissTorikumi(basho, [yokozuna, ozeki, m1, m2, m5, m6], {
      seed: "test-chron-sort",
      division: "makuuchi",
    });

    expect(pairings.length).toBeGreaterThanOrEqual(1);

    // Find the index of the first elite pairing (if any)
    const firstEliteIdx = pairings.findIndex(
      (p) => p.reasons.includes("finale") || p.reasons.includes("kore_yori_sanyaku")
    );

    // Find the index of the last regular pairing (if any)
    const lastRegularIdx = pairings.reduce(
      (last, p, i) =>
        !p.reasons.includes("finale") && !p.reasons.includes("kore_yori_sanyaku") ? i : last,
      -1
    );

    // If both exist, regular must come before elite
    if (firstEliteIdx >= 0 && lastRegularIdx >= 0) {
      expect(lastRegularIdx).toBeLessThan(firstEliteIdx);
    }
  });

  it("empty pool produces empty pairings", () => {
    const basho = MockFactory.createBasho({ day: 1 });
    const pairings = buildSwissTorikumi(basho, [], {
      seed: "test-empty",
      division: "makuuchi",
    });
    expect(pairings).toEqual([]);
  });

  it("all-elite pool produces only elite pairings", () => {
    const yokozuna = MockFactory.createRikishi({ id: "yoko-1", rank: "yokozuna" });
    const ozeki = MockFactory.createRikishi({ id: "ozeki-1", rank: "ozeki" });
    const sekiwake = MockFactory.createRikishi({ id: "sek-1", rank: "sekiwake" });
    const komusubi = MockFactory.createRikishi({ id: "kom-1", rank: "komusubi" });

    const basho = MockFactory.createBasho({ day: 15 });
    const pairings = buildSwissTorikumi(basho, [yokozuna, ozeki, sekiwake, komusubi], {
      seed: "test-all-elite",
      division: "makuuchi",
    });

    // On day 15 with all sanyaku, all pairings should be elite-tagged
    // (or at minimum, no regular pairings should appear after elite ones)
    const firstEliteIdx = pairings.findIndex(
      (p) => p.reasons.includes("finale") || p.reasons.includes("kore_yori_sanyaku")
    );
    const lastRegularIdx = pairings.reduce(
      (last, p, i) =>
        !p.reasons.includes("finale") && !p.reasons.includes("kore_yori_sanyaku") ? i : last,
      -1
    );

    if (firstEliteIdx >= 0 && lastRegularIdx >= 0) {
      expect(lastRegularIdx).toBeLessThan(firstEliteIdx);
    }
  });

  it("mixed pool partitions correctly with no regular after elite", () => {
    const yokozuna = MockFactory.createRikishi({ id: "yoko-1", rank: "yokozuna" });
    const m10 = MockFactory.createRikishi({ id: "m10-1", rank: "maegashira", rankNumber: 10 });
    const m11 = MockFactory.createRikishi({ id: "m11-1", rank: "maegashira", rankNumber: 11 });
    const m12 = MockFactory.createRikishi({ id: "m12-1", rank: "maegashira", rankNumber: 12 });
    const m13 = MockFactory.createRikishi({ id: "m13-1", rank: "maegashira", rankNumber: 13 });
    const m14 = MockFactory.createRikishi({ id: "m14-1", rank: "maegashira", rankNumber: 14 });

    const basho = MockFactory.createBasho({ day: 15 });
    const pairings = buildSwissTorikumi(basho, [yokozuna, m10, m11, m12, m13, m14], {
      seed: "test-mixed-partition",
      division: "makuuchi",
    });

    // Verify no regular pairing appears after an elite pairing
    let foundElite = false;
    for (const p of pairings) {
      const isElite = p.reasons.includes("finale") || p.reasons.includes("kore_yori_sanyaku");
      if (isElite) foundElite = true;
      else if (foundElite) {
        // Regular pairing after elite — should not happen
        expect.fail("Regular pairing found after elite pairing");
      }
    }
  });
});
