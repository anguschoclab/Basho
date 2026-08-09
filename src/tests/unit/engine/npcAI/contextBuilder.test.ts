import { describe, it, expect } from "vitest";
import { buildAIContext } from "@/engine/npcAI/contextBuilder";
import { MockFactory } from "@/tests/helpers/utils/MockFactory";
import type { AIContext } from "@/engine/ai/types";

describe("buildAIContext — return shape (Step 2 regression)", () => {
  it("returns an AIContext with all required fields populated", () => {
    const heya = MockFactory.createHeya("heya-1");
    const oyakata = MockFactory.createOyakata("oy-1", { heyaId: "heya-1" });
    const rikishi = MockFactory.createRikishi("r-1", { heyaId: "heya-1" });
    const world = MockFactory.createWorld({
      heyas: new Map([["heya-1", heya]]),
      oyakata: new Map([["oy-1", oyakata]]),
      rikishi: new Map([["r-1", rikishi]]),
      playerHeyaId: "heya-1",
    });

    const ctx = buildAIContext(world, "heya-1", "oy-1");

    expect(ctx).toBeDefined();
    expect(ctx.world).toBe(world);
    expect(ctx.heyaId).toBe("heya-1");
    expect(ctx.oyakata).toBeDefined();
    expect(ctx.oyakata?.id).toBe("oy-1");
    expect(ctx.oyakata?.archetype).toBe("traditionalist");
    expect(ctx.oyakata?.traits).toEqual({
      ambition: 50,
      patience: 50,
      risk: 50,
      tradition: 50,
      compassion: 50,
    });
    expect(ctx.perception).toBeDefined();
    expect(ctx.leaguePerception).toBeDefined();
    expect(ctx.memory).toBeDefined();
  });

  it("returns AIContext without oyakata/memory when oyakataId is omitted", () => {
    const heya = MockFactory.createHeya("heya-1");
    const world = MockFactory.createWorld({
      heyas: new Map([["heya-1", heya]]),
      playerHeyaId: "heya-1",
    });

    const ctx = buildAIContext(world, "heya-1");

    expect(ctx.oyakata).toBeUndefined();
    expect(ctx.memory).toBeUndefined();
    expect(ctx.perception).toBeDefined();
    expect(ctx.leaguePerception).toBeDefined();
  });

  it("satisfies the AIContext interface at compile time", () => {
    const world = MockFactory.createWorld();
    const ctx: AIContext = buildAIContext(world, "nonexistent");
    expect(ctx.heyaId).toBe("nonexistent");
  });
});
