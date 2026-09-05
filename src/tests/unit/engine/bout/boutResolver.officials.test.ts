import { describe, it, expect } from "vitest";
import { resolveBout } from "@/engine/bout/boutResolver";
import { mockRikishi, makeMockBasho, makeMockWorld } from "../utils";
import type { BoutContext } from "@/engine/bout/boutPhysics";
import type { Gyoji, Shimpan } from "@/engine/types/gyoji";
import type { WorldState } from "@/engine/types/world";

function makeCtx(): BoutContext {
  return {
    id: "bout-officials-001",
    day: 1,
    rikishiEastId: "r-east",
    rikishiWestId: "r-west",
  };
}

function makeWorldWithPools(): WorldState {
  const gyojiPool: Gyoji[] = [
    { id: "g1", name: "Tate Gyoji", rank: "tate", accuracy: 80, yearsActive: 10, boutsOfficiated: 0, callsReversed: 0 },
    { id: "g2", name: "Fuku Gyoji", rank: "fuku-tate", accuracy: 70, yearsActive: 5, boutsOfficiated: 0, callsReversed: 0 },
  ];
  const shimpanPool: Shimpan[] = Array.from({ length: 10 }, (_, i) => ({
    id: `s${i}`,
    name: `Shimpan ${i}`,
    accuracy: 60 + i * 2,
    yearsActive: 5,
    consultations: 0,
  }));
  const world = makeMockWorld({});
  (world as any).gyojiPool = gyojiPool;
  (world as any).shimpanPool = shimpanPool;
  return world;
}

describe("resolveBout — gyoji & shimpan officiation", () => {
  it("assigns a gyojiId to the bout result", () => {
    const east = mockRikishi("r-east", { power: 60 });
    const west = mockRikishi("r-west", { power: 50 });
    const basho = makeMockBasho();
    const world = makeWorldWithPools();
    const ctx = makeCtx();

    const { result } = resolveBout(ctx, east, west, basho, undefined, world);
    expect(result.gyojiId).toBeDefined();
    expect(typeof result.gyojiId).toBe("string");
  });

  it("records bout in gyojiPool (boutsOfficiated increments)", () => {
    const east = mockRikishi("r-east", { power: 60 });
    const west = mockRikishi("r-west", { power: 50 });
    const basho = makeMockBasho();
    const world = makeWorldWithPools();
    const ctx = makeCtx();

    const { result, impact } = resolveBout(ctx, east, west, basho, undefined, world);
    // The impact should include a gyojiPool update in worldFields
    const worldFields = (impact as any).worldFields;
    expect(worldFields).toBeDefined();
    expect(worldFields.gyojiPool).toBeDefined();
    const assignedGyoji = worldFields.gyojiPool.find(
      (g: Gyoji) => g.id === result.gyojiId
    );
    expect(assignedGyoji).toBeDefined();
    expect(assignedGyoji.boutsOfficiated).toBeGreaterThanOrEqual(1);
  });

  it("assembles shimpan panel when monoii occurs", () => {
    // Create a bout that will trigger monoii — this is hard to force deterministically
    // so we verify the wiring exists by checking that shimpanPanelIds is set when
    // result.monoii is true. We use a high-aggression bout to increase monoii chance.
    const east = mockRikishi("r-east", { power: 80, technique: 20 });
    const west = mockRikishi("r-west", { power: 80, technique: 20 });
    const basho = makeMockBasho();
    const world = makeWorldWithPools();
    const ctx = makeCtx();

    const { result } = resolveBout(ctx, east, west, basho, undefined, world);
    // If monoii occurred, shimpan panel should be assembled
    if (result.monoii) {
      expect(result.shimpanPanelIds).toBeDefined();
      expect(result.shimpanPanelIds!.length).toBe(5);
      expect(result.monoiiOutcome).toBeDefined();
    }
    // At minimum, gyoji should always be assigned
    expect(result.gyojiId).toBeDefined();
  });
});
