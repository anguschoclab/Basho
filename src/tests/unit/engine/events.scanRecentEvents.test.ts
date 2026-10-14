/**
 * Ordering/filtering contract for scanRecentEvents — the canonical
 * most-recent-first extractor for the append-only `world.events.log`.
 *
 * Contract under test (pinned after the v11 consolidation replaced three
 * hand-rolled per-component extraction loops with this shared helper):
 *   - results are newest-first: (year, week, day) descending
 *   - events sharing the same (year, week, day) are ordered by recency of
 *     insertion — a later-pushed event is "more recent" than an earlier one
 *   - `limit` caps the result; scanning stops early on the append-only log
 *   - `types`, `category`, and `minImportance` filters compose
 *   - a defensively-sorted result tolerates out-of-order log entries
 */
import { describe, it, expect } from "vitest";
import { scanRecentEvents } from "@/engine/events";
import type { EngineEvent } from "@/engine/types/events";

function ev(id: string, year: number, week: number, day = 0, overrides?: Partial<EngineEvent>): EngineEvent {
  return {
    id,
    type: "BASHO_STATUS",
    year,
    week,
    day,
    phase: "weekly",
    category: "basho",
    importance: "minor",
    scope: "world",
    title: `event ${id}`,
    summary: `summary ${id}`,
    ...overrides,
  } as EngineEvent;
}

describe("scanRecentEvents", () => {
  it("returns [] for empty and missing logs", () => {
    expect(scanRecentEvents([], {})).toEqual([]);
    expect(scanRecentEvents(undefined, { limit: 5 })).toEqual([]);
  });

  it("returns newest-first order across year/week/day", () => {
    const log = [
      ev("e-old", 2025, 1, 1),
      ev("e-mid1", 2025, 1, 2),
      ev("e-mid2", 2025, 2, 1),
      ev("e-new", 2026, 1, 1),
    ];
    expect(scanRecentEvents(log, {}).map((e) => e.id)).toEqual([
      "e-new",
      "e-mid2",
      "e-mid1",
      "e-old",
    ]);
  });

  it("orders same-(year,week,day) ties by recency of insertion", () => {
    // Same timestamp — the later-pushed event is the more recent one.
    const out = scanRecentEvents(
      [ev("pushed-1st", 2026, 5, 3), ev("pushed-2nd", 2026, 5, 3), ev("pushed-3rd", 2026, 5, 3)],
      {}
    );
    expect(out.map((e) => e.id)).toEqual(["pushed-3rd", "pushed-2nd", "pushed-1st"]);
  });

  it("caps results at limit and collects the last-pushed matches", () => {
    // Strictly increasing timestamps: last-pushed == most-recent.
    const log = Array.from({ length: 200 }, (_, i) =>
      ev(`L${String(i).padStart(3, "0")}`, 2026, Math.floor(i / 15) + 1, i % 15)
    );
    const out = scanRecentEvents(log, { limit: 10 });
    expect(out).toHaveLength(10);
    expect(out[0].id).toBe("L199");
    expect(out[9].id).toBe("L190");
  });

  it("composes types + minImportance + category filters", () => {
    const log = [
      ev("gov-major", 2026, 1, 1, { type: "GOVERNANCE_RULING", category: "discipline", importance: "major" }),
      ev("basho-minor", 2026, 1, 2, { type: "BASHO_STATUS", category: "basho", importance: "minor" }),
      ev("gov-minor", 2026, 1, 3, { type: "GOVERNANCE_RULING", category: "discipline", importance: "minor" }),
      ev("train-major", 2026, 1, 4, { type: "TRAINING_UPDATE", category: "training", importance: "major" }),
    ];
    const out = scanRecentEvents(log, {
      types: ["GOVERNANCE_RULING"],
      minImportance: "major",
      category: "discipline",
    });
    expect(out.map((e) => e.id)).toEqual(["gov-major"]);
  });

  it("minImportance includes the threshold level itself", () => {
    const log = [
      ev("imp-minor", 2026, 1, 1, { importance: "minor" }),
      ev("imp-major", 2026, 1, 2, { importance: "major" }),
      ev("imp-headline", 2026, 1, 3, { importance: "headline" }),
    ];
    const out = scanRecentEvents(log, { minImportance: "major" });
    expect(out.map((e) => e.id)).toEqual(["imp-headline", "imp-major"]);
  });

  it("tolerates an out-of-order log entry via defensive re-sort", () => {
    // An anomalous writer put a newer event behind an older one in the array;
    // the contract still demands newest-first output.
    const out = scanRecentEvents([ev("newer", 2026, 9, 1), ev("older", 2026, 1, 1)], {});
    expect(out.map((e) => e.id)).toEqual(["newer", "older"]);
  });

  it("filters category like EventLogPanel's filter chip does", () => {
    const log = [
      ev("c-basho-1", 2026, 3, 1, { category: "basho" }),
      ev("c-econ", 2026, 3, 2, { category: "economy" }),
      ev("c-basho-2", 2026, 3, 3, { category: "basho" }),
    ];
    const out = scanRecentEvents(log, { category: "basho" });
    expect(out.map((e) => e.id)).toEqual(["c-basho-2", "c-basho-1"]);
  });
});
