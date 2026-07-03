import { describe, it, expect } from "vitest";
import { resolveBout } from "@/engine/bout/boutResolver";
import { mockRikishi, makeMockBasho } from "../utils";
import type { BoutContext } from "@/engine/bout/boutUtils";

function makeBoutContext(overrides: Partial<BoutContext> = {}): BoutContext {
  return {
    id: "bout-test-001",
    day: 1,
    rikishiEastId: "r-east",
    rikishiWestId: "r-west",
    ...overrides,
  };
}

describe("detectKinboshi ordering and awardFact assignment", () => {
  it("sets result.awardFact = 'kinboshi' and generates award line in pbpLines", () => {
    const east = mockRikishi("r-east", { rank: "maegashira", injured: false });
    const west = mockRikishi("r-west", { rank: "yokozuna", injured: false });
    const basho = makeMockBasho();
    const ctx = makeBoutContext();

    const { result } = resolveBout(ctx, east, west, basho);

    expect(result.awardFact).toBe("kinboshi");

    const awardLine = result.pbpLines?.find((l) => l.id.endsWith("-kinboshi"));
    expect(awardLine).toBeDefined();
    expect(awardLine!.text.length).toBeGreaterThan(0);
  });

  it("sets result.awardFact = 'ginboshi' and generates award line in pbpLines", () => {
    const east = mockRikishi("r-east", { rank: "maegashira", injured: false });
    const west = mockRikishi("r-west", { rank: "ozeki", injured: false });
    const basho = makeMockBasho();
    const ctx = makeBoutContext();

    const { result } = resolveBout(ctx, east, west, basho);

    expect(result.awardFact).toBe("ginboshi");

    const awardLine = result.pbpLines?.find((l) => l.id.endsWith("-ginboshi"));
    expect(awardLine).toBeDefined();
    expect(awardLine!.text.length).toBeGreaterThan(0);
  });

  it("does not set awardFact for non-kinboshi/ginboshi bouts", () => {
    const east = mockRikishi("r-east", { rank: "maegashira", injured: false });
    const west = mockRikishi("r-west", { rank: "maegashira", injured: false });
    const basho = makeMockBasho();
    const ctx = makeBoutContext();

    const { result } = resolveBout(ctx, east, west, basho);

    expect(result.awardFact).toBeUndefined();
  });

  it("does not set awardFact for fusensho wins", () => {
    const east = mockRikishi("r-east", { rank: "maegashira", injured: false });
    const west = mockRikishi("r-west", { rank: "yokozuna", injured: true });
    const basho = makeMockBasho();
    const ctx = makeBoutContext();

    const { result } = resolveBout(ctx, east, west, basho);

    expect(result.kimarite).toBe("fusensho");
    expect(result.awardFact).not.toBe("kinboshi");
  });
});
