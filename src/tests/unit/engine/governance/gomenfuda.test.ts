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
import { withdrawRikishi } from "@/engine/systems/health/HealthActions";
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
    const expectedPenalty = Math.round(
      GOMENFUDA_REPUTATION_PENALTY * CONSECUTIVE_WITHDRAWAL_MULTIPLIER * 1
    );
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
    expect((impact.events ?? []).length).toBeGreaterThan(0);
    const sanctionEvent = (impact.events ?? []).find(
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
    const sanctionEvent = (impact.events ?? []).find(
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
        {
          type: "BASHO_STATUS",
          category: "discipline",
          data: { status: "gomenfuda_posted", heyaId: "heya-1", year: 2024 },
        },
        {
          type: "BASHO_STATUS",
          category: "discipline",
          data: { status: "gomenfuda_posted", heyaId: "heya-1", year: 2024 },
        },
        {
          type: "BASHO_STATUS",
          category: "discipline",
          data: { status: "gomenfuda_posted", heyaId: "heya-2", year: 2024 },
        },
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
        {
          type: "BASHO_STATUS",
          category: "discipline",
          data: { status: "gomenfuda_posted", heyaId: "heya-1", year: 2023 },
        },
        {
          type: "BASHO_STATUS",
          category: "discipline",
          data: { status: "gomenfuda_posted", heyaId: "heya-1", year: 2024 },
        },
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
        {
          type: "BASHO_STATUS",
          category: "discipline",
          data: { status: "gomenfuda_posted", heyaId: "heya-1", year: world.year },
        },
      ],
      dedupe: {},
    };
    expect(hasSanctionWarning(world, "heya-1")).toBe(false);
  });
});

// ── Bug fix tests: recordGomenfuda must write `year` to event data ────────
// The original implementation did not include `year` in the event data,
// so countGomenfudaForHeya (which filters by e.data.year === year) always
// returned 0 for events created by recordGomenfuda itself. This made the
// consecutive-withdrawal multiplier and sanction threshold non-functional.
// ──────────────────────────────────────────────────────────────────────────

describe("recordGomenfuda year-field bug fix", () => {
  it("countGomenfudaForHeya returns 1 after a single recordGomenfuda call", () => {
    const heya = makeHeya("heya-1");
    const riki = mockRikishi("r-1", { shikona: "Test Rikishi" });
    const world = makeMockWorld({
      rikishi: new Map([[riki.id, riki]]),
      heyas: new Map([["heya-1", heya as any]]),
    });

    const impact = recordGomenfuda(world, heya as Heya, riki, "hatsu", "injury");
    const updated = resolveImpacts(world, [impact]);

    // The event created by recordGomenfuda should be countable
    expect(countGomenfudaForHeya(updated, "heya-1", world.year)).toBe(1);
  });

  it("countGomenfudaForHeya returns 3 after three recordGomenfuda calls in same year", () => {
    const heya = makeHeya("heya-1");
    const r1 = mockRikishi("r-1", { shikona: "Rikishi 1" });
    const r2 = mockRikishi("r-2", { shikona: "Rikishi 2" });
    const r3 = mockRikishi("r-3", { shikona: "Rikishi 3" });
    const world = makeMockWorld({
      rikishi: new Map([[r1.id, r1], [r2.id, r2], [r3.id, r3]]),
      heyas: new Map([["heya-1", heya as any]]),
    });

    let current = world;
    for (const riki of [r1, r2, r3]) {
      const impact = recordGomenfuda(current, heya as Heya, riki, "hatsu", "injury");
      current = resolveImpacts(current, [impact]);
    }

    expect(countGomenfudaForHeya(current, "heya-1", world.year)).toBe(3);
  });

  it("hasSanctionWarning returns true after 3 recordGomenfuda calls", () => {
    const heya = makeHeya("heya-1");
    const r1 = mockRikishi("r-1", { shikona: "Rikishi 1" });
    const r2 = mockRikishi("r-2", { shikona: "Rikishi 2" });
    const r3 = mockRikishi("r-3", { shikona: "Rikishi 3" });
    const world = makeMockWorld({
      rikishi: new Map([[r1.id, r1], [r2.id, r2], [r3.id, r3]]),
      heyas: new Map([["heya-1", heya as any]]),
    });

    let current = world;
    for (const riki of [r1, r2, r3]) {
      const impact = recordGomenfuda(current, heya as Heya, riki, "hatsu", "injury");
      current = resolveImpacts(current, [impact]);
    }

    expect(hasSanctionWarning(current, "heya-1")).toBe(true);
  });

  it("consecutive multiplier applies when second recordGomenfuda sees first", () => {
    const heya = makeHeya("heya-1");
    const r1 = mockRikishi("r-1", { shikona: "Rikishi 1" });
    const r2 = mockRikishi("r-2", { shikona: "Rikishi 2" });
    const world = makeMockWorld({
      rikishi: new Map([[r1.id, r1], [r2.id, r2]]),
      heyas: new Map([["heya-1", heya as any]]),
    });

    // First withdrawal
    const impact1 = recordGomenfuda(world, heya as Heya, r1, "hatsu", "injury");
    const after1 = resolveImpacts(world, [impact1]);
    const repAfter1 = (after1.heyas.get("heya-1") as any).reputation;

    // Second withdrawal — pass the UPDATED heya from after1 so reputation
    // is read from the post-first-withdrawal state.
    const updatedHeya = after1.heyas.get("heya-1") as Heya;
    const impact2 = recordGomenfuda(after1, updatedHeya, r2, "haru", "injury");
    const after2 = resolveImpacts(after1, [impact2]);
    const repAfter2 = (after2.heyas.get("heya-1") as any).reputation;

    // First penalty = 5 (base), second penalty = round(5 * 1.5 * 1) = 8
    const firstPenalty = GOMENFUDA_REPUTATION_PENALTY;
    const secondPenalty = Math.round(
      GOMENFUDA_REPUTATION_PENALTY * CONSECUTIVE_WITHDRAWAL_MULTIPLIER * 1
    );
    expect(repAfter1).toBe(50 - firstPenalty);
    expect(repAfter2).toBe(50 - firstPenalty - secondPenalty);
    // The key assertion: second penalty > first penalty (multiplier applied)
    expect(secondPenalty).toBeGreaterThan(firstPenalty);
  });
});

