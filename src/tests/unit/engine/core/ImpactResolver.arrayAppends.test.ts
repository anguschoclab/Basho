/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { describe, it, expect } from "vitest";
import { resolveImpacts } from "@/engine/core/ImpactResolver";
import { createImpactBuilder } from "@/engine/core/ImpactBuilder";
import { makeMockWorld } from "../utils";
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
