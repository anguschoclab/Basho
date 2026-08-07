import { describe, it, expect } from "vitest";
import { makeMockWorld, makeMockHeya } from "../utils";
import { buildAIContext } from "@/engine/npcAI/contextBuilder";

const HEYA_ID = "h1";
const OYAKATA_ID = "o1";

describe("buildAIContext", () => {
  it("assembles a context with perception and league perception", () => {
    const world = makeMockWorld();
    const heya = makeMockHeya(HEYA_ID);
    world.heyas.set(HEYA_ID, heya);
    const ctx = buildAIContext(world, HEYA_ID);
    expect(ctx.world).toBe(world);
    expect(ctx.heyaId).toBe(HEYA_ID);
    expect(ctx.perception).toBeDefined();
    expect(ctx.leaguePerception).toBeDefined();
    expect(ctx.oyakata).toBeUndefined();
  });

  it("includes oyakata data when an oyakataId is provided", () => {
    const world = makeMockWorld();
    const heya = makeMockHeya(HEYA_ID, { oyakataId: OYAKATA_ID });
    world.heyas.set(HEYA_ID, heya);
    world.oyakata.set(OYAKATA_ID, {
      id: OYAKATA_ID,
      name: "Oya",
      archetype: "traditionalist",
      traits: { ambition: 50, risk: 50, tradition: 50, patience: 50, compassion: 50 },
      mood: "calm",
    } as any);
    const ctx = buildAIContext(world, HEYA_ID, OYAKATA_ID);
    expect(ctx.oyakata).toBeDefined();
    expect(ctx.oyakata?.id).toBe(OYAKATA_ID);
    expect(ctx.oyakata?.archetype).toBe("traditionalist");
    expect(ctx.memory).toBeDefined();
  });

  it("reuses a precomputed league perception when supplied", () => {
    const world = makeMockWorld();
    const heya = makeMockHeya(HEYA_ID);
    world.heyas.set(HEYA_ID, heya);
    const league = { financiallyFragileHeyas: [], rivalryClusters: [], yushoRace: { leaders: [] }, topRecruitAvailable: false };
    const ctx = buildAIContext(world, HEYA_ID, undefined, league as any);
    expect(ctx.leaguePerception).toBe(league);
  });
});
