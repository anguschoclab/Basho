import { describe, it, expect } from "vitest";
import { compareBy } from "@/lib/sortUtils";

interface TestRow {
  name: string;
  age: number;
  score?: number;
}

const rows: TestRow[] = [
  { name: "Charlie", age: 30, score: 85 },
  { name: "Alice", age: 25, score: 92 },
  { name: "Bob", age: 35, score: undefined },
];

describe("compareBy", () => {
  it("sorts strings ascending", () => {
    const sorted = [...rows].sort((a, b) =>
      compareBy(a, b, (r) => r.name, "asc")
    );
    expect(sorted[0].name).toBe("Alice");
    expect(sorted[1].name).toBe("Bob");
    expect(sorted[2].name).toBe("Charlie");
  });

  it("sorts strings descending", () => {
    const sorted = [...rows].sort((a, b) =>
      compareBy(a, b, (r) => r.name, "desc")
    );
    expect(sorted[0].name).toBe("Charlie");
    expect(sorted[2].name).toBe("Alice");
  });

  it("sorts numbers ascending", () => {
    const sorted = [...rows].sort((a, b) =>
      compareBy(a, b, (r) => r.age, "asc")
    );
    expect(sorted[0].age).toBe(25);
    expect(sorted[1].age).toBe(30);
    expect(sorted[2].age).toBe(35);
  });

  it("sorts numbers descending", () => {
    const sorted = [...rows].sort((a, b) =>
      compareBy(a, b, (r) => r.age, "desc")
    );
    expect(sorted[0].age).toBe(35);
    expect(sorted[2].age).toBe(25);
  });

  it("treats undefined as last in ascending order", () => {
    const sorted = [...rows].sort((a, b) =>
      compareBy(a, b, (r) => r.score, "asc")
    );
    expect(sorted[0].score).toBe(85);
    expect(sorted[1].score).toBe(92);
    expect(sorted[2].score).toBeUndefined();
  });

  it("treats undefined as last in descending order", () => {
    const sorted = [...rows].sort((a, b) =>
      compareBy(a, b, (r) => r.score, "desc")
    );
    expect(sorted[0].score).toBe(92);
    expect(sorted[1].score).toBe(85);
    expect(sorted[2].score).toBeUndefined();
  });

  it("returns 0 for equal values", () => {
    const a: TestRow = { name: "Alice", age: 25, score: 90 };
    const b: TestRow = { name: "Bob", age: 25, score: 80 };
    expect(compareBy(a, b, (r) => r.age, "asc")).toBe(0);
  });

  it("preserves relative order of equal elements (stable)", () => {
    const data = [
      { name: "A", age: 10 },
      { name: "B", age: 10 },
      { name: "C", age: 10 },
    ];
    const sorted = [...data].sort((a, b) =>
      compareBy(a, b, (r) => r.age, "asc")
    );
    expect(sorted.map((r) => r.name)).toEqual(["A", "B", "C"]);
  });
});
