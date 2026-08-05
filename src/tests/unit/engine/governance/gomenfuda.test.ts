/* eslint-disable @typescript-eslint/no-non-null-assertion, @typescript-eslint/no-explicit-any */
import { describe, it, expect } from "vitest";
import {
  recordGomenfuda,
  countGomenfudaForHeya,
  hasSanctionWarning,
  GOMENFUDA_REPUTATION_PENALTY,
  SANCTION_THRESHOLD,
  CONSECUTIVE_WITHDRAWAL_MULTIPLIER,
} from "@/engine/systems/governance/GomenfudaService";
import { resolveImpacts } from "@/engine/core/ImpactResolver";
import { mockRikishi, makeMockWorld } from "../utils";
import type { Heya } from "@/engine/types/heya";

function makeHeya(id: string): Partial<Heya> {
  return {
    id,
    name: `Heya ${id}`,
    funds: 100000,
    reputation: 50,
  } as any;
}

describe("Gomenfuda reputation penalty", () => {
  it("first gomenfuda applies base reputation penalty", () => {
    const heya = makeHeya("heya-1");
    const riki = mockRikishi("r-1", { shikona: "Test Rikishi" });
    const world = makeMockWorld({
      rikishi: new Map([[riki.id, riki]]),
      heyas: new Map([["heya-1", heya as any]]),
    });

    const impact = recordGomenfuda(world, heya as Heya, riki, "hatsu", "injury");
    const updated = resolveImpacts(world, [impact]);

    const updatedHeya = updated.heyas.get("heya-1") as any;
    expect(updatedHeya.reputation).toBe(50 - GOMENFUDA_REPUTATION_PENALTY);
  });

  it("consecutive gomenfuda applies multiplied penalty", () => {
    const heya = makeHeya("heya-1");
    const riki = mockRikishi("r-1", { shikona: "Test Rikishi" });
    // Simulate prior gomenfuda by adding to event log
    const world = makeMockWorld({
      rikishi: new Map([[riki.id, riki]]),
      heyas: new Map([["heya-1", heya as any]]),
    });
    (world as any).events = {
      version: "1.0.0",
      log: [
        {
          type: "BASHO_STATUS",
          category: "discipline",
          data: { status: "gomenfuda_posted", heyaId: "heya-1", year: world.year },
        },
      ],
      dedupe: {},
    };

    const impact = recordGomenfuda(world, heya as Heya, riki, "hatsu", "injury");
    const updated = resolveImpacts(world, [impact]);

    const updatedHeya = updated.heyas.get("heya-1") as any;
    // priorCount=1, penalty = 5 * 1.5 * 1 = 7.5 → rounded to 8
    const expectedPenalty = Math.round(GOMENFUDA_REPUTATION_PENALTY * CONSECUTIVE_WITHDRAWAL_MULTIPLIER * 1);
    expect(updatedHeya.reputation).toBe(50 - expectedPenalty);
  });

  it("marks rikishi as absentFinalDay", () => {
    const heya = makeHeya("heya-1");
    const riki = mockRikishi("r-1", { shikona: "Test Rikishi" });
    const world = makeMockWorld({
      rikishi: new Map([[riki.id, riki]]),
      heyas: new Map([["heya-1", heya as any]]),
    });

    const impact = recordGomenfuda(world, heya as Heya, riki, "hatsu", "injury");
    const updated = resolveImpacts(world, [impact]);

    expect(updated.rikishi.get("r-1")?.absentFinalDay).toBe(true);
  });
});

