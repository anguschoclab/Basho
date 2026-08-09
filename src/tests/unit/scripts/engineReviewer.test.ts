import { describe, it, expect } from "vitest";
import { reviewSource } from "../../../../scripts/engine-reviewer";

describe("engine-reviewer heuristics", () => {
  it("does not flag safe reads, comparisons, or nullish coalescing on world.*", () => {
    const code = `
const week = world.week ?? 0;
if (e.week >= (world.week ?? 0) - 1 && world.dayIndexGlobal === 5) {
  return world.rikishi.get(id);
}
const clone = structuredClone(world);
const next = builder.updateWorldField(world, "foo", 1);
`;
    const violations = reviewSource(code, "safe.ts");
    expect(violations).toEqual([]);
  });

  it("flags direct assignment to world.*", () => {
    const code = `world.foo = 1;`;
    const violations = reviewSource(code, "mutate.ts");
    expect(violations).toHaveLength(1);
    expect(violations[0].type).toBe("Potential Mutable State Leak");
  });

  it("flags mutating method calls on world.* collections", () => {
    const code = `
world.rikishi.set("id", r);
world.history.push(entry);
world.heyas.delete(id);
`;
    const violations = reviewSource(code, "mutate.ts");
    const types = violations.map((v) => v.type);
    expect(types).toEqual(
      expect.arrayContaining([
        "Potential Mutable State Leak",
        "Potential Mutable State Leak",
        "Potential Mutable State Leak",
      ])
    );
    expect(violations.length).toBeGreaterThanOrEqual(3);
  });

  it("flags Math.random() outside comments", () => {
    const code = `const r = Math.random();`;
    const violations = reviewSource(code, "rng.ts");
    expect(violations).toHaveLength(1);
    expect(violations[0].type).toBe("RNG Convention Breach");
  });

  it("ignores Math.random() inside strings and comments", () => {
    const code = `
// Math.random() is bad
const msg = "Math.random()";
`;
    const violations = reviewSource(code, "rng-safe.ts");
    expect(violations).toEqual([]);
  });
});
