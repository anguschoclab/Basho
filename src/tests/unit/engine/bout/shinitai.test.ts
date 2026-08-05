import { describe, it, expect } from "vitest";
import { tryShinitai, SHINITAI_INSTABILITY_DIFF_THRESHOLD } from "@/engine/bout/shinitai";
import { mockRikishi } from "../utils";

describe("Shini-tai (dead body determination)", () => {
  it("returns null when instability difference is large (non-simultaneous)", () => {
    const east = mockRikishi("r-east", { balance: 70 });
    const west = mockRikishi("r-west", { balance: 50 });

    const result = tryShinitai(0.1, 0.5, east, west);
    expect(result).toBeNull();
  });

  it("returns winner with higher balance stat on simultaneous exit", () => {
    const east = mockRikishi("r-east", { balance: 80 });
    const west = mockRikishi("r-west", { balance: 40 });

    const result = tryShinitai(0.3, 0.32, east, west);
    expect(result).not.toBeNull();
    expect(result!.shinitai).toBe(true);
    expect(result!.winner).toBe("east");
  });

  it("returns west winner when west has higher balance", () => {
    const east = mockRikishi("r-east", { balance: 30 });
    const west = mockRikishi("r-west", { balance: 75 });

    const result = tryShinitai(0.31, 0.3, east, west);
    expect(result).not.toBeNull();
    expect(result!.winner).toBe("west");
  });

  it("falls back to instability when balance stats are equal", () => {
    const east = mockRikishi("r-east", { balance: 60 });
    const west = mockRikishi("r-west", { balance: 60 });

    const result = tryShinitai(0.2, 0.22, east, west);
    expect(result).not.toBeNull();
    expect(result!.winner).toBe("east"); // east has lower instability
  });

  it("triggers at exactly the threshold boundary", () => {
    const east = mockRikishi("r-east", { balance: 70 });
    const west = mockRikishi("r-west", { balance: 50 });

    const result = tryShinitai(0.3, 0.3 + SHINITAI_INSTABILITY_DIFF_THRESHOLD, east, west);
    expect(result).not.toBeNull();
  });

  it("is deterministic given the same inputs", () => {
    const east = mockRikishi("r-east", { balance: 65 });
    const west = mockRikishi("r-west", { balance: 55 });

    const r1 = tryShinitai(0.3, 0.31, east, west);
    const r2 = tryShinitai(0.3, 0.31, east, west);

    expect(r1).toEqual(r2);
  });
});
