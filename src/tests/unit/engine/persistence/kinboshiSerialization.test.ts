import { describe, it, expect } from "vitest";
import { SerializationService } from "@/engine/persistence/SerializationService";
import type { SerializedBashoState } from "@/engine/types/save";
import type { BashoState, AwardLogEntry } from "@/engine/types/basho";

const baseBasho = (): BashoState => ({
  id: "b-1",
  year: 2026,
  bashoNumber: 1,
  bashoName: "hatsu",
  day: 3,
  matches: [
    {
      boutId: "bout-kin-1",
      day: 3,
      eastRikishiId: "m1",
      westRikishiId: "y1",
      result: {
        boutId: "bout-kin-1",
        winner: "east",
        winnerRikishiId: "m1",
        loserRikishiId: "y1",
        kimarite: "yorikiri",
        isKinboshi: true,
        awardFact: "kinboshi",
        awards: [
          { type: "kinboshi", winnerId: "m1", loserId: "y1", day: 3, boutId: "bout-kin-1" },
        ],
        log: [],
        kenshoEnvelopes: 45,
        momentumScore: 0,
        inBoutInjury: null,
        isTimeout: false,
        upset: true,
        day: 3,
      } as never,
    },
  ],
  standings: new Map(),
  kinboshiThisBasho: { m1: 1 },
  isActive: true,
} as unknown as BashoState);

describe("SerializationService — kinboshi persistence", () => {
  it("round-trips kinboshiThisBasho on currentBasho", () => {
    const serialized = SerializationService.serializeBashoState(baseBasho());
    expect(serialized.kinboshiThisBasho).toEqual({ m1: 1 });
    const restored = SerializationService.deserializeBashoState(serialized);
    expect(restored.kinboshiThisBasho).toEqual({ m1: 1 });
  });

  it("round-trips BoutResult.awards on completed matches", () => {
    const serialized = SerializationService.serializeBashoState(baseBasho());
    const restored = SerializationService.deserializeBashoState(serialized);
    const match = restored.matches.find((m) => m.boutId === "bout-kin-1");
    expect(match?.result?.isKinboshi).toBe(true);
    expect(match?.result?.awards?.[0]).toMatchObject({
      type: "kinboshi",
      winnerId: "m1",
      loserId: "y1",
    });
  });

  it("deserializes safely when kinboshiThisBasho is absent (older saves)", () => {
    const serialized = SerializationService.serializeBashoState(baseBasho());
    delete (serialized as SerializedBashoState).kinboshiThisBasho;
    const restored = SerializationService.deserializeBashoState(serialized);
    expect(restored.kinboshiThisBasho ?? {}).toEqual({});
  });

  it("kinboshi AwardLogEntry shape is serializable", () => {
    const entry: AwardLogEntry = {
      bashoName: "hatsu",
      year: 2026,
      type: "kinboshi",
      winnerId: "m1",
      opponentId: "y1",
      boutId: "bout-kin-1",
      day: 3,
    };
    expect(() => JSON.parse(JSON.stringify(entry))).not.toThrow();
    expect(JSON.parse(JSON.stringify(entry)).type).toBe("kinboshi");
  });
});
