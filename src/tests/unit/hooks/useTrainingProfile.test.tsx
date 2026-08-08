import { describe, it, expect, vi, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useTrainingProfile } from "@/hooks/useTrainingProfile";
import * as GameContext from "@/contexts/useGame";
import type { WorldState } from "@/engine/types/world";
import type { TrainingProfile } from "@/engine/types/training";

vi.mock("@/contexts/useGame");
vi.mock("@tanstack/react-router", () => ({
  useNavigate: () => vi.fn(),
}));

function makeProfile(overrides: Partial<TrainingProfile> = {}): TrainingProfile {
  return {
    intensity: "balanced",
    focus: "neutral",
    recovery: "normal",
    ...overrides,
  } as TrainingProfile;
}

function makeWorld(profile?: TrainingProfile | null, sanctions?: any): WorldState {
  const world: any = {
    rikishi: new Map(),
    activeRikishiIds: new Set(),
    heyas: new Map([
      ["h1", {
        id: "h1",
        name: "TestHeya",
        rikishiIds: ["r1"],
        welfareState: sanctions ? { sanctions } : undefined,
      }],
    ]),
    playerHeyaId: "h1",
    trainingState: new Map([
      ["h1", { activeProfile: profile ?? makeProfile() }],
    ]),
  };
  return world as unknown as WorldState;
}

function mockUseGame(world: WorldState | null, updateWorld = vi.fn()) {
  vi.mocked(GameContext.useGame).mockReturnValue({
    state: { world },
    updateWorld,
  } as any);
  return { updateWorld };
}

describe("useTrainingProfile", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("returns null profile when world is null", () => {
    mockUseGame(null);
    const { result } = renderHook(() => useTrainingProfile());
    expect(result.current.profile).toBeNull();
  });

  it("returns null sanctionCap when no sanctions", () => {
    mockUseGame(makeWorld());
    const { result } = renderHook(() => useTrainingProfile());
    expect(result.current.sanctionCap).toBeNull();
  });

  it("intensityOptions disabled flags respect maxIntensityIdx", () => {
    const world = makeWorld(makeProfile(), { trainingIntensityCap: "medium" });
    mockUseGame(world);
    const { result } = renderHook(() => useTrainingProfile());
    const opts = result.current.intensityOptions;
    // medium → balanced (idx 1), so idx 2+ should be disabled
    expect(opts[0].disabled).toBe(false); // conservative
    expect(opts[1].disabled).toBe(false); // balanced
    expect(opts[2].disabled).toBe(true); // intensive
    expect(opts[3].disabled).toBe(true); // punishing
  });

  it("no sanctions → all intensities enabled", () => {
    mockUseGame(makeWorld());
    const { result } = renderHook(() => useTrainingProfile());
    const opts = result.current.intensityOptions;
    expect(opts.every((o: any) => !o.disabled)).toBe(true);
  });

  it("expanded starts false and toggleExpanded flips it", () => {
    mockUseGame(makeWorld());
    const { result } = renderHook(() => useTrainingProfile());
    expect(result.current.expanded).toBe(false);
    act(() => result.current.toggleExpanded());
    expect(result.current.expanded).toBe(true);
  });

  it("headerAction has label 'Full Plan'", () => {
    mockUseGame(makeWorld());
    const { result } = renderHook(() => useTrainingProfile());
    expect(result.current.headerAction.label).toBe("Full Plan");
  });

  it("focusOptions has 5 options with correct labels", () => {
    mockUseGame(makeWorld());
    const { result } = renderHook(() => useTrainingProfile());
    expect(result.current.focusOptions).toHaveLength(5);
    expect(result.current.focusOptions[0].label).toBe("Neutral");
  });

  it("recoveryOptions has 3 options with correct labels", () => {
    mockUseGame(makeWorld());
    const { result } = renderHook(() => useTrainingProfile());
    expect(result.current.recoveryOptions).toHaveLength(3);
    expect(result.current.recoveryOptions[0].label).toBe("Low");
  });
});
