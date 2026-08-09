import { describe, it, expect, vi, afterEach } from "vitest";
import { render, cleanup } from "@testing-library/react";
import React from "react";
import { MockFactory } from "@/tests/helpers/utils/MockFactory";
import type { UIRikishi } from "@/presenters/uiModels";

function makeUIRikishi(id: string, overrides: Partial<UIRikishi> = {}): UIRikishi {
  return {
    id,
    shikona: `Rikishi ${id}`,
    rank: "maegashira",
    rankLabel: "Maegashira",
    rankNumber: 1,
    division: "makuuchi",
    side: "east",
    age: 25,
    careerWins: 10,
    careerLosses: 5,
    winPercentage: 0.667,
    streak: 3,
    streakLabel: "W3",
    motivation: 60,
    condition: 70,
    currentBashoWins: 8,
    currentBashoLosses: 7,
    ...overrides,
  } as unknown as UIRikishi;
}

const mockState: { world: any } = { world: null };

vi.mock("@/contexts/useGame", () => ({
  useGame: () => ({ state: mockState }),
}));

const { CompareModePanel } = await import("@/components/scouting/CompareModePanel");

describe("CompareModePanel — nested .stats.* access regression (Step 3.3)", () => {
  afterEach(() => {
    cleanup();
    mockState.world = null;
  });

  it("renders without crashing when world is null (stats unavailable fallback)", () => {
    const a = makeUIRikishi("r1");
    const b = makeUIRikishi("r2");
    const { container } = render(<CompareModePanel rikishiA={a} rikishiB={b} />);
    expect(container).toBeTruthy();
  });

  it("reads stats from the nested rikishi.stats path, not flat properties", () => {
    const rikishiA = MockFactory.createRikishi("r1", {
      stats: {
        power: 80,
        speed: 60,
        technique: 70,
        balance: 50,
        stamina: 65,
        mental: 55,
        adaptability: 50,
        aggression: 50,
        experience: 10,
        weight: 140,
      },
    });
    const rikishiB = MockFactory.createRikishi("r2", {
      stats: {
        power: 40,
        speed: 90,
        technique: 30,
        balance: 60,
        stamina: 45,
        mental: 75,
        adaptability: 50,
        aggression: 50,
        experience: 10,
        weight: 130,
      },
    });

    mockState.world = {
      rikishi: new Map([
        ["r1", rikishiA],
        ["r2", rikishiB],
      ]),
    };

    const a = makeUIRikishi("r1");
    const b = makeUIRikishi("r2");
    const { container } = render(<CompareModePanel rikishiA={a} rikishiB={b} />);

    // The component should render stat values from rawA.stats.power (80) and rawB.stats.power (40)
    // If it were reading flat .power, it would get undefined or wrong values.
    expect(container.textContent).toContain("80");
    expect(container.textContent).toContain("40");
    expect(container.textContent).toContain("60");
    expect(container.textContent).toContain("90");
  });
});
