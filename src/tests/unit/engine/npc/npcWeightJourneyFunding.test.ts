/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-non-null-assertion */
import { describe, it, expect, beforeEach } from "vitest";
import { evaluateFinanceStrategy } from "@/engine/strategy/NPCFinanceCalculator";
import { tickMonthlyNPC } from "@/engine/npcAI/ticks";
import { MockFactory } from "../../../helpers/utils/MockFactory";
import type { Id } from "@/engine/types/common";

describe("NPC Weight Journey Funding Awareness", () => {
  const heyaId = "heya-wj" as Id;
  const oyakataId = "oyakata-wj" as Id;
  let world: ReturnType<typeof MockFactory.createWorld>;
  let heya: ReturnType<typeof MockFactory.createHeya>;
  let oyakata: ReturnType<typeof MockFactory.createOyakata>;

  beforeEach(() => {
    world = MockFactory.createWorld({ week: 1, year: 1990 });
    heya = MockFactory.createHeya(heyaId, { oyakataId });
    oyakata = MockFactory.createOyakata(oyakataId, {
      heyaId,
      archetype: "traditionalist",
      traits: { ambition: 90, patience: 50, risk: 50, tradition: 50, compassion: 50 },
    });
    world.heyas.set(heyaId, heya);
    world.oyakata.set(oyakataId, oyakata);
    world.playerHeyaId = "player-heya";
  });

  it("skips myoseki purchase when heya has stalled weight journey and low funds", () => {
    const r1 = MockFactory.createRikishi("r1", {
      heyaId,
      rank: "maegashira",
      division: "makuuchi",
      weightJourney: {
        targetKg: 130,
        progressKg: 5,
        stalled: true,
        phases: ["bulking"],
      },
    });
    world.rikishi.set("r1", r1);
    heya.rikishiIds = ["r1"];
    heya.funds = 100; // Very low funds — below stall threshold

    // Set up myoseki market to tempt purchase
    world.myosekiMarket = {
      stocks: {
        stock_power: {
          id: "stock_power",
          bonusType: "power",
          status: "available",
          askingPrice: 100,
        },
      },
    } as any;

    const impact = evaluateFinanceStrategy({ world, heya, oyakata });
    // Should NOT buy myoseki — funds preserved for weight journey
    const events = impact.events ?? [];
    const buyEvent = events.find((e: any) => e.data?.action === "buy_myoseki");
    expect(buyEvent).toBeUndefined();
  });

  it("proceeds normally when weight journeys are not stalled", () => {
    const r1 = MockFactory.createRikishi("r1", {
      heyaId,
      rank: "maegashira",
      division: "makuuchi",
      weightJourney: {
        targetKg: 130,
        progressKg: 50,
        stalled: false,
        phases: ["bulking"],
      },
    });
    world.rikishi.set("r1", r1);
    heya.rikishiIds = ["r1"];
    heya.funds = 1_000_000_000;

    world.myosekiMarket = {
      stocks: {
        stock_power: {
          id: "stock_power",
          bonusType: "power",
          status: "available",
          askingPrice: 100_000_000,
        },
      },
    } as any;

    const impact = evaluateFinanceStrategy({ world, heya, oyakata });
    // Should proceed with myoseki purchase (ambitious oyakata, high funds, no stall)
    const events = impact.events ?? [];
    const buyEvent = events.find((e: any) => e.data?.action === "buy_myoseki");
    expect(buyEvent).toBeDefined();
  });

  it("proceeds normally when heya funds are above 2x stall threshold", () => {
    const r1 = MockFactory.createRikishi("r1", {
      heyaId,
      rank: "maegashira",
      division: "makuuchi",
      weightJourney: {
        targetKg: 130,
        progressKg: 5,
        stalled: true,
        phases: ["bulking"],
      },
    });
    world.rikishi.set("r1", r1);
    heya.rikishiIds = ["r1"];
    // Need funds above 2x stall threshold (10000) AND sufficient runway (12 * 150000 = 1.8M)
    heya.funds = 2_000_000;

    world.myosekiMarket = {
      stocks: {
        stock_power: {
          id: "stock_power",
          bonusType: "power",
          status: "available",
          askingPrice: 100,
        },
      },
    } as any;

    const impact = evaluateFinanceStrategy({ world, heya, oyakata });
    // Should proceed — funds are sufficient for both weight journey and myoseki
    const events = impact.events ?? [];
    const buyEvent = events.find((e: any) => e.data?.action === "buy_myoseki");
    expect(buyEvent).toBeDefined();
  });

  it("tickMonthlyNPC logs awareness event when stalled journey detected", () => {
    const r1 = MockFactory.createRikishi("r1", {
      heyaId,
      rank: "maegashira",
      division: "makuuchi",
      weightJourney: {
        targetKg: 130,
        progressKg: 5,
        stalled: true,
        phases: ["bulking"],
      },
    });
    world.rikishi.set("r1", r1);
    heya.rikishiIds = ["r1"];
    heya.funds = 100; // Very low funds

    const impact = tickMonthlyNPC(world);
    const events = impact.events ?? [];
    const awarenessEvent = events.find(
      (e: any) => e.data?.decision === "weight_journey_funding_awareness"
    );
    expect(awarenessEvent).toBeDefined();
  });
});
