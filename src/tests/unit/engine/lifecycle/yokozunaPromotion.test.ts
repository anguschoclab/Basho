 
import { describe, it, expect } from "vitest";
import { concludeBashoCompetition } from "@/engine/lifecycle/CompetitionService";
import { WorldState } from "@/engine/types/world";

describe("Yokozuna Promotion Logic", () => {
  const mockRikishiId = "ozeki-1";

  const createMockWorld = (yushosInPast: number, heat: number): WorldState => {
    const rikishi = new Map([
      [
        mockRikishiId,
        {
          id: mockRikishiId,
          shikona: "Ozeki Taro",
          rank: "ozeki",
          heyaId: "heya-1",
          isRetired: false,
        } as any,
      ],
    ]);

    const historyIndex = {
      version: "1.0.0",
      rikishi: {
        [mockRikishiId]: Array.from({ length: yushosInPast }).map((_, i) => ({
          bashoKey: `2025-${i + 1}` as any,
          yusho: true,
          rikishiId: mockRikishiId,
        })),
      },
    } as any;

    const mediaState = {
      mediaHeat: {
        [mockRikishiId]: heat,
      },
      heyaPressure: {},
    } as any;

    return {
      year: 2025,
      rikishi,
      activeRikishiIds: new Set([mockRikishiId]),
      historyIndex,
      mediaState,
      currentBasho: {
        bashoName: "hatsu",
        bashoNumber: 1,
        standings: new Map([[mockRikishiId, { wins: 15, losses: 0 }]]),
        matches: [],
      } as any,
      history: [],
      heyas: new Map([
        ["heya-1", { id: "heya-1", name: "Test Stable", oyakataId: "oyakata-1" } as any],
      ]),
      oyakata: new Map([["oyakata-1", { id: "oyakata-1", age: 50, name: "Test Oyakata" } as any]]),
      calendar: { month: 1, bashoNumber: 1 },
      events: [],
    } as any;
  };

  it("should trigger favorable deliberation for Ozeki with 2 consecutive Yushos and high heat", () => {
    const world = createMockWorld(1, 80); // 1 past yusho, 80 heat

    // For this test, we'll pre-populate the historyIndex with 2 yushos to simulate the "current + past" state
    world.historyIndex.rikishi[mockRikishiId] = [
      { bashoKey: "2024-6", yusho: true, rikishiId: mockRikishiId },
      { bashoKey: "2025-1", yusho: true, rikishiId: mockRikishiId },
    ];

    const impact = concludeBashoCompetition(world);

    const deliberationEvent = impact.events?.find((e) => e.type === "PROMOTION_DELIBERATION");
    expect(deliberationEvent).toBeDefined();
    expect(deliberationEvent?.data.status).toBe("favorable");
    expect(deliberationEvent?.rikishiId).toBe(mockRikishiId);
  });

  it("should trigger controversial deliberation for Ozeki with 2 consecutive Yushos but low heat", () => {
    const world = createMockWorld(1, 40); // 1 past yusho, 40 heat
    world.historyIndex.rikishi[mockRikishiId] = [
      { bashoKey: "2024-6", yusho: true, rikishiId: mockRikishiId },
      { bashoKey: "2025-1", yusho: true, rikishiId: mockRikishiId },
    ];

    const impact = concludeBashoCompetition(world);

    const deliberationEvent = impact.events?.find((e) => e.type === "PROMOTION_DELIBERATION");
    expect(deliberationEvent).toBeDefined();
    expect(deliberationEvent?.data.status).toBe("controversial");
  });

  it("should NOT trigger deliberation if stats are insufficient", () => {
    const world = createMockWorld(0, 90); // 0 past yushos, high heat
    world.historyIndex.rikishi[mockRikishiId] = [
      { bashoKey: "2025-1", yusho: true, rikishiId: mockRikishiId }, // Only 1 total
    ];

    const impact = concludeBashoCompetition(world);

    const deliberationEvent = impact.events?.find((e) => e.type === "PROMOTION_DELIBERATION");
    expect(deliberationEvent).toBeUndefined();
  });
});
