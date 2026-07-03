import { describe, it, expect } from "vitest";
import { resolveBout } from "@/engine/bout/boutResolver";
import { mockRikishi, makeMockBasho } from "../utils";
import type { BoutContext } from "@/engine/bout/boutUtils";
import type { DramaContext } from "@/engine/matchmaking/DramaMatchmaker";

function makeBoutContext(overrides: Partial<BoutContext> = {}): BoutContext {
  return {
    id: "bout-test-001",
    day: 1,
    rikishiEastId: "r-east",
    rikishiWestId: "r-west",
    ...overrides,
  };
}

describe("boutResolver copies dramaticContext onto BoutResult", () => {
  it("copies dramaticContext from match schedule to result", () => {
    const east = mockRikishi("r-east", { injured: false });
    const west = mockRikishi("r-west", { injured: false });
    const dramaContext: DramaContext = {
      label: "make_or_break",
      score: 50,
    } as DramaContext;
    const basho = makeMockBasho({
      matches: [
        {
          boutId: "bout-test-001",
          day: 1,
          eastRikishiId: "r-east",
          westRikishiId: "r-west",
          dramaticContext: dramaContext,
        },
      ],
    });
    const ctx = makeBoutContext();

    const { result } = resolveBout(ctx, east, west, basho);

    expect(result.dramaticContext).toBeDefined();
    expect(result.dramaticContext?.label).toBe("make_or_break");
    expect(result.dramaticContext?.score).toBe(50);
  });

  it("generates drama line in pbpLines when dramaticContext is set", () => {
    const east = mockRikishi("r-east", { injured: false });
    const west = mockRikishi("r-west", { injured: false });
    const dramaContext: DramaContext = {
      label: "make_or_break",
      score: 50,
    } as DramaContext;
    const basho = makeMockBasho({
      matches: [
        {
          boutId: "bout-test-001",
          day: 1,
          eastRikishiId: "r-east",
          westRikishiId: "r-west",
          dramaticContext: dramaContext,
        },
      ],
    });
    const ctx = makeBoutContext();

    const { result } = resolveBout(ctx, east, west, basho);

    const dramaLine = result.pbpLines?.find((l) => l.tags?.includes("drama"));
    expect(dramaLine).toBeDefined();
    expect(dramaLine!.phase).toBe("opening");
  });

  it("does not generate drama line when no dramaticContext is set", () => {
    const east = mockRikishi("r-east", { injured: false });
    const west = mockRikishi("r-west", { injured: false });
    const basho = makeMockBasho({
      matches: [
        {
          boutId: "bout-test-001",
          day: 1,
          eastRikishiId: "r-east",
          westRikishiId: "r-west",
        },
      ],
    });
    const ctx = makeBoutContext();

    const { result } = resolveBout(ctx, east, west, basho);

    const dramaLine = result.pbpLines?.find((l) => l.tags?.includes("drama"));
    expect(dramaLine).toBeUndefined();
  });
});
