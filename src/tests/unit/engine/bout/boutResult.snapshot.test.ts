import { describe, it, expect } from "vitest";
import { resolveBoutPhysics } from "../boutPhysics";
import { mockRikishi, makeMockBasho } from "../../__tests__/utils";

describe("BoutResult snapshot", () => {
  it("BoutResult shape snapshot", () => {
    const bout = { id: "test-001", day: 1, rikishiEastId: "r1", rikishiWestId: "r2" };
    const east = mockRikishi("r1");
    const west = mockRikishi("r2");
    const basho = makeMockBasho();
    const { result } = resolveBoutPhysics(bout, east, west, basho);
    expect(result).toMatchSnapshot();
  });
});
