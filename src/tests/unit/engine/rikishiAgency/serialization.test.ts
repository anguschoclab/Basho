/**
 * WS4 — Rikishi agency: persistence.
 *
 * `world.pendingRikishiRequests` and `rikishi.agency` must survive a
 * serialize/deserialize round-trip — a mid-save request cannot silently
 * vanish or respawn.
 */

import { describe, it, expect } from "vitest";
import { SerializationService } from "@/engine/persistence/SerializationService";
import { MockFactory } from "@/tests/helpers/utils/MockFactory";
import type { Rikishi } from "@/engine/types/rikishi";

describe("agency state persistence", () => {
  it("pendingRikishiRequests round-trips through save/load", () => {
    const world = MockFactory.createWorld();
    world.pendingRikishiRequests = [
      {
        id: "req-x",
        rikishiId: "r-p",
        heyaId: "h1",
        type: "seek_transfer",
        createdWeek: 12,
        reason: "discontent",
      },
    ];
    const s = SerializationService.serializeWorld(world);
    const back = SerializationService.deserializeWorld(s);
    expect(back.pendingRikishiRequests).toEqual(world.pendingRikishiRequests);
  });

  it("rikishi.agency round-trips through save/load", () => {
    const world = MockFactory.createWorld();
    const r = MockFactory.createRikishi({
      id: "r1",
      heyaId: "h1",
      agency: {
        satisfaction: 40,
        restlessness: 66,
        loyaltyBand: "restless",
        deniedCount: 2,
        grantedCount: 1,
        lastRequestWeek: 9,
      },
    } as Partial<Rikishi>);
    world.rikishi.set("r1", r);
    const s = SerializationService.serializeWorld(world);
    const back = SerializationService.deserializeWorld(s);
    expect(back.rikishi.get("r1")!.agency).toEqual(r.agency);
  });
});
