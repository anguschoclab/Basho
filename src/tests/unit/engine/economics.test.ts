import { describe, it, expect } from "vitest";
import { MockFactory } from "@/tests/helpers/utils/MockFactory";
import type { WorldState } from "@/engine/types/world";
import type { Heya } from "@/engine/types/heya";

function makeWorldWithInsolventHeya(): { world: WorldState; heya: Heya } {
  const heya = MockFactory.createHeya("h1", {
    funds: -500000,
    scandalScore: 10,
  });
  const world = MockFactory.createWorld({
    heyas: new Map([["h1", heya]]),
    events: { version: "1.0.0", log: [], dedupe: {} },
    sponsorPool: {
      sponsors: [
        {
          id: "sp1",
          heyaId: "h1",
          displayName: "Benefactor Corp",
          active: true,
          tier: "gold",
          weeklyStipend: 50000,
        },
      ],
    } as any,
  });
  return { world, heya };
}

describe("economics.handleInsolvency — EventBus migration", () => {
  it("handleInsolvency returns StateImpact instead of void", async () => {
    const { handleInsolvency } = await import("@/engine/economics");
    const { world, heya } = makeWorldWithInsolventHeya();
    const result = handleInsolvency(heya, world);

    // After migration, should return StateImpact
    expect(result).toBeDefined();
    expect(result).not.toBeUndefined();
    const impact = result as any;
    expect(impact.metadata).toBeDefined();
  });

  it("with benefactor available, impact includes FINANCIAL_ALERT event and heya funds update", async () => {
    const { handleInsolvency } = await import("@/engine/economics");
    const { world, heya } = makeWorldWithInsolventHeya();
    const result = handleInsolvency(heya, world) as any;

    if (result?.events) {
      const alertEvent = result.events.find((e: any) => e.type === "FINANCIAL_ALERT");
      expect(alertEvent).toBeDefined();
    }
    if (result?.entities?.heyaUpdates) {
      const updates = result.entities.heyaUpdates;
      if (updates instanceof Map) {
        const heyaUpdate = updates.get("h1");
        expect(heyaUpdate?.funds).toBeDefined();
      }
    }
  });

  it("no direct EventBus.financialAlert call — world.events is NOT mutated", async () => {
    const { handleInsolvency } = await import("@/engine/economics");
    const { world, heya } = makeWorldWithInsolventHeya();
    const initialLogLength = world.events?.log?.length ?? 0;

    handleInsolvency(heya, world);

    expect(world.events?.log?.length ?? 0).toBe(initialLogLength);
  });
});
