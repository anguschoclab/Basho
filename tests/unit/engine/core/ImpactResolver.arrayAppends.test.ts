import { describe, it, expect } from "vitest";
import { resolveImpacts } from "@/engine/core/ImpactResolver";
import { createImpactBuilder } from "@/engine/core/ImpactBuilder";
import { makeMockWorld } from "@tests/unit/engine/utils";
import type { MyosekiTransaction } from "@/engine/types/myoseki";

describe("Bug S: myosekiMarket.history uses append order (consistent with other arrays)", () => {
  it("appends new items to the end of history (not prepend)", () => {
    const existingTx: MyosekiTransaction = {
      id: "tx-old",
      date: "2025-W1",
      myosekiId: "m1",
    } as MyosekiTransaction;
    const newTx: MyosekiTransaction = {
      id: "tx-new",
      date: "2025-W2",
      myosekiId: "m1",
    } as MyosekiTransaction;
    const world = makeMockWorld({
      myosekiMarket: {
        stocks: {},
        history: [existingTx],
      } as any,
    });
    const builder = createImpactBuilder("test");
    builder.appendToWorldArray("myosekiMarket.history", [newTx]);
    const nextWorld = resolveImpacts(world, [builder.build()]);
    const history = nextWorld.myosekiMarket?.history;
    expect(history).toBeDefined();
    expect(history).toHaveLength(2);
    // New item should be at the END (append), not the beginning (prepend)
    expect(history![0].id).toBe("tx-old");
    expect(history![1].id).toBe("tx-new");
  });
});

describe("applyArrayAppends — id collision dedupe", () => {
  it("remints a colliding appended .id with a deterministic suffix", () => {
    const world = makeMockWorld({
      governanceLog: [
        {
          id: "GR-AAAA",
          date: "Y1",
          heyaId: "h1",
          type: "warning",
          severity: "low",
          reason: "r",
          effects: {},
        },
      ] as any,
    });
    const builder = createImpactBuilder("test");
    // Two rulings minted the same GR id (same heya/day/reason batch).
    builder.appendToWorldArray("governanceLog", [
      {
        id: "GR-AAAA",
        date: "Y2",
        heyaId: "h1",
        type: "warning",
        severity: "low",
        reason: "r",
        effects: {},
      },
      {
        id: "GR-AAAA",
        date: "Y3",
        heyaId: "h1",
        type: "warning",
        severity: "low",
        reason: "r",
        effects: {},
      },
    ] as any);
    const next = resolveImpacts(world, [builder.build()]);
    const ids = (next.governanceLog ?? []).map((g: any) => g.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids[0]).toBe("GR-AAAA");
    expect(ids[1]).not.toBe("GR-AAAA");
    expect(ids[2]).not.toBe("GR-AAAA");
    expect(ids[1]).not.toBe(ids[2]);
  });

  it("leaves unique appends untouched", () => {
    const world = makeMockWorld({ governanceLog: [] as any });
    const builder = createImpactBuilder("test");
    builder.appendToWorldArray("governanceLog", [{ id: "GR-1" }, { id: "GR-2" }] as any);
    const next = resolveImpacts(world, [builder.build()]);
    expect((next.governanceLog ?? []).map((g: any) => g.id)).toEqual(["GR-1", "GR-2"]);
  });

  it("still remints intra-batch duplicate .id values when existing is empty", () => {
    // Edge the appendDeduped fast-path must preserve: dedupe runs even with an
    // empty existing array — two appended items sharing an id must not both land.
    const world = makeMockWorld({ governanceLog: [] as any });
    const builder = createImpactBuilder("test");
    builder.appendToWorldArray("governanceLog", [
      { id: "GR-DUP" },
      { id: "GR-DUP" },
      { id: "GR-OTHER" },
    ] as any);
    const next = resolveImpacts(world, [builder.build()]);
    const ids = (next.governanceLog ?? []).map((g: any) => g.id);
    expect(new Set(ids).size).toBe(3);
    expect(ids[0]).toBe("GR-DUP");
    expect(ids[2]).toBe("GR-OTHER");
  });

  it("appends items without an .id verbatim, preserving order", () => {
    // MatchSchedule-shaped items (keyed by boutId, no .id) must not be touched —
    // the dedupe pass is unreachable for them by construction.
    const world = makeMockWorld({ governanceLog: [] as any });
    const builder = createImpactBuilder("test");
    builder.appendToWorldArray("governanceLog", [
      { boutId: "b1", day: 1 },
      { boutId: "b2", day: 1 },
      { boutId: "b3", day: 1 },
    ] as any);
    const next = resolveImpacts(world, [builder.build()]);
    const items = next.governanceLog ?? [];
    expect(items).toHaveLength(3);
    expect(items.map((m: any) => m.boutId)).toEqual(["b1", "b2", "b3"]);
  });
});
