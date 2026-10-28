import { describe, it, expect, vi, afterEach } from "vitest";
import React from "react";
import { render, cleanup } from "@testing-library/react";
import { StableWidget } from "@/components/dashboard/StableWidget";
import { TooltipProvider } from "@/components/ui/tooltip";
import * as GameContext from "@/state/game/useGame";
import { makeMockWorld, makeMockHeya } from "@tests/unit/engine/utils";
import type { WorldState } from "@/engine/types/world";
import type { Oyakata } from "@/engine/types/oyakata";

vi.mock("@tanstack/react-router", () => ({
  useNavigate: () => vi.fn(),
  Link: ({ children, to, ...props }: any) =>
    React.createElement("a", { href: to, ...props }, children),
}));

vi.mock("@/state/game/useGame");

vi.mock("@/presenters/uiDigest", () => ({
  getCachedPerception: vi.fn(() => ({
    statureBand: "strong",
    moraleBand: "content",
    welfareBand: "safe",
    welfareRiskBand: "safe",
    depthBand: "competitive",
    rosterStrengthBand: "competitive",
    financeBand: "comfortable",
    koenkaiBand: "moderate",
    trainingBand: "balanced",
    recruitingBand: "neutral",
    rivalryBand: "neutral",
    mediaBand: "neutral",
  })),
}));

/**
 * T2-G2: StableWidget's career line — JSA standing + next milestone +
 * "Board confidence wavering" when successionRisk crosses 0.5.
 * Renders through StableWidget since CareerLine is component-internal.
 */
function worldWithCareer(opts: {
  playerCapital?: number;
  others?: Array<[string, number]>;
  tenure?: Partial<NonNullable<Oyakata["tenure"]>>;
  underperformanceBasho?: number;
}): WorldState {
  const world = makeMockWorld({ year: 2030, week: 5, playerHeyaId: "h-me" });
  const me = makeMockHeya("h-me", {
    politicalCapital: opts.playerCapital ?? 50,
    reputation: 50,
  });
  me.oyakataId = "o-me" as never;
  me.consecutiveUnderperformanceBasho = opts.underperformanceBasho ?? 0;
  world.heyas.set("h-me" as never, me);
  world.oyakata.set("o-me" as never, {
    id: "o-me",
    heyaId: "h-me",
    tenure: {
      startedYear: 2025,
      bashoServed: 12,
      championships: 0,
      sekitoriProduced: 0,
      insolvencyEvents: 0,
      majorScandals: 0,
      forcedMergers: 0,
      boardSeatsWon: 0,
      ...opts.tenure,
    },
  } as unknown as Oyakata);
  for (const [id, cap] of opts.others ?? []) {
    world.heyas.set(id as never, makeMockHeya(id, { politicalCapital: cap, reputation: 0 }));
  }
  return world;
}

function mockUseGame(world: WorldState | null) {
  vi.mocked(GameContext.useGame).mockReturnValue({
    state: { world },
    updateWorld: vi.fn(),
  } as any);
}

function renderWidget(world: WorldState) {
  mockUseGame(world);
  return render(
    <TooltipProvider>
      <StableWidget />
    </TooltipProvider>
  );
}

describe("StableWidget CareerLine", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("renders 'JSA Chairman' when the player's heya leads the election score", () => {
    const world = worldWithCareer({
      playerCapital: 99,
      others: [["h-weak", 10]],
    });
    const { getByText } = renderWidget(world);
    expect(getByText(/JSA Chairman/)).toBeTruthy();
  });

  it("renders 'JSA Board #N' when seated but not chair", () => {
    const world = worldWithCareer({
      playerCapital: 50,
      others: [["h-strong", 95]],
    });
    const { getByText } = renderWidget(world);
    expect(getByText(/JSA Board #2/)).toBeTruthy();
  });

  it("renders 'JSA Rank N' + next milestone when outside the board", () => {
    const world = worldWithCareer({
      playerCapital: 0,
      others: [
        ["n1", 90],
        ["n2", 80],
        ["n3", 70],
        ["n4", 60],
        ["n5", 55],
      ],
    });
    const { getByText } = renderWidget(world);
    expect(getByText(/JSA Rank 6/)).toBeTruthy();
    expect(getByText(/Next:/)).toBeTruthy();
  });

  it("shows 'Board confidence wavering' when a succession trigger is ≥ halfway", () => {
    const world = worldWithCareer({
      tenure: { insolvencyEvents: 2 }, // 2/3 ≥ 0.5
    });
    const { getByText } = renderWidget(world);
    expect(getByText(/Board confidence wavering/)).toBeTruthy();
  });

  it("hides the warning for a healthy tenure", () => {
    const world = worldWithCareer({});
    const { queryByText } = renderWidget(world);
    expect(queryByText(/Board confidence wavering/)).toBeNull();
  });
});
