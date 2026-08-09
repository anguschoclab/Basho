import { describe, it, expect, beforeEach, vi } from "vitest";

vi.mock("@/engine/systems/welfare/WelfareCalculations", () => ({
  calculateWeeklyWelfareDelta: vi.fn(() => ({ delta: 0, reasons: [] })),
  computeInjuryPressure: vi.fn(() => ({ pressure: 0, seriousCount: 0, negligenceCount: 0 })),
}));

vi.mock("@/engine/systems/media/MediaService", () => ({
  generateGovernanceHeadline: vi.fn(() => ({ metadata: { source: "test" } })),
  snapshotMediaHeatForBasho: vi.fn(() => ({ heyaPressure: {}, mediaHeat: {} })),
}));

import { phase01_week_welfare } from "@/engine/tick/phases/phase01_week_welfare";
import type { WorldState } from "@/engine/types/world";
import type { Heya } from "@/engine/types/heya";
import { makeMockHeya } from "../../utils";
import {
  calculateWeeklyWelfareDelta,
  computeInjuryPressure,
} from "@/engine/systems/welfare/WelfareCalculations";
import { MAX_MEDIA_PRESSURE, MEDIA_PRESSURE_WATCH } from "@/constants/engine/welfare";

describe("Phase 01: Week Welfare", () => {
  function createWorld(heyas: Heya[], mediaState?: any): WorldState {
    const heyaMap = new Map<string, Heya>();
    for (const h of heyas) heyaMap.set(h.id, h);
    return {
      heyas: heyaMap,
      calendar: { currentWeek: 1 },
      mediaState: mediaState ?? {
        heyaPressure: {},
        mediaHeat: {},
        globalBuzz: 0,
        headlines: [],
      },
    } as unknown as WorldState;
  }

  function createWelfareHeya(
    id: string,
    welfareRisk: number,
    complianceState: any = "compliant"
  ): Heya {
    return makeMockHeya(id, {
      welfareState: {
        welfareRisk,
        activeDiet: "maintenance" as any,
        complianceState,
        weeksInState: 0,
      } as any,
    });
  }

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(calculateWeeklyWelfareDelta).mockReturnValue({ delta: 0, reasons: [] });
    vi.mocked(computeInjuryPressure).mockReturnValue({
      pressure: 0,
      seriousCount: 0,
      negligenceCount: 0,
    });
  });

  it("handles empty heyas map gracefully", () => {
    const world = createWorld([]);
    const impact = phase01_week_welfare(world);
    expect(impact).toBeDefined();
    expect(impact.metadata?.source).toBe("phase01_week_welfare");
  });

  it("does not update mediaState when no pressure changes", () => {
    const heya = createWelfareHeya("h1", 10, "compliant");
    const world = createWorld([heya]);
    // delta=0, risk stays at 10, below watch threshold (45) → no pressure
    vi.mocked(calculateWeeklyWelfareDelta).mockReturnValue({ delta: 0, reasons: [] });

    const impact = phase01_week_welfare(world);
    expect(impact.worldFields?.mediaState).toBeUndefined();
  });

  it("applies media pressure changes to heyaPressure", () => {
    const heya = createWelfareHeya("h1", 10, "compliant");
    const world = createWorld([heya]);
    // delta=40 → risk becomes 50, above WATCH_THRESHOLD_WITHOUT_NEGLECT (45)
    vi.mocked(calculateWeeklyWelfareDelta).mockReturnValue({ delta: 40, reasons: ["test"] });
    vi.mocked(computeInjuryPressure).mockReturnValue({
      pressure: 0,
      seriousCount: 0,
      negligenceCount: 0,
    });

    const impact = phase01_week_welfare(world);
    const mediaState = impact.worldFields?.mediaState as any;
    expect(mediaState).toBeDefined();
    expect(mediaState.heyaPressure["h1"]).toBe(MEDIA_PRESSURE_WATCH);
  });

  it("caps heyaPressure at MAX_MEDIA_PRESSURE", () => {
    const heya = createWelfareHeya("h1", 10, "compliant");
    const world = createWorld([heya], {
      heyaPressure: { h1: MAX_MEDIA_PRESSURE - 5 },
      mediaHeat: {},
      globalBuzz: 0,
      headlines: [],
    });
    // delta=40 → risk becomes 50, triggers watch → +15 pressure
    vi.mocked(calculateWeeklyWelfareDelta).mockReturnValue({ delta: 40, reasons: ["test"] });

    const impact = phase01_week_welfare(world);
    const mediaState = impact.worldFields?.mediaState as any;
    expect(mediaState).toBeDefined();
    // (MAX_MEDIA_PRESSURE - 5) + 15 would exceed MAX_MEDIA_PRESSURE, should be capped
    expect(mediaState.heyaPressure["h1"]).toBe(MAX_MEDIA_PRESSURE);
  });

  it("accumulates pressure from multiple heyas", () => {
    const heya1 = createWelfareHeya("h1", 10, "compliant");
    const heya2 = createWelfareHeya("h2", 10, "compliant");
    const heya3 = createWelfareHeya("h3", 10, "compliant");
    const world = createWorld([heya1, heya2, heya3]);
    // All trigger watch transition
    vi.mocked(calculateWeeklyWelfareDelta).mockReturnValue({ delta: 40, reasons: ["test"] });

    const impact = phase01_week_welfare(world);
    const mediaState = impact.worldFields?.mediaState as any;
    expect(mediaState).toBeDefined();
    expect(mediaState.heyaPressure["h1"]).toBe(MEDIA_PRESSURE_WATCH);
    expect(mediaState.heyaPressure["h2"]).toBe(MEDIA_PRESSURE_WATCH);
    expect(mediaState.heyaPressure["h3"]).toBe(MEDIA_PRESSURE_WATCH);
  });

  it("does not iterate inherited prototype properties on mediaPressureChanges", () => {
    const heya = createWelfareHeya("h1", 10, "compliant");
    const world = createWorld([heya]);
    vi.mocked(calculateWeeklyWelfareDelta).mockReturnValue({ delta: 40, reasons: ["test"] });

    const impact = phase01_week_welfare(world);
    const mediaState = impact.worldFields?.mediaState as any;
    expect(mediaState).toBeDefined();
    // Only h1 should be in heyaPressure, no inherited keys
    const keys = Object.keys(mediaState.heyaPressure);
    expect(keys).toEqual(["h1"]);
  });
});
