import { describe, it, expect, vi, afterEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { useKenshoData } from "@/hooks/useKenshoData";
import * as GameContext from "@/contexts/useGame";
import type { WorldState } from "@/engine/types/world";
import type { Rikishi } from "@/engine/types/rikishi";
import type { Heya } from "@/engine/types/heya";

vi.mock("@/contexts/useGame");

function makeRikishi(id: string, overrides: Partial<Rikishi> = {}): Rikishi {
  return {
    id,
    shikona: `Rikishi-${id}`,
    heyaId: "h1",
    rank: "maegashira",
    rankNumber: 1,
    division: "makuuchi",
    side: "east",
    style: "oshi",
    stats: {
      power: 50,
      speed: 50,
      technique: 50,
      balance: 50,
      weight: 140,
      stamina: 50,
      mental: 50,
      adaptability: 50,
      experience: 50,
      aggression: 50,
    },
    fatigue: 30,
    injured: false,
    isRetired: false,
    isKyujo: false,
    careerWins: 10,
    careerLosses: 5,
    currentBashoWins: 0,
    currentBashoLosses: 0,
    economics: { careerKenshoWon: 0 },
    ...overrides,
  } as any;
}

function makeHeya(overrides: Partial<Heya> = {}): Heya {
  return {
    id: "h1",
    name: "TestHeya",
    rikishiIds: ["r1", "r2"],
    ...overrides,
  } as any;
}

function makeWorld(rikishiList: Rikishi[], heya?: Heya): WorldState {
  const rikishi = new Map<string, Rikishi>();
  for (const r of rikishiList) rikishi.set(r.id, r);
  return {
    rikishi,
    activeRikishiIds: new Set(rikishiList.map((r) => r.id)),
    heyas: new Map([["h1", heya ?? makeHeya()]]),
    playerHeyaId: "h1",
  } as unknown as WorldState;
}

function mockUseGame(world: WorldState | null) {
  vi.mocked(GameContext.useGame).mockReturnValue({
    state: { world },
  } as any);
}

describe("useKenshoData", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("returns null heyaId and heya when world is null", () => {
    mockUseGame(null);
    const { result } = renderHook(() => useKenshoData());
    expect(result.current.heyaId).toBeUndefined();
    expect(result.current.heya).toBeUndefined();
  });

  it("populates playerRikishi from heya.rikishiIds", () => {
    const r1 = makeRikishi("r1");
    const r2 = makeRikishi("r2");
    mockUseGame(makeWorld([r1, r2]));
    const { result } = renderHook(() => useKenshoData());
    expect(result.current.playerRikishi).toHaveLength(2);
    expect(result.current.playerRikishi[0].id).toBe("r1");
  });

  it("computes totalKenshoEarnings as sum of careerKenshoWon * 70000", () => {
    const r1 = makeRikishi("r1", {
      economics: { careerKenshoWon: 3 } as any,
    });
    const r2 = makeRikishi("r2", {
      economics: { careerKenshoWon: 2 } as any,
    });
    mockUseGame(makeWorld([r1, r2]));
    const { result } = renderHook(() => useKenshoData());
    expect(result.current.totalKenshoEarnings).toBe(5 * 70000);
  });

  it("computes projectedKensho by rank tier", () => {
    const r1 = makeRikishi("r1", { rank: "yokozuna" });
    const r2 = makeRikishi("r2", { rank: "sekiwake" });
    const r3 = makeRikishi("r3", { rank: "maegashira" });
    const heya = makeHeya({ rikishiIds: ["r1", "r2", "r3"] } as any);
    mockUseGame(makeWorld([r1, r2, r3], heya));
    const { result } = renderHook(() => useKenshoData());
    // yokozuna=15, sekiwake=10, maegashira=5 → 30 * 70000
    expect(result.current.projectedKensho).toBe(30 * 70000);
  });

  it("returns empty recentBoutsWithKensho when no current basho matches", () => {
    const r1 = makeRikishi("r1");
    mockUseGame(makeWorld([r1]));
    const { result } = renderHook(() => useKenshoData());
    expect(result.current.recentBoutsWithKensho).toEqual([]);
  });
});
