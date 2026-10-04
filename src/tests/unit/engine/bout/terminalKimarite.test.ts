import { describe, it, expect } from "vitest";
import { SeededRNG } from "@/engine/rng";
import {
  pickTerminalKimarite,
  classifyPushExitKimarite,
  classifyBeltExitKimarite,
  classifyPushFallKimarite,
  classifyBeltFallKimariteV2,
} from "@/engine/bout/terminalKimarite";
import { getKimarite } from "@/engine/kimariteRegistry";

/**
 * Terminal kimarite classification draws a technique label within the
 * ending type (push/belt × exit/fall) using weights proportional to real
 * makuuchi frequency shares. These tests pin the invariants: seeded
 * determinism, registry-valid output, dominant-head distributions, and
 * the contextual gates (grip, desperation, overcommitment).
 */

const N = 2000;

function drawN(fn: (rng: SeededRNG) => string, seed: string, n = N): Map<string, number> {
  const rng = new SeededRNG(seed);
  const counts = new Map<string, number>();
  for (let i = 0; i < n; i++) {
    const id = fn(rng);
    counts.set(id, (counts.get(id) ?? 0) + 1);
  }
  return counts;
}

const share = (counts: Map<string, number>, id: string, n = N) =>
  (counts.get(id) ?? 0) / n;

describe("terminalKimarite", () => {
  it("is deterministic — same seed produces the same sequence", () => {
    const a = new SeededRNG("bout-determinism");
    const b = new SeededRNG("bout-determinism");
    for (let i = 0; i < 100; i++) {
      expect(classifyBeltFallKimariteV2(a, "uwate", false)).toBe(
        classifyBeltFallKimariteV2(b, "uwate", false)
      );
    }
  });

  it("every returned id resolves to a real registered kimarite", () => {
    const seen = new Set<string>();
    for (const [fn, seed] of [
      [classifyPushExitKimarite, "pe"],
      [classifyBeltExitKimarite, "be"],
      [(r: SeededRNG) => classifyPushFallKimarite(r), "pf"],
      [(r: SeededRNG) => classifyBeltFallKimariteV2(r, "morozashi", true), "bf"],
    ] as const) {
      const rng = new SeededRNG(seed);
      for (let i = 0; i < 500; i++) seen.add(fn(rng));
    }
    for (const id of seen) expect(getKimarite(id), `unregistered: ${id}`).toBeDefined();
  });

  it("push exits are dominated by oshidashi (the real-world head of distribution)", () => {
    const counts = drawN(classifyPushExitKimarite, "push-exit-dist");
    // oshidashi real share (0.168) dwarfs the boosted runners-up
    // (tsukidashi 0.023×2.4). Expect a clear majority.
    expect(share(counts, "oshidashi")).toBeGreaterThan(0.5);
  });

  it("belt exits are dominated by yorikiri", () => {
    const counts = drawN(classifyBeltExitKimarite, "belt-exit-dist");
    expect(share(counts, "yorikiri")).toBeGreaterThan(0.4);
  });

  it("belt falls produce throw-family endings, not push techniques", () => {
    const counts = drawN((r) => classifyBeltFallKimariteV2(r, "uwate", false), "belt-fall-dist");
    const throws =
      share(counts, "uwatenage") +
      share(counts, "shitatenage") +
      share(counts, "kotenage") +
      share(counts, "sukuinage") +
      share(counts, "uwatedashinage") +
      share(counts, "shitatedashinage");
    expect(throws).toBeGreaterThan(0.5);
    expect(counts.get("oshidashi") ?? 0).toBe(0);
    expect(counts.get("tsukidashi") ?? 0).toBe(0);
  });

  it("uwate grip boosts uwatenage relative to shitate grip", () => {
    const uwate = drawN((r) => classifyBeltFallKimariteV2(r, "uwate", false), "grip-u");
    const shitate = drawN((r) => classifyBeltFallKimariteV2(r, "shitate", false), "grip-s");
    expect(share(uwate, "uwatenage")).toBeGreaterThan(share(shitate, "uwatenage"));
    expect(share(shitate, "shitatenage")).toBeGreaterThan(share(uwate, "shitatenage"));
  });

  it("utchari only occurs on desperation endings", () => {
    const calm = drawN((r) => classifyBeltFallKimariteV2(r, "uwate", false), "calm", 4000);
    expect(calm.get("utchari") ?? 0).toBe(0);
    const desperate = drawN((r) => classifyBeltFallKimariteV2(r, "uwate", true), "desperate", 4000);
    expect(desperate.get("utchari") ?? 0).toBeGreaterThan(0);
  });

  it("desperation unlocks the sorite tail (backward-bending throws)", () => {
    const sorite = ["izori", "kakezori", "shumokuzori", "sototasukizori", "tasukizori", "tsutaezori"];
    const count = (m: Map<string, number>) => sorite.reduce((s, id) => s + (m.get(id) ?? 0), 0);
    const calm = drawN((r) => classifyBeltFallKimariteV2(r, "shitate", false), "calm-s", 4000);
    const desperate = drawN((r) => classifyBeltFallKimariteV2(r, "shitate", true), "desp-s", 4000);
    expect(count(desperate)).toBeGreaterThan(count(calm));
  });

  it("loser overcommitment biases push falls toward momentum-capture techniques", () => {
    const normal = drawN((r) => classifyPushFallKimarite(r), "pf-normal", 4000);
    const over = drawN(
      (r) => classifyPushFallKimarite(r, { loserOvercommitted: true }),
      "pf-over",
      4000
    );
    for (const id of ["hatakikomi", "hikiotoshi", "tsukiotoshi"]) {
      expect(share(over, id, 4000)).toBeGreaterThan(share(normal, id, 4000));
    }
  });

  it("pickTerminalKimarite falls back safely for unknown ids", () => {
    const rng = new SeededRNG("fallback");
    // Unknown ids get the 0.0001 floor weight; a known id dominates.
    const picks = new Set<string>();
    for (let i = 0; i < 200; i++) {
      picks.add(
        pickTerminalKimarite(rng, [
          ["not_a_kimarite" as never, 1],
          ["also_fake" as never, 1],
          ["yorikiri" as never, 1],
        ])
      );
    }
    expect(picks.has("yorikiri")).toBe(true);
  });
});
