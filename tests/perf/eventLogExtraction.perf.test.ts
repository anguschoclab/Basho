/**
 * Perf benchmark for the v11 event-log extraction consolidation.
 *
 * Compares the legacy per-component extraction (filter → sort → slice, the
 * O(N·log N) pattern replaced across EventFeed / EventLogPanel / NewsWidget)
 * against `scanRecentEvents` (backward scan + early break + defensive re-sort
 * of the bounded result) on synthetic append-only logs.
 *
 * The legacy implementation is inlined verbatim so the test measures the real
 * algorithmic delta, not a mock.
 */
import { describe, it, expect } from "vitest";
import { scanRecentEvents } from "@/engine/events/events";
import type { EngineEvent, EventImportance } from "@/engine/types/events";

const IMP: Record<EventImportance, number> = {
  minor: 0,
  notable: 1,
  major: 2,
  headline: 3,
};

/** Verbatim copy of the pre-v11 EventFeed extraction logic. */
function legacyExtract(
  log: EngineEvent[],
  maxEvents: number,
  filterTypes?: string[],
  minImportance?: EventImportance
): EngineEvent[] {
  const filterSet = filterTypes ? new Set(filterTypes) : null;
  let filtered = filterSet ? log.filter((e) => filterSet.has(e.type)) : log;
  if (minImportance) {
    const minVal = IMP[minImportance];
    filtered = filtered.filter((e) => IMP[e.importance || "minor"] >= minVal);
  }
  filtered = [...filtered].sort((a, b) => {
    if (a.year !== b.year) return b.year - a.year;
    if (a.week !== b.week) return b.week - a.week;
    return 0;
  });
  return filtered.slice(0, maxEvents);
}

function makeLog(n: number): EngineEvent[] {
  const types = ["BASHO_STATUS", "GOVERNANCE_RULING", "TRAINING_UPDATE", "NPC_MANAGER_DECISION"];
  const imps: EventImportance[] = ["minor", "minor", "minor", "notable", "major", "headline"];
  const log: EngineEvent[] = [];
  for (let i = 0; i < n; i++) {
    log.push({
      id: `EV-${i}`,
      type: types[i % types.length],
      year: 2026 + Math.floor(i / 4000),
      week: (i % 52) + 1,
      day: i % 15,
      phase: "weekly",
      category: "basho",
      importance: imps[i % imps.length],
      scope: "world",
      title: `e${i}`,
      summary: "s",
    } as EngineEvent);
  }
  return log;
}

function bench(fn: () => unknown, runs: number): { mean: number; p99: number } {
  const times: number[] = [];
  for (let i = 0; i < runs; i++) {
    const t0 = performance.now();
    fn();
    times.push(performance.now() - t0);
  }
  times.sort((a, b) => a - b);
  return {
    mean: times.reduce((a, b) => a + b, 0) / runs,
    p99: times[Math.min(runs - 1, Math.floor(runs * 0.99))],
  };
}

describe("event log extraction perf", () => {
  const LOG_50K = makeLog(50_000);
  const LOG_10K = makeLog(10_000);

  it("matches legacy output exactly on distinct timestamps (parity)", () => {
    // Strictly-monotonic log: every event has a unique (year,week,day) so the
    // ordering is fully determined and the two implementations must agree
    // element-for-element. Same-timestamp tie semantics differ BY DESIGN
    // (pinned in events.scanRecentEvents.test.ts).
    const distinct: EngineEvent[] = [];
    for (let i = 0; i < 2000; i++) {
      distinct.push({
        id: `EV-D${i}`,
        type: ["BASHO_STATUS", "GOVERNANCE_RULING", "TRAINING_UPDATE"][i % 3],
        year: 2026,
        week: i + 1,
        day: 0,
        phase: "weekly",
        category: "basho",
        importance: ["minor", "major", "headline"][i % 3] as EventImportance,
        scope: "world",
        title: `d${i}`,
        summary: "s",
      } as EngineEvent);
    }
    for (const limit of [10, 100] as const) {
      const legacy = legacyExtract(distinct, limit, ["BASHO_STATUS", "GOVERNANCE_RULING"], "major");
      const fast = scanRecentEvents(distinct, {
        types: ["BASHO_STATUS", "GOVERNANCE_RULING"],
        minImportance: "major",
        limit,
      });
      expect(fast.map((e) => e.id)).toEqual(legacy.map((e) => e.id));
    }
  });

  it("is substantially faster than legacy on a 50k-event log", () => {
    const legacy = bench(
      () => legacyExtract(LOG_50K, 10, ["BASHO_STATUS", "GOVERNANCE_RULING"], "major"),
      20
    );
    const fast = bench(
      () =>
        scanRecentEvents(LOG_50K, {
          types: ["BASHO_STATUS", "GOVERNANCE_RULING"],
          minImportance: "major",
          limit: 10,
        }),
      20
    );
    console.log(
      `[perf] extract 50k: legacy mean=${legacy.mean.toFixed(2)}ms p99=${legacy.p99.toFixed(2)}ms | ` +
        `scanRecentEvents mean=${fast.mean.toFixed(3)}ms p99=${fast.p99.toFixed(3)}ms ` +
        `(${((legacy.mean / fast.mean) || 0).toFixed(0)}x faster)`
    );
    // Generous bound: backward scan should be at least 2x faster (measured >>50x).
    expect(fast.mean).toBeLessThan(legacy.mean / 2);
  });

  it("is substantially faster than legacy unfiltered take-last-100 on 50k", () => {
    const legacy = bench(() => legacyExtract(LOG_50K, 100), 20);
    const fast = bench(() => scanRecentEvents(LOG_50K, { limit: 100 }), 20);
    console.log(
      `[perf] take-100 50k: legacy mean=${legacy.mean.toFixed(2)}ms | scan mean=${fast.mean.toFixed(3)}ms`
    );
    expect(fast.mean).toBeLessThan(legacy.mean / 2);
  });
});
