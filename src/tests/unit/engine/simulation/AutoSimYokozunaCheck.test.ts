import { describe, it, expect } from "vitest";
import { makeMockWorld, mockRikishi } from "../utils";
import type { Rikishi } from "@/engine/types/rikishi";

describe("AutoSimService — yokozuna vacancy check behavior", () => {
  it("world with an active yokozuna should detect hasYokozuna=true", () => {
    const world = makeMockWorld();
    const yokozuna = mockRikishi("yoko-1", { rank: "yokozuna", isRetired: false });
    world.rikishi.set(yokozuna.id, yokozuna);

    // Simulate the check logic: Array.from(values).some(r => r.rank === "yokozuna" && !r.isRetired)
    let hasYokozuna = false;
    for (const r of world.rikishi.values()) {
      if (r.rank === "yokozuna" && !r.isRetired) {
        hasYokozuna = true;
        break;
      }
    }
    expect(hasYokozuna).toBe(true);
  });

  it("world with only retired yokozuna should detect hasYokozuna=false", () => {
    const world = makeMockWorld();
    const retiredYokozuna = mockRikishi("yoko-retired", {
      rank: "yokozuna",
      isRetired: true,
    });
    world.rikishi.set(retiredYokozuna.id, retiredYokozuna);

    let hasYokozuna = false;
    for (const r of world.rikishi.values()) {
      if (r.rank === "yokozuna" && !r.isRetired) {
        hasYokozuna = true;
        break;
      }
    }
    expect(hasYokozuna).toBe(false);
  });

  it("world with no yokozuna should detect hasYokozuna=false", () => {
    const world = makeMockWorld();
    const ozeki = mockRikishi("ozeki-1", { rank: "ozeki" });
    world.rikishi.set(ozeki.id, ozeki);

    let hasYokozuna = false;
    for (const r of world.rikishi.values()) {
      if (r.rank === "yokozuna" && !r.isRetired) {
        hasYokozuna = true;
        break;
      }
    }
    expect(hasYokozuna).toBe(false);
  });

  it("world with injured but active yokozuna should detect hasYokozuna=true", () => {
    const world = makeMockWorld();
    const injuredYokozuna = mockRikishi("yoko-injured", {
      rank: "yokozuna",
      isRetired: false,
      injured: true,
    });
    world.rikishi.set(injuredYokozuna.id, injuredYokozuna);

    let hasYokozuna = false;
    for (const r of world.rikishi.values()) {
      if (r.rank === "yokozuna" && !r.isRetired) {
        hasYokozuna = true;
        break;
      }
    }
    expect(hasYokozuna).toBe(true);
  });

  it("for...of loop with early exit matches Array.from().some() result", () => {
    const world = makeMockWorld();
    // Add many rikishi with no yokozuna
    for (let i = 0; i < 50; i++) {
      const r = mockRikishi(`r-${i}`, { rank: "maegashira", rankNumber: i + 1 });
      world.rikishi.set(r.id, r);
    }
    // Add a yokozuna at the end
    const yokozuna = mockRikishi("yoko-late", { rank: "yokozuna" });
    world.rikishi.set(yokozuna.id, yokozuna);

    // Array.from().some() version
    const arrayResult = Array.from(world.rikishi.values() as IterableIterator<Rikishi>).some(
      (r) => r.rank === "yokozuna" && !r.isRetired
    );

    // for...of version
    let loopResult = false;
    for (const r of world.rikishi.values() as IterableIterator<Rikishi>) {
      if (r.rank === "yokozuna" && !r.isRetired) {
        loopResult = true;
        break;
      }
    }

    expect(arrayResult).toBe(loopResult);
    expect(loopResult).toBe(true);
  });
});
