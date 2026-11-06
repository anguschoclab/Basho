import { describe, it, expect, vi, afterEach } from "vitest";
import { render, cleanup } from "@testing-library/react";
import React from "react";
import { MockFactory } from "@tests/helpers/utils/MockFactory";
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

vi.mock("@/state/game/useGame", () => ({
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

  it("renders the always-public Injury & Availability section", () => {
    const r1 = MockFactory.createRikishi("r1", { heyaId: "h1" });
    const r2 = MockFactory.createRikishi("r2", { heyaId: "h2" });
    mockState.world = {
      rikishi: new Map([
        ["r1", r1],
        ["r2", r2],
      ]),
    };
    const a = makeUIRikishi("r1", { heyaName: "Stable One" } as Partial<UIRikishi>);
    const b = makeUIRikishi("r2", { heyaName: "Stable Two" } as Partial<UIRikishi>);
    const { container } = render(<CompareModePanel rikishiA={a} rikishiB={b} />);

    expect(container.textContent).toContain("Injury & Availability");
    expect(container.textContent).toContain("Stable One");
    expect(container.textContent).toContain("Healthy");
  });

  it("shows honest 'No public record' for a prospect outside the world roster", () => {
    const r1 = MockFactory.createRikishi("r1", { heyaId: "h1" });
    mockState.world = { rikishi: new Map([["r1", r1]]) };
    const a = makeUIRikishi("r1");
    const b = makeUIRikishi("prospect-99"); // not in world.rikishi
    const { container } = render(<CompareModePanel rikishiA={a} rikishiB={b} />);

    expect(container.textContent).toContain("Injury & Availability");
    expect(container.textContent).toContain("No public record");
  });

  it("surfaces injured status publicly in header badge and section", () => {
    const r1 = MockFactory.createRikishi("r1", {
      heyaId: "h1",
      injured: true,
      injuryWeeksRemaining: 4,
      injuryStatus: {
        type: "sprain",
        location: "knee",
        severity: "moderate",
        weeksRemaining: 4,
      } as any,
    });
    const r2 = MockFactory.createRikishi("r2", { heyaId: "h2" });
    mockState.world = {
      rikishi: new Map([
        ["r1", r1],
        ["r2", r2],
      ]),
    };
    const a = makeUIRikishi("r1");
    const b = makeUIRikishi("r2");
    const { container } = render(<CompareModePanel rikishiA={a} rikishiB={b} />);

    expect(container.textContent).toContain("Injured");
    expect(container.textContent).toContain("4w");
  });

  it("reads stats from the nested rikishi.stats path, not flat properties", () => {
    const rikishiA = MockFactory.createRikishi("r1", {
      heyaId: "player_heya",
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
      heyaId: "player_heya",
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
      playerHeyaId: "player_heya",
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

  it("hides raw stats for rikishi not owned by the player heya (fog-of-war guard)", () => {
    const own = MockFactory.createRikishi("r1", { heyaId: "player_heya" });
    const rival = MockFactory.createRikishi("r2", { heyaId: "rival_heya" });

    mockState.world = {
      playerHeyaId: "player_heya",
      rikishi: new Map([
        ["r1", own],
        ["r2", rival],
      ]),
    };

    const { container } = render(
      <CompareModePanel rikishiA={makeUIRikishi("r1")} rikishiB={makeUIRikishi("r2")} />
    );

    expect(container.textContent).toContain("Stats unavailable");
    expect(container.textContent).not.toContain("Strength");
  });
});
