import { describe, it, expect } from "vitest";
import { sortStandings } from "@/engine/utils/sort";

describe("sortStandings", () => {
  it("sorts by wins desc, then losses asc", () => {
    const input = [
      { id: "a", wins: 5, losses: 2 },
      { id: "b", wins: 7, losses: 0 },
      { id: "c", wins: 5, losses: 1 },
    ];
    const result = sortStandings(input);
    expect(result.map((r) => r.id)).toEqual(["b", "c", "a"]);
  });

  it("empty array returns empty array", () => {
    expect(sortStandings([])).toEqual([]);
  });

  it("single entry returns same entry", () => {
    const input = [{ id: "a", wins: 3, losses: 1 }];
    expect(sortStandings(input)).toEqual(input);
  });

  it("with tieBreak uses it as third comparator", () => {
    const input = [
      { id: "z", wins: 5, losses: 1 },
      { id: "a", wins: 5, losses: 1 },
    ];
    const result = sortStandings(input, (a, b) => a.id.localeCompare(b.id));
    expect(result.map((r) => r.id)).toEqual(["a", "z"]);
  });

  it("does not mutate input array", () => {
    const input = [
      { id: "a", wins: 5, losses: 2 },
      { id: "b", wins: 7, losses: 0 },
    ];
    const original = [...input];
    sortStandings(input);
    expect(input.map((r) => r.id)).toEqual(original.map((r) => r.id));
  });

  it("all-zero wins returns original order (stable)", () => {
    const input = [
      { id: "x", wins: 0, losses: 0 },
      { id: "y", wins: 0, losses: 0 },
    ];
    const result = sortStandings(input);
    expect(result.map((r) => r.id)).toEqual(["x", "y"]);
  });
});
