import React from "react";
import { describe, it, expect, afterEach, vi } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";

vi.mock("@/components/layout/AppLayout", () => ({
  AppLayout: ({ children }: any) =>
    React.createElement("div", { "data-testid": "app-layout" }, children),
}));

vi.mock("@/components/recruitment/YouthAcademyPanel", () => ({
  YouthAcademyPanel: ({ onBuild }: any) =>
    React.createElement(
      "div",
      { "data-testid": "youth-academy-panel" },
      React.createElement(
        "button",
        { "data-testid": "build-youth-academy", onClick: onBuild },
        "Build"
      )
    ),
}));

const mockProjectYouthAcademy = vi.fn(() => ({
  level: 0,
  hasAcademy: false,
  prospectCapacity: 0,
  upgradeCost: 50000,
}));

vi.mock("@/presenters/projections/youthAcademyProjections", () => ({
  projectYouthAcademy: () => mockProjectYouthAcademy(),
}));

// Detail-section stubs — the panel (mocked above) owns all academy controls;
// the page must not render a second set of staff/invest/promote controls.
vi.mock("@/components/academy/index", () => ({
  AcademyIntakeCard: ({ prospect, onPromote }: any) =>
    React.createElement(
      "div",
      { "data-testid": "intake-card", "data-has-promote": String(!!onPromote) },
      prospect.id
    ),
  AcademyStaffList: () => React.createElement("div", { "data-testid": "academy-staff-list" }),
  AcademyInvestmentControl: () =>
    React.createElement("div", { "data-testid": "academy-invest-control" }),
}));

const mockUseGame = vi.fn();
vi.mock("@/state/game/useGame", () => ({
  useGame: () => mockUseGame(),
}));

const mockSendCommand = vi.fn();
vi.mock("@/state/stores/gameStore", () => ({
  useGameStore: () => mockSendCommand,
}));

import YouthAcademyPage from "@/pages/YouthAcademyPage";

describe("YouthAcademyPage", () => {
  afterEach(() => cleanup());

  it("renders no game loaded message when world is null", () => {
    mockUseGame.mockReturnValue({ state: { world: null } });
    render(<YouthAcademyPage />);
    expect(screen.getByText("No game loaded.")).toBeDefined();
  });

  it("renders youth academy page with panel", () => {
    mockUseGame.mockReturnValue({
      state: {
        world: {
          seed: "test",
          playerHeyaId: "player",
          heyas: new Map([
            ["player", { id: "player", name: "Player", economics: { cash: 100000 } }],
          ]),
        },
      },
    });
    render(<YouthAcademyPage />);
    expect(screen.getByTestId("youth-academy-page")).toBeDefined();
    expect(screen.getByTestId("youth-academy-panel")).toBeDefined();
  });

  it("renders build button when no academy exists", () => {
    mockUseGame.mockReturnValue({
      state: {
        world: {
          seed: "test",
          playerHeyaId: "player",
          heyas: new Map([
            ["player", { id: "player", name: "Player", economics: { cash: 100000 } }],
          ]),
        },
      },
    });
    render(<YouthAcademyPage />);
    expect(screen.getByTestId("build-youth-academy")).toBeDefined();
  });
});

describe("YouthAcademyPage — no duplicate academy controls", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  function worldWithAcademy() {
    mockProjectYouthAcademy.mockReturnValue({
      level: 1,
      hasAcademy: true,
      prospectCapacity: 4,
      upgradeCost: 50000,
      academy: {
        prospects: [{ id: "prospect-1" }],
        staff: [{ id: "st-1", role: "coach" }],
        maxStaff: 3,
        budget: 100000,
      },
    });
    return {
      seed: "test",
      playerHeyaId: "player",
      heyas: new Map([
        ["player", { id: "player", name: "Player", funds: 1000000, economics: { cash: 100000 } }],
      ]),
    };
  }

  it("does not render the duplicate staff/invest control cluster", () => {
    // V17-F19: the page rendered AcademyStaffList + AcademyInvestmentControl +
    // promote-enabled intake cards ON TOP of YouthAcademyPanel's own
    // StaffSection/InvestSection/ProspectsSection — two ungated control sets.
    mockUseGame.mockReturnValue({ state: { world: worldWithAcademy() } });
    render(<YouthAcademyPage />);

    // Prospect detail cards stay (they carry per-prospect info)…
    expect(screen.getAllByTestId("intake-card").length).toBe(1);
    // …but they must not expose a second promote path.
    expect(screen.getByTestId("intake-card").dataset.hasPromote).toBe("false");
    // …and the duplicate staff/invest controls are gone entirely.
    expect(screen.queryByTestId("academy-staff-list")).toBeNull();
    expect(screen.queryByTestId("academy-invest-control")).toBeNull();
  });
});
