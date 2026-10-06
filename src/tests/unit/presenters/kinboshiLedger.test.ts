import { describe, it, expect } from "vitest";
import {
  selectKinboshiLedger,
  selectLatestKinboshiDates,
} from "@/presenters/projections/kinboshiLedger";
import { makeMockWorld } from "../engine/utils";

describe("kinboshiLedger projections", () => {
  it("extracts kinboshi entries from awardLog with month resolution", () => {
    const world = makeMockWorld({
      awardLog: [
        { bashoName: "hatsu", year: 2026, type: "yusho", winnerId: "y1" },
        {
          bashoName: "nagoya",
          year: 2026,
          type: "kinboshi",
          winnerId: "m1",
          opponentId: "y1",
          boutId: "b1",
          day: 2,
        },
      ],
    });
    const ledger = selectKinboshiLedger(world);
    expect(ledger).toHaveLength(1);
    expect(ledger[0]).toMatchObject({
      winnerId: "m1",
      opponentId: "y1",
      year: 2026,
      month: 7,
      day: 2,
    });
  });

  it("returns the latest date per winner", () => {
    const world = makeMockWorld({
      awardLog: [
        { bashoName: "hatsu", year: 2025, type: "kinboshi", winnerId: "m1", opponentId: "y1" },
        { bashoName: "aki", year: 2026, type: "kinboshi", winnerId: "m1", opponentId: "y2" },
      ],
    });
    const dates = selectLatestKinboshiDates(world);
    expect(dates.get("m1")).toEqual({ year: 2026, month: 9 });
  });

  it("returns empty when no kinboshi have been logged", () => {
    const world = makeMockWorld({ awardLog: [] });
    expect(selectKinboshiLedger(world)).toHaveLength(0);
    expect(selectLatestKinboshiDates(world).size).toBe(0);
  });
});