// ── Player withdrawal path: WITHDRAW_RIKISHI must post gomenfuda mid-basho ──
// The worker's WITHDRAW_RIKISHI handler previously only called withdrawRikishi
// (which sets isKyujo + logs LIFECYCLE_EVENT) but never called recordGomenfuda.
// So player-initiated withdrawals didn't increment the gomenfuda count or
// trigger sanctions — only auto-injuries from phase01_week_health did.
// ─────────────────────────────────────────────────────────────────────────────

describe("WITHDRAW_RIKISHI + recordGomenfuda integration", () => {
  it("player withdrawal mid-basho posts a gomenfuda when combined with recordGomenfuda", () => {
    const heya = makeHeya("heya-1");
    const riki = mockRikishi("r-1", { shikona: "Test Rikishi", heyaId: "heya-1" });
    const world = makeMockWorld({
      rikishi: new Map([[riki.id, riki]]),
      heyas: new Map([["heya-1", heya as any]]),
    });
    (world as any).cyclePhase = "active_basho";
    (world as any).currentBashoName = "hatsu";

    // Mirror the worker handler: withdrawRikishi + recordGomenfuda when active_basho
    const withdrawImpact = withdrawRikishi(world, "r-1");
    const gomenfudaImpact = recordGomenfuda(world, heya as Heya, riki, "hatsu", "injury");
    const updated = resolveImpacts(world, [withdrawImpact, gomenfudaImpact]);

    expect(updated.rikishi.get("r-1")?.isKyujo).toBe(true);
    expect(updated.rikishi.get("r-1")?.absentFinalDay).toBe(true);
    expect(countGomenfudaForHeya(updated, "heya-1", world.year)).toBe(1);
  });

  it("player withdrawal outside basho does NOT post a gomenfuda", () => {
    const heya = makeHeya("heya-1");
    const riki = mockRikishi("r-1", { shikona: "Test Rikishi", heyaId: "heya-1" });
    const world = makeMockWorld({
      rikishi: new Map([[riki.id, riki]]),
      heyas: new Map([["heya-1", heya as any]]),
    });
    (world as any).cyclePhase = "interim";

    // Worker handler only calls recordGomenfuda when cyclePhase === "active_basho"
    const withdrawImpact = withdrawRikishi(world, "r-1");
    const updated = resolveImpacts(world, [withdrawImpact]);

    expect(updated.rikishi.get("r-1")?.isKyujo).toBe(true);
    expect(countGomenfudaForHeya(updated, "heya-1", world.year)).toBe(0);
  });
});
