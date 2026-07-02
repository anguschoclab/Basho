import { describe, it, expect } from "vitest";
import { checkYokozunaPromotions } from "@/engine/lifecycle/BashoHistory";
import { createImpactBuilder } from "@/engine/core/ImpactBuilder";
import { mockRikishi } from "../utils";
import type { WorldState } from "@/engine/types/world";

describe("checkYokozunaPromotions", () => {
  function createMockWorld(opts: {
    rikishiEntries: Array<{ id: string; rank?: string; heat?: number; history?: any[] }>;
    activeIds?: string[];
    historyIndex?: any;
  }): WorldState {
    const rikishi = new Map<string, any>();
    for (const entry of opts.rikishiEntries) {
      rikishi.set(
        entry.id,
        mockRikishi(entry.id, {
          rank: (entry.rank as any) ?? "maegashira",
          shikona: `Rikishi-${entry.id}`,
          heyaId: "heya-1",
        })
      );
    }
    const activeRikishiIds = new Set(opts.activeIds ?? opts.rikishiEntries.map((e) => e.id));

    const historyIndex = opts.historyIndex ?? {
      version: "1.0.0",
      rikishi: {} as Record<string, any[]>,
    };
    // Fill in history from entries if not explicitly provided
    for (const entry of opts.rikishiEntries) {
      if (entry.history && !historyIndex.rikishi[entry.id]) {
        historyIndex.rikishi[entry.id] = entry.history;
      }
    }

    const mediaHeat: Record<string, number> = {};
    for (const entry of opts.rikishiEntries) {
      if (entry.heat !== undefined) mediaHeat[entry.id] = entry.heat;
    }

    return {
      year: 2025,
      rikishi,
      activeRikishiIds,
      historyIndex,
      mediaState: {
        mediaHeat,
        heyaPressure: {},
      } as any,
    } as unknown as WorldState;
  }

  it("returns early when historyIndex is missing", () => {
    const world = createMockWorld({
      rikishiEntries: [{ id: "oz-1", rank: "ozeki", heat: 80 }],
    });
    (world as any).historyIndex = undefined;

    const builder = createImpactBuilder("test");
    checkYokozunaPromotions(world, builder);
    const impact = builder.build();

    expect(impact.events).toBeUndefined();
  });

  it("returns early when activeRikishiIds is empty", () => {
    const world = createMockWorld({
      rikishiEntries: [{ id: "oz-1", rank: "ozeki", heat: 80 }],
      activeIds: [],
    });

    const builder = createImpactBuilder("test");
    checkYokozunaPromotions(world, builder);
    const impact = builder.build();

    expect(impact.events).toBeUndefined();
  });

  it("filters to only ozeki rank", () => {
    const world = createMockWorld({
      rikishiEntries: [
        {
          id: "oz-1",
          rank: "ozeki",
          heat: 80,
          history: [
            { bashoKey: "2024-6", yusho: true },
            { bashoKey: "2025-1", yusho: true },
          ],
        },
        { id: "mk-1", rank: "maegashira", heat: 90 },
        { id: "mk-2", rank: "sekiwake", heat: 90 },
      ],
    });

    const builder = createImpactBuilder("test");
    checkYokozunaPromotions(world, builder);
    const impact = builder.build();

    const deliberations = impact.events?.filter((e) => e.type === "PROMOTION_DELIBERATION");
    expect(deliberations).toHaveLength(1);
    expect(deliberations?.[0].rikishiId).toBe("oz-1");
  });

  it("handles multiple ozeki with qualifying stats", () => {
    const world = createMockWorld({
      rikishiEntries: [
        {
          id: "oz-1",
          rank: "ozeki",
          heat: 80,
          history: [
            { bashoKey: "2024-6", yusho: true },
            { bashoKey: "2025-1", yusho: true },
          ],
        },
        {
          id: "oz-2",
          rank: "ozeki",
          heat: 80,
          history: [
            { bashoKey: "2024-6", yusho: true },
            { bashoKey: "2025-1", yusho: true },
          ],
        },
        {
          id: "oz-3",
          rank: "ozeki",
          heat: 80,
          history: [{ bashoKey: "2025-1", yusho: true }],
        },
      ],
    });

    const builder = createImpactBuilder("test");
    checkYokozunaPromotions(world, builder);
    const impact = builder.build();

    const deliberations = impact.events?.filter((e) => e.type === "PROMOTION_DELIBERATION");
    expect(deliberations).toHaveLength(2);
    const ids = deliberations?.map((d) => d.rikishiId).sort();
    expect(ids).toEqual(["oz-1", "oz-2"]);
  });

  it("skips ozeki with insufficient history (< 2 basho)", () => {
    const world = createMockWorld({
      rikishiEntries: [
        {
          id: "oz-1",
          rank: "ozeki",
          heat: 80,
          history: [{ bashoKey: "2025-1", yusho: true }],
        },
      ],
    });

    const builder = createImpactBuilder("test");
    checkYokozunaPromotions(world, builder);
    const impact = builder.build();

    const deliberations = impact.events?.filter((e) => e.type === "PROMOTION_DELIBERATION");
    expect(deliberations).toBeUndefined();
  });

  it("identifies favorable deliberation when heat >= 75", () => {
    const world = createMockWorld({
      rikishiEntries: [
        {
          id: "oz-1",
          rank: "ozeki",
          heat: 80,
          history: [
            { bashoKey: "2024-6", yusho: true },
            { bashoKey: "2025-1", yusho: true },
          ],
        },
      ],
    });

    const builder = createImpactBuilder("test");
    checkYokozunaPromotions(world, builder);
    const impact = builder.build();

    const deliberation = impact.events?.find((e) => e.type === "PROMOTION_DELIBERATION");
    expect(deliberation).toBeDefined();
    expect(deliberation?.data.status).toBe("favorable");
  });

  it("identifies controversial deliberation when heat < 75", () => {
    const world = createMockWorld({
      rikishiEntries: [
        {
          id: "oz-1",
          rank: "ozeki",
          heat: 50,
          history: [
            { bashoKey: "2024-6", yusho: true },
            { bashoKey: "2025-1", yusho: true },
          ],
        },
      ],
    });

    const builder = createImpactBuilder("test");
    checkYokozunaPromotions(world, builder);
    const impact = builder.build();

    const deliberation = impact.events?.find((e) => e.type === "PROMOTION_DELIBERATION");
    expect(deliberation).toBeDefined();
    expect(deliberation?.data.status).toBe("controversial");
  });

  it("filters out undefined rikishi from active set", () => {
    const world = createMockWorld({
      rikishiEntries: [
        {
          id: "oz-1",
          rank: "ozeki",
          heat: 80,
          history: [
            { bashoKey: "2024-6", yusho: true },
            { bashoKey: "2025-1", yusho: true },
          ],
        },
      ],
      activeIds: ["oz-1", "ghost-id"],
    });

    const builder = createImpactBuilder("test");
    checkYokozunaPromotions(world, builder);
    const impact = builder.build();

    const deliberations = impact.events?.filter((e) => e.type === "PROMOTION_DELIBERATION");
    expect(deliberations).toHaveLength(1);
    expect(deliberations?.[0].rikishiId).toBe("oz-1");
  });

  it("qualifies with 1 yusho + 1 jun-yusho", () => {
    const world = createMockWorld({
      rikishiEntries: [
        {
          id: "oz-1",
          rank: "ozeki",
          heat: 80,
          history: [
            { bashoKey: "2024-6", yusho: true, junYusho: false },
            { bashoKey: "2025-1", yusho: false, junYusho: true },
          ],
        },
      ],
    });

    const builder = createImpactBuilder("test");
    checkYokozunaPromotions(world, builder);
    const impact = builder.build();

    const deliberation = impact.events?.find((e) => e.type === "PROMOTION_DELIBERATION");
    expect(deliberation).toBeDefined();
  });
});
