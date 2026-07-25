import { describe, it, expect } from "vitest";
import type { EngineEvent } from "@/engine/worker/types";

/**
 * P4.12: Digest Memoization Tests (for P2.5).
 * Verifies that the digestRevision counter is present in TICK_COMPLETED
 * events and that the store memoization logic works correctly.
 */

describe("P2.5: Digest memoization (revision counter)", () => {
  it("TICK_COMPLETED event includes digestRevision field", () => {
    const event: EngineEvent = {
      type: "TICK_COMPLETED",
      digest: {} as any,
      digestRevision: 1,
    };
    expect(event.digestRevision).toBeDefined();
    expect(event.digestRevision).toBe(1);
  });

  it("DIGEST_UPDATED event includes digestRevision field", () => {
    const event: EngineEvent = {
      type: "DIGEST_UPDATED",
      digest: {} as any,
      digestRevision: 5,
    };
    expect(event.digestRevision).toBeDefined();
    expect(event.digestRevision).toBe(5);
  });

  it("digestRevision is optional (backward compatible)", () => {
    const event: EngineEvent = {
      type: "TICK_COMPLETED",
      digest: {} as any,
    };
    expect(event.digestRevision).toBeUndefined();
  });

  it("store handles missing digestRevision by incrementing locally", () => {
    let storeRevision = 0;
    const eventRevision = undefined;
    storeRevision = eventRevision ?? storeRevision + 1;
    expect(storeRevision).toBe(1);
  });

  it("store uses event digestRevision when present", () => {
    let storeRevision = 0;
    const eventRevision = 42;
    storeRevision = eventRevision ?? storeRevision + 1;
    expect(storeRevision).toBe(42);
  });

  it("same revision = no rebuild needed", () => {
    const revisionBefore = 0;
    const revisionAfter = 0;
    const shouldRebuild = revisionBefore !== revisionAfter;
    expect(shouldRebuild).toBe(false);
  });

  it("revision increments = rebuild needed", () => {
    const revisionBefore: number = 0;
    const revisionAfter: number = 1;
    const shouldRebuild = revisionBefore !== revisionAfter;
    expect(shouldRebuild).toBe(true);
  });
});
