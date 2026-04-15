import { describe, it, expect } from "vitest";
import { resolveBoutPhysics, type BoutContext } from "../boutPhysics";
import { mockRikishi, makeMockBasho } from "../../__tests__/utils";

describe("determinism", () => {
  it("resolveBoutPhysics is deterministic", () => {
    const bout: BoutContext = { id: "test-001", day: 1, rikishiEastId: "r1", rikishiWestId: "r2" };
    const east = mockRikishi("r1");
    const west = mockRikishi("r2");
    const basho = makeMockBasho();

    const results = Array.from({ length: 5 }, () => resolveBoutPhysics(bout, east, west, basho));
    for (let i = 1; i < results.length; i++) {
      expect(results[i].result.winner).toBe(results[0].result.winner);
      expect(results[i].result.kimarite).toBe(results[0].result.kimarite);
      expect(results[i].result.duration).toBe(results[0].result.duration);
    }
  });
});
