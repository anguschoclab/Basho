import { describe, it, expect } from "vitest";
import { updateHeyaInWorld } from "@/engine/queries";
import type { WorldState } from "@/engine/types/world";
import type { Heya } from "@/engine/types/heya";

function makeHeya(id: string, funds: number = 100): Heya {
  return {
    id,
    name: `Stable ${id}`,
    funds,
  } as unknown as Heya;
}

function makeWorld(heyas: Heya[] = []): WorldState {
  const map = new Map<string, Heya>();
  for (const h of heyas) map.set(h.id, h);
  return { heyas: map } as unknown as WorldState;
}

describe("updateHeyaInWorld", () => {
  it("returns new world with heya updated", () => {
    const h1 = makeHeya("h1", 100);
    const world = makeWorld([h1]);

    const next = updateHeyaInWorld(world, "h1", { funds: 500 });

    expect(next).not.toBe(world);
    expect(next.heyas).not.toBe(world.heyas);
    expect(next.heyas.get("h1")?.funds).toBe(500);
  });

  it("does not mutate input world", () => {
    const h1 = makeHeya("h1", 100);
    const world = makeWorld([h1]);

    updateHeyaInWorld(world, "h1", { funds: 999 });

    expect(world.heyas.get("h1")?.funds).toBe(100);
  });

  it("returns world unchanged for missing heyaId", () => {
    const h1 = makeHeya("h1", 100);
    const world = makeWorld([h1]);

    const next = updateHeyaInWorld(world, "nonexistent", { funds: 500 });

    expect(next).toBe(world);
  });

  it("preserves other heyas", () => {
    const h1 = makeHeya("h1", 100);
    const h2 = makeHeya("h2", 200);
    const world = makeWorld([h1, h2]);

    const next = updateHeyaInWorld(world, "h1", { funds: 500 });

    expect(next.heyas.get("h2")?.funds).toBe(200);
    expect(next.heyas.get("h1")?.funds).toBe(500);
  });

  it("creates new Map instance", () => {
    const h1 = makeHeya("h1", 100);
    const world = makeWorld([h1]);

    const next = updateHeyaInWorld(world, "h1", { funds: 500 });

    expect(next.heyas).not.toBe(world.heyas);
  });
});
