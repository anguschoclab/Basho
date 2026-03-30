import { describe, it, expect, beforeEach } from "vitest";
import { DefaultRetirementStrategy } from "../npcRetirementStrategy";
import { mockRikishi } from "./utils";
import type { WorldState } from "../types/world";
import type { Heya } from "../types/heya";
import type { Oyakata } from "../types/oyakata";
import type { Rikishi } from "../types/rikishi";

describe("DefaultRetirementStrategy", () => {
  let world: WorldState;
  let heya: Heya;
  let oyakata: Oyakata;

  beforeEach(() => {
    const r1 = mockRikishi("r1", { birthYear: 2000 }); // Age 26 in 2026
    const r2 = mockRikishi("r2", { birthYear: 1980 }); // Age 46 in 2026 (Retired)

    world = {
      id: "w1",
      seed: "test-seed",
      year: 2026,
      calendar: { year: 2026, month: 1, currentWeek: 1, currentDay: 1 },
      rikishi: new Map([
        ["r1", r1],
        ["r2", r2],
      ]),
      events: { version: "1.0.0", log: [], dedupe: {} },
    } as unknown as WorldState;

    heya = {
      id: "h1",
      rikishiIds: ["r1", "r2"],
    } as unknown as Heya;

    oyakata = {
      id: "o1",
      archetype: "balanced",
    } as unknown as Oyakata;
  });

  it("should retain active rikishi and remove retired ones", () => {
    DefaultRetirementStrategy.evaluateRetirements(world, heya, oyakata);

    // r1 should remain
    expect(heya.rikishiIds).toContain("r1");
    expect(world.rikishi.has("r1")).toBe(true);

    // r2 should be retired (Age 46)
    expect(heya.rikishiIds).not.toContain("r2");
    expect(world.rikishi.has("r2")).toBe(false);

    // Should log a retirement event
    const retirementEvent = world.events.log.find(e => e.type === "RETIREMENT" && e.rikishiId === "r2");
    expect(retirementEvent).toBeDefined();
    expect(retirementEvent?.data.reason).toBe("Mandatory Age Retirement");
  });

  it("should retire rikishi with career-ending injuries", () => {
    const r3 = mockRikishi("r3", {
      birthYear: 2000,
      injuryStatus: { isInjured: true, severity: 95 } as any
    });
    world.rikishi.set("r3", r3);
    heya.rikishiIds.push("r3");

    DefaultRetirementStrategy.evaluateRetirements(world, heya, oyakata);

    expect(heya.rikishiIds).not.toContain("r3");
    expect(world.rikishi.has("r3")).toBe(false);

    const event = world.events.log.find(e => e.rikishiId === "r3");
    expect(event?.data.reason).toBe("Career-Ending Injury");
  });

  it("should handle missing rikishi gracefully", () => {
    heya.rikishiIds.push("non-existent");

    // Should not throw
    expect(() => {
      DefaultRetirementStrategy.evaluateRetirements(world, heya, oyakata);
    }).not.toThrow();

    expect(heya.rikishiIds).toContain("non-existent");
  });

  it("should handle probabilistic retirement with a known seed", () => {
    // Age 44, no injury. Base retirement chance is (44-34)*0.05 = 0.5
    const r4 = mockRikishi("r4", { birthYear: 1982 }); // Age 44
    world.rikishi.set("r4", r4);
    heya.rikishiIds = ["r4"];

    // Seed search to find a seed that triggers retirement for r4
    let retired = false;
    for (let i = 0; i < 100; i++) {
        world.seed = `seed-${i}`;
        world.events.log = [];
        world.rikishi.set("r4", { ...r4 });
        heya.rikishiIds = ["r4"];

        DefaultRetirementStrategy.evaluateRetirements(world, heya, oyakata);
        if (heya.rikishiIds.length === 0) {
            retired = true;
            // console.log("Triggered with seed-", i);
            break;
        }
    }

    expect(retired).toBe(true);
    const event = world.events.log.find(e => e.rikishiId === "r4");
    expect(event?.data.reason).toBe("Age & Fatigue");
  });
});