describe("Gomenfuda sanction threshold", () => {
  it("triggers JSA sanction warning at threshold", () => {
    const heya = makeHeya("heya-1");
    const riki = mockRikishi("r-1", { shikona: "Test Rikishi" });
    const world = makeMockWorld({
      rikishi: new Map([[riki.id, riki]]),
      heyas: new Map([["heya-1", heya as any]]),
    });
    const priorEvents = [];
    for (let i = 0; i < SANCTION_THRESHOLD - 1; i++) {
      priorEvents.push({
        type: "BASHO_STATUS",
        category: "discipline",
        data: { status: "gomenfuda_posted", heyaId: "heya-1", year: world.year },
      });
    }
    (world as any).events = { version: "1.0.0", log: priorEvents, dedupe: {} };

    const impact = recordGomenfuda(world, heya as Heya, riki, "hatsu", "scandal");
    // Should not throw and should include sanction warning event
    expect(impact.events.length).toBeGreaterThan(0);
    const sanctionEvent = impact.events.find(
      (e: any) => e.data?.status === "jsa_sanction_warning"
    );
    expect(sanctionEvent).toBeDefined();
  });

  it("no sanction warning below threshold", () => {
    const heya = makeHeya("heya-1");
    const riki = mockRikishi("r-1", { shikona: "Test Rikishi" });
    const world = makeMockWorld({
      rikishi: new Map([[riki.id, riki]]),
      heyas: new Map([["heya-1", heya as any]]),
    });

    const impact = recordGomenfuda(world, heya as Heya, riki, "hatsu", "injury");
    const sanctionEvent = impact.events.find(
      (e: any) => e.data?.status === "jsa_sanction_warning"
    );
    expect(sanctionEvent).toBeUndefined();
  });
});

describe("countGomenfudaForHeya", () => {
  it("returns 0 for heya with no gomenfuda", () => {
    const world = makeMockWorld({});
    expect(countGomenfudaForHeya(world, "heya-1", 2024)).toBe(0);
  });

  it("counts gomenfuda events for the specified heya and year", () => {
    const world = makeMockWorld({});
    (world as any).events = {
      version: "1.0.0",
      log: [
        { type: "BASHO_STATUS", category: "discipline", data: { status: "gomenfuda_posted", heyaId: "heya-1", year: 2024 } },
        { type: "BASHO_STATUS", category: "discipline", data: { status: "gomenfuda_posted", heyaId: "heya-1", year: 2024 } },
        { type: "BASHO_STATUS", category: "discipline", data: { status: "gomenfuda_posted", heyaId: "heya-2", year: 2024 } },
      ],
      dedupe: {},
    };
    expect(countGomenfudaForHeya(world, "heya-1", 2024)).toBe(2);
  });

  it("does not count events from other years", () => {
    const world = makeMockWorld({});
    (world as any).events = {
      version: "1.0.0",
      log: [
        { type: "BASHO_STATUS", category: "discipline", data: { status: "gomenfuda_posted", heyaId: "heya-1", year: 2023 } },
        { type: "BASHO_STATUS", category: "discipline", data: { status: "gomenfuda_posted", heyaId: "heya-1", year: 2024 } },
      ],
      dedupe: {},
    };
    expect(countGomenfudaForHeya(world, "heya-1", 2024)).toBe(1);
  });
});

describe("hasSanctionWarning", () => {
  it("returns true when count reaches threshold", () => {
    const world = makeMockWorld({});
    const events = [];
    for (let i = 0; i < SANCTION_THRESHOLD; i++) {
      events.push({
        type: "BASHO_STATUS",
        category: "discipline",
        data: { status: "gomenfuda_posted", heyaId: "heya-1", year: world.year },
      });
    }
    (world as any).events = { version: "1.0.0", log: events, dedupe: {} };
    expect(hasSanctionWarning(world, "heya-1")).toBe(true);
  });

  it("returns false below threshold", () => {
    const world = makeMockWorld({});
    (world as any).events = {
      version: "1.0.0",
      log: [
        { type: "BASHO_STATUS", category: "discipline", data: { status: "gomenfuda_posted", heyaId: "heya-1", year: world.year } },
      ],
      dedupe: {},
    };
    expect(hasSanctionWarning(world, "heya-1")).toBe(false);
  });
});
