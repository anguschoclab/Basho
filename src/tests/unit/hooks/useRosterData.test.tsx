import { describe, it, expect, vi, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useRosterData } from "@/hooks/useRosterData";
import * as GameContext from "@/contexts/useGame";
import type { WorldState } from "@/engine/types/world";
import type { Rikishi } from "@/engine/types/rikishi";

vi.mock("@/contexts/useGame");
vi.mock("@tanstack/react-router", () => ({
  useNavigate: () => vi.fn(),
}));

function makeRikishi(id: string, overrides: Partial<Rikishi> = {}): Rikishi {
  return {
    id,
    shikona: `Wrestler-${id}`,
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
    ...overrides,
  } as Rikishi;
}

function makeWorld(rikishiList: Rikishi[] = []): WorldState {
  const rikishi = new Map<string, Rikishi>();
  for (const r of rikishiList) rikishi.set(r.id, r);
  return {
    rikishi,
    activeRikishiIds: new Set(rikishiList.map((r) => r.id)),
    heyas: new Map([
      ["h1", { id: "h1", name: "TestHeya", rikishiIds: rikishiList.map((r) => r.id) } as any],
    ]),
    playerHeyaId: "h1",
  } as unknown as WorldState;
}

function mockUseGame(world: WorldState | null, updateWorld = vi.fn()) {
  vi.mocked(GameContext.useGame).mockReturnValue({
    state: { world },
    updateWorld,
  } as any);
  return { updateWorld };
}

describe("useRosterData", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("returns empty roster when world is null", () => {
    mockUseGame(null);
    const { result } = renderHook(() => useRosterData());
    expect(result.current.roster).toEqual([]);
    expect(result.current.injuredCount).toBe(0);
  });

  it("populates roster from heya.rikishiIds sorted by momentum", () => {
    const r1 = makeRikishi("r1");
    const r2 = makeRikishi("r2");
    mockUseGame(makeWorld([r1, r2]));
    const { result } = renderHook(() => useRosterData());
    expect(result.current.roster.length).toBeGreaterThan(0);
  });

  it("selectedIds starts empty", () => {
    mockUseGame(makeWorld());
    const { result } = renderHook(() => useRosterData());
    expect(result.current.selectedIds).toEqual([]);
  });

  it("toggleSelection adds ids", () => {
    mockUseGame(makeWorld());
    const { result } = renderHook(() => useRosterData());
    act(() => result.current.toggleSelection("r1"));
    expect(result.current.selectedIds).toEqual(["r1"]);
    act(() => result.current.toggleSelection("r2"));
    expect(result.current.selectedIds).toEqual(["r1", "r2"]);
  });

  it("toggleSelection removes on second click", () => {
    mockUseGame(makeWorld());
    const { result } = renderHook(() => useRosterData());
    act(() => result.current.toggleSelection("r1"));
    act(() => result.current.toggleSelection("r1"));
    expect(result.current.selectedIds).toEqual([]);
  });

  it("toggleSelection limits to 2 (drops oldest)", () => {
    mockUseGame(makeWorld());
    const { result } = renderHook(() => useRosterData());
    act(() => result.current.toggleSelection("r1"));
    act(() => result.current.toggleSelection("r2"));
    act(() => result.current.toggleSelection("r3"));
    expect(result.current.selectedIds).toEqual(["r2", "r3"]);
  });

  it("comparisonPair is null when <2 selected", () => {
    mockUseGame(makeWorld([makeRikishi("r1")]));
    const { result } = renderHook(() => useRosterData());
    act(() => result.current.toggleSelection("r1"));
    expect(result.current.comparisonPair).toBeNull();
  });

  it("showCompare starts false", () => {
    mockUseGame(makeWorld());
    const { result } = renderHook(() => useRosterData());
    expect(result.current.showCompare).toBe(false);
  });

  it("headerAction has label 'All Rikishi'", () => {
    mockUseGame(makeWorld());
    const { result } = renderHook(() => useRosterData());
    expect(result.current.headerAction.label).toBe("All Rikishi");
  });
});
