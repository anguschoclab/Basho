import { describe, it, expect } from "vitest";
import { rollDohyoCondition, applyDohyoCondition } from "@/engine/basho/dohyo";
import { initializeBasho } from "@/engine/generation/WorldFactory";
import { SerializationService } from "@/engine/persistence/SerializationService";
import { rngFromSeed } from "@/engine/core/rng";
import { mockRikishi, makeMockWorld } from "@tests/unit/engine/utils";
import type { BashoName } from "@/engine/types/basho";

/**
 * Venue/dohyo conditions (W J): each basho rolls a clay condition at
 * initialization — Kyushu's dry clay runs slick, Nagoya's humidity runs
 * heavy — and both wrestlers feel it equally via bout-clone modifiers.
 */

const NAMES: BashoName[] = ["hatsu", "haru", "natsu", "nagoya", "aki", "kyushu"];

describe("rollDohyoCondition", () => {
  it("is deterministic for a given seed + basho", () => {
    const rng1 = rngFromSeed("world-seed", "dohyo", "2027-kyushu");
    const rng2 = rngFromSeed("world-seed", "dohyo", "2027-kyushu");
    expect(rollDohyoCondition(rng1, "kyushu")).toBe(rollDohyoCondition(rng2, "kyushu"));
  });

  it("returns a valid condition for every basho", () => {
    for (const name of NAMES) {
      const c = rollDohyoCondition(rngFromSeed("s", "dohyo", name), name);
      expect(["firm", "slick", "heavy"]).toContain(c);
    }
  });

  it("Kyushu runs slick far more often than other venues (dry clay)", () => {
    const counts = (name: BashoName, n = 400) => {
      let slick = 0;
      for (let i = 0; i < n; i++) {
        if (rollDohyoCondition(rngFromSeed("w", "dohyo", `${i}-${name}`), name) === "slick") slick++;
      }
      return slick / n;
    };
    expect(counts("kyushu")).toBeGreaterThan(counts("hatsu") + 0.15);
  });
});

describe("applyDohyoCondition — bout-clone modifiers", () => {
  it("slick clay lowers balance for both sides equally", () => {
    const base = mockRikishi("r-1", { balance: 70, speed: 60 });
    const out = applyDohyoCondition(base, "slick");
    expect(out.stats!.balance!).toBeLessThan(70);
    // Original untouched — venue penalty lives on the bout clone only.
    expect(base.stats!.balance).toBe(70);
  });

  it("heavy clay slows tempo (speed + stamina)", () => {
    const base = mockRikishi("r-2", { speed: 60, stamina: 80 });
    const out = applyDohyoCondition(base, "heavy");
    expect(out.stats!.speed!).toBeLessThan(60);
    expect(out.stats!.stamina!).toBeLessThan(80);
  });

  it("firm clay is a no-op", () => {
    const base = mockRikishi("r-3", { balance: 70, speed: 60, stamina: 80 });
    const out = applyDohyoCondition(base, "firm");
    expect(out.stats!.balance).toBe(70);
    expect(out.stats!.speed).toBe(60);
    expect(out.stats!.stamina).toBe(80);
  });

  it("all venue modifiers stay within the 10% plan cap", () => {
    const base = mockRikishi("r-4", { balance: 50, speed: 50, stamina: 50, mental: 50 });
    for (const c of ["slick", "heavy"] as const) {
      const out = applyDohyoCondition(base, c);
      for (const k of ["balance", "speed", "stamina", "mental", "power", "technique"] as const) {
        const before = (base.stats as any)[k] ?? 50;
        const after = (out.stats as any)[k] ?? 50;
        expect(Math.abs(after - before) / before).toBeLessThanOrEqual(0.1 + 1e-9);
      }
    }
  });
});

describe("initializeBasho + serialization", () => {
  it("initializeBasho rolls and stores a dohyo condition deterministically", () => {
    const world = makeMockWorld({ seed: "venue-seed", year: 2027 });
    const b1 = initializeBasho(world, "kyushu");
    const b2 = initializeBasho(world, "kyushu");
    expect(["firm", "slick", "heavy"]).toContain(b1.dohyoCondition);
    expect(b1.dohyoCondition).toBe(b2.dohyoCondition);
  });

  it("dohyoCondition survives the serialize/deserialize round trip", () => {
    const world = makeMockWorld({ seed: "venue-seed", year: 2027 });
    const basho = { ...initializeBasho(world, "nagoya"), dohyoCondition: "slick" as const };
    const round = SerializationService.deserializeBashoState(
      SerializationService.serializeBashoState(basho)
    );
    expect(round.dohyoCondition).toBe("slick");
  });
});
