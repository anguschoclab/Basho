import { describe, it, expect } from "vitest";
import { createEmptyHallOfFame } from "../hallOfFame";

describe("createEmptyHallOfFame", () => {
  it("should create an empty hall of fame state with correct defaults", () => {
    const hof = createEmptyHallOfFame();

    expect(hof).toBeDefined();
    expect(hof.version).toBe("1.0.0");
    expect(hof.inductees).toEqual([]);
    expect(hof.inducted).toEqual({});
    expect(hof.lastProcessedYear).toBe(0);
  });
});
