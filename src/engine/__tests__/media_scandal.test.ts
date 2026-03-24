import { describe, it, expect } from "vitest";
import { WorldState } from "../types/world";
import { evaluateScandals } from "../media";
import { Rikishi } from "../types/rikishi";
import { Heya } from "../types/heya";

function createMockWorld(): WorldState {
  return {
    seed: "test-seed",
    year: 2026,
    week: 1,
    rikishi: new Map<string, Rikishi>(),
    heyas: new Map<string, Heya>(),
    events: { log: [], dedupe: {} },
    mediaState: {
      headlines: [],
      mediaHeat: {},
      heyaPressure: {},
      bashoStreaks: {},
      streakHeadlinesFired: {},
      promoWatchFired: {},
      retirementWatchFired: {},
      titleRaceDayFired: {},
      injuryWithdrawalFired: {},
      mediaHeatHistory: {},
    },
    currentBashoName: "Hatsu",
  } as unknown as WorldState;
}

function createMockRikishi(id: string, heyaId: string, discipline: number, mediaSavvy: number, stress: number): Rikishi {
  return {
    id,
    heyaId,
    shikona: `Rikishi-${id}`,
    behavior: { discipline, mediaSavvy, stress },
    motivation: 100,
    economics: { popularity: 50 },
    rank: "maegashira",
  } as unknown as Rikishi;
}

function createMockHeya(id: string): Heya {
  return {
    id,
    name: `Heya-${id}`,
    funds: 100000000, // 100M yen
    reputation: 50,
    scandalScore: 0,
    governanceStatus: "good_standing",
    rikishiIds: [],
    riskIndicators: {
        financial: false,
        governance: false,
        rivalry: false,
        welfare: false
    },
  } as unknown as Heya;
}

describe("Media & Scandal Engine", () => {
  it("Mock Test 1: The Perfect Yokozuna (0 scandals)", () => {
    const world = createMockWorld();
    const heya = createMockHeya("heya-1");
    const rikishi = createMockRikishi("yokozuna-1", "heya-1", 99, 95, 0);
    
    world.heyas.set(heya.id, heya);
    world.rikishi.set(rikishi.id, rikishi);
    heya.rikishiIds.push(rikishi.id);

    for (let i = 1; i <= 100; i++) {
        world.week = i;
        evaluateScandals(world);
    }

    expect(world.events.log.filter(e => e.type === "SCANDAL_REPORTED").length).toBe(0);
  });

  it("Mock Test 2: The Troublemaker (1-3 scandals, funding hits)", () => {
    const world = createMockWorld();
    const heya = createMockHeya("heya-trouble");
    // Extremely high risk: (90 * 1.5) - (10 * 2) = 135 - 20 = 115.
    // rng.next() * 100 < 115 is ALWAYS true.
    // caughtChance: 100 - 10 = 90%.
    const rikishi = createMockRikishi("trouble-1", "heya-trouble", 10, 10, 90);
    
    world.heyas.set(heya.id, heya);
    world.rikishi.set(rikishi.id, rikishi);
    heya.rikishiIds.push(rikishi.id);

    const initialFunds = heya.funds;

    for (let i = 1; i <= 10; i++) {
        world.week = i;
        evaluateScandals(world);
    }

    const scandalEvents = world.events.log.filter(e => e.type === "SCANDAL_REPORTED");
    expect(scandalEvents.length).toBeGreaterThanOrEqual(1);
    expect(heya.funds).toBeLessThan(initialFunds);
    
    // Check if JSA response capped motivation
    if (scandalEvents.some(e => e.data.severity !== "minor")) {
        expect(rikishi.motivation).toBeLessThanOrEqual(50);
        expect(rikishi.motivationCap).toBe(50);
    }
  });

  it("Mock Test 3: Narrative Diversity (Unique Headlines)", () => {
    const world = createMockWorld();
    const heya = createMockHeya("heya-diversity");
    const rikishi = createMockRikishi("divergent-1", "heya-diversity", 1, 1, 100);
    
    world.heyas.set(heya.id, heya);
    world.rikishi.set(rikishi.id, rikishi);
    heya.rikishiIds.push(rikishi.id);

    const headlines = new Set<string>();

    for (let i = 1; i <= 20; i++) {
        world.week = i;
        evaluateScandals(world);
        const latest = world.events.log[world.events.log.length - 1];
        if (latest && latest.type === "SCANDAL_REPORTED") {
            headlines.add(latest.title);
        }
    }

    // We expect some diversity in headlines (at least more than 1)
    expect(headlines.size).toBeGreaterThan(1);
  });
});
