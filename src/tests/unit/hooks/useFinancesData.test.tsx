import { describe, it, expect, vi, afterEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { useFinancesData } from "@/hooks/useFinancesData";
import * as GameContext from "@/contexts/useGame";
import * as PlayerHeya from "@/hooks/usePlayerHeya";
import type { WorldState } from "@/engine/types/world";
import type { Heya } from "@/engine/types/heya";

vi.mock("@/contexts/useGame");
vi.mock("@/hooks/usePlayerHeya");
vi.mock("@tanstack/react-router", () => ({
  useNavigate: () => vi.fn(),
}));

function makeHeya(overrides: Partial<Heya> = {}): Heya {
  return {
    id: "h1",
    name: "TestHeya",
    funds: 1000000,
    rikishiIds: [],
    ...overrides,
  } as any;
}

function makeWorld(): WorldState {
  return {
    rikishi: new Map(),
    activeRikishiIds: new Set(),
    heyas: new Map(),
    playerHeyaId: "h1",
  } as unknown as WorldState;
}

function mockHooks(heya: Heya | null, world: WorldState | null) {
  vi.mocked(PlayerHeya.usePlayerHeya).mockReturnValue({ heya } as any);
  vi.mocked(GameContext.useGame).mockReturnValue({
    state: { world },
  } as any);
}

describe("useFinancesData", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("returns null heya and comfortable config when no heya", () => {
    mockHooks(null, makeWorld());
    const { result } = renderHook(() => useFinancesData());
    expect(result.current.heya).toBeNull();
    expect(result.current.config.label).toBe("Comfortable");
  });

  it("config resolves from runwayBand", () => {
    const heya = makeHeya({ runwayBand: "critical" } as any);
    mockHooks(heya, makeWorld());
    const { result } = renderHook(() => useFinancesData());
    expect(result.current.config.label).toBe("Critical");
  });

  it("finances is null when no heya", () => {
    mockHooks(null, makeWorld());
    const { result } = renderHook(() => useFinancesData());
    expect(result.current.finances).toBeNull();
  });

  it("history produces 10 points (8 retro + Now + 2 projected)", () => {
    const heya = makeHeya({ funds: 500000 } as any);
    mockHooks(heya, makeWorld());
    const { result } = renderHook(() => useFinancesData());
    expect(result.current.history).toHaveLength(10);
    expect(result.current.history[7].name).toBe("Now");
    expect(result.current.history[8].projected).toBe(true);
    expect(result.current.history[9].projected).toBe(true);
    expect(result.current.history[0].projected).toBe(false);
  });

  it("headerAction has label and navigates to /office/finances", () => {
    const heya = makeHeya();
    mockHooks(heya, makeWorld());
    const { result } = renderHook(() => useFinancesData());
    expect(result.current.headerAction.label).toBe("Deep Dive");
    expect(result.current.headerAction.tooltip).toBeDefined();
  });
});
